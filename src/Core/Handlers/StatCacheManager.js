const fs = require("fs");
const path = require("path");
const StatHistory = require("../Database/StatHistory");
const Economy = require("../Database/Economy");
const GiveawayStats = require("../Database/GiveawayStats");
const ConfigManager = require("./ConfigManager");
const LevelUtils = require("../../Services/Stats/LevelUtils");
const moment = require("moment-timezone");

const BACKUP_FILE = path.join(__dirname, "../../crash_backup.json");
const SYNC_INTERVAL = 30 * 1000; // 30 seconds

class StatCacheManager {
    constructor() {
        this.messageCache = new Map(); // key: guildID_userID, value: { channels: { channelID: count }, total: count, coin: float, giveaway: { gwId: count } }
        this.voiceCache = new Map(); // If needed for voice, key: guildID_userID, value: { ms: Number, channels: { channelID: ms } }
        
        this.isSyncing = false;
        
        // Start the periodic sync
        setInterval(() => this.syncToDatabase(), SYNC_INTERVAL);
    }

    /**
     * Mesaj statlarını önbelleğe ekler.
     */
    addMessage(guildID, userID, channelID, giveawayIDs = [], coinAmount = 0.1) {
        const key = `${guildID}_${userID}`;
        let data = this.messageCache.get(key);

        if (!data) {
            data = {
                guildID,
                userID,
                total: 0,
                channels: {},
                coin: 0,
                giveaway: {}
            };
        }

                data.total += 1;
        data.channels[channelID] = (data.channels[channelID] || 0) + 1;
        data.coin += coinAmount;

        for (const gwId of giveawayIDs) {
            data.giveaway[gwId] = (data.giveaway[gwId] || 0) + 1;
        }

        this.messageCache.set(key, data);
    }

    /**
     * 30 Saniyede bir bellekteki verileri bulk (toplu) olarak MongoDB'ye yazar.
     */
    async syncToDatabase() {
        if (this.isSyncing) return;
        if (this.messageCache.size === 0 && this.voiceCache.size === 0) return;

        this.isSyncing = true;
        const todayDate = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");

        // Verileri bir kopyaya alıp, asıl Map'leri temizliyoruz. Böylece yeni gelenler kilitlenmez.
        const currentMessages = new Map(this.messageCache);
        this.messageCache.clear();

        try {
            // Bulk array'ler
            const statBulk = [];
            const economyBulk = [];
            const giveawayBulk = [];

            const userLevelChecks = []; // Sonradan level atladı mı diye kontrol edilecek kullanıcılar

            for (const [key, data] of currentMessages) {
                const { guildID, userID, total, channels, coin, giveaway } = data;

                // 1. StatHistory Bulk İşlemi
                const incQuery = { "message.total": total };
                for (const [chID, count] of Object.entries(channels)) {
                    incQuery[`message.channels.${chID}`] = count;
                }

                statBulk.push({
                    updateOne: {
                        filter: { guildID, userID, date: todayDate },
                        update: { $inc: incQuery },
                        upsert: true
                    }
                });

                // 2. Economy Bulk İşlemi
                if (coin > 0) {
                    economyBulk.push({
                        updateOne: {
                            filter: { guildID, userID },
                            update: { $inc: { coin: coin } },
                            upsert: true
                        }
                    });
                }

                // 3. Giveaway Bulk İşlemi
                for (const [gwId, count] of Object.entries(giveaway)) {
                    giveawayBulk.push({
                        updateOne: {
                            filter: { giveawayId: gwId, userId: userID },
                            update: { $inc: { messageCount: count } },
                            upsert: true
                        }
                    });
                }

                // Level hesaplaması için array'e at
                userLevelChecks.push({ guildID, userID, addedXP: total });
            }

            // DB'ye toplu yazım işlemleri (Paralel)
            const promises = [];
            if (statBulk.length > 0) promises.push(StatHistory.bulkWrite(statBulk));
            if (economyBulk.length > 0) promises.push(Economy.bulkWrite(economyBulk));
            if (giveawayBulk.length > 0) promises.push(GiveawayStats.bulkWrite(giveawayBulk));

            await Promise.all(promises);

            // Yazım tamamlandıktan sonra seviye atlama kontrollerini yapalım
            await this.checkLevelUps(userLevelChecks);

        } catch (error) {
            console.error("[StatCacheManager] Veritabanı senkronizasyonunda hata:", error);
            // Hata olursa verileri geri Map'e eklemeyi deneyebiliriz ama şimdilik logluyoruz.
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Toplu kayıt işleminden sonra kullanıcıların mesaj seviyelerini kontrol eder.
     */
    async checkLevelUps(userList) {
        if (!userList.length) return;
        const guildData = {};

        // Kullanıcıları sunuculara göre grupla
        for (const u of userList) {
            if (!guildData[u.guildID]) guildData[u.guildID] = [];
            guildData[u.guildID].push(u);
        }

        for (const guildID in guildData) {
            const guild = global.bot?.guilds.cache.get(guildID);
            if (!guild) continue;

            const users = guildData[guildID];
            const userIDs = users.map(u => u.userID);

            // O sunucudaki o kullanıcıların TOPLAM mesaj xp'lerini çekiyoruz.
            const stats = await StatHistory.aggregate([
                { $match: { guildID, userID: { $in: userIDs } } },
                { $group: { _id: "$userID", total: { $sum: "$message.total" } } }
            ]);

            const messageRanks = ConfigManager.get("Roles.MessageRanks") || [];
            const levelLogChannelId = ConfigManager.get("Channels.MessageLevelLog");
            const levelLogChannel = guild.channels.cache.get(levelLogChannelId);

            for (const userStat of stats) {
                const uID = userStat._id;
                const currentXP = userStat.total || 0;
                // Eklenen xp'yi çıkarıp bir önceki halini buluyoruz (seviye atladı mı diye bakmak için)
                const addedXP = users.find(x => x.userID === uID)?.addedXP || 0;
                const previousXP = Math.max(0, currentXP - addedXP);

                const currentLevel = LevelUtils.calculateMessageLevel(currentXP);
                const previousLevel = LevelUtils.calculateMessageLevel(previousXP);

                if (currentLevel > previousLevel) {
                    let member = guild.members.cache.get(uID);
                    if (!member) {
                        member = await guild.members.fetch(uID).catch(() => null);
                    }
                    if (member) {
                        let rewardRoleName = null;
                        let targetRank = null;

                        // Yeni rolleri ver
                        if (messageRanks.length > 0) {
                            targetRank = messageRanks
                                .filter(rank => currentLevel >= rank.Level)
                                .sort((a, b) => b.Level - a.Level)[0];

                            if (targetRank && !member.roles.cache.has(targetRank.Role)) {
                                await member.roles.add(targetRank.Role).catch(() => {});
                                const roleObj = guild.roles.cache.get(targetRank.Role);
                                if (roleObj) rewardRoleName = roleObj.name;

                                for (const rank of messageRanks) {
                                    if (rank.Role !== targetRank.Role && member.roles.cache.has(rank.Role)) {
                                        await member.roles.remove(rank.Role).catch(() => {});
                                    }
                                }
                            }
                        }

                        // Seviye Atlama Coin Ödülü
                        const levelCoinRate = ConfigManager.get("Economy.LevelCoin") ?? 100;
                        const coinBonus = currentLevel * levelCoinRate;
                        const Economy = require("../Database/Economy");
                        await Economy.updateOne({ guildID: guild.id, userID: uID }, { $inc: { coin: coinBonus } }, { upsert: true }).catch(() => {});

                        // Görsel Seviye Kartı ve Duyuru Mesajı
                        if (levelLogChannel) {
                            const { AttachmentBuilder } = require("discord.js");
                            const { renderLevelUpCard } = require("../../Utils/LevelUpCanvas");

                            try {
                                const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
                                const cardBuffer = await renderLevelUpCard({
                                    username: member.user.username,
                                    avatarUrl,
                                    oldLevel: previousLevel,
                                    newLevel: currentLevel,
                                    type: "message",
                                    rewardRoleName,
                                    coinReward: coinBonus
                                });

                                const files = [new AttachmentBuilder(cardBuffer, { name: "levelup.png" })];

                                levelLogChannel.send({ 
                                    content: `${member.toString()}`,
                                    files,
                                    allowedMentions: { users: [member.id], roles: [] }
                                }).catch(() => {});
                            } catch (e) {
                                console.error("[LevelUp] Canvas send error:", e);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Crash veya manuel kapanma durumunda bellekte kalan veriyi senkron olarak diske kaydeder. (Zaman kaybı sıfır)
     */
    createBackupSync() {
        if (this.messageCache.size === 0 && this.voiceCache.size === 0) return;
        
        try {
            const backupData = {
                messageCache: Array.from(this.messageCache.entries()),
                voiceCache: Array.from(this.voiceCache.entries()),
                timestamp: Date.now()
            };
            fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData));
            console.log(`[StatCacheManager] Crash yedeği alındı (${this.messageCache.size} mesaj, ${this.voiceCache.size} ses kaydı) -> ${BACKUP_FILE}`);
        } catch (err) {
            console.error("[StatCacheManager] Yedek alınamadı:", err);
        }
    }

    /**
     * Bot başlatıldığında önceki yedekten verileri kurtarır.
     */
    restoreBackup() {
        if (fs.existsSync(BACKUP_FILE)) {
            try {
                const data = fs.readFileSync(BACKUP_FILE, "utf-8");
                const backup = JSON.parse(data);
                
                // Mesajları geri yükle
                if (backup.messageCache) {
                    for (const [key, value] of backup.messageCache) {
                        const existing = this.messageCache.get(key);
                        if (existing) {
                            // Map'te zaten veri varsa üstüne ekle
                            existing.total += value.total;
                            existing.coin += value.coin;
                            for (const chID in value.channels) {
                                existing.channels[chID] = (existing.channels[chID] || 0) + value.channels[chID];
                            }
                            for (const gwID in value.giveaway) {
                                existing.giveaway[gwID] = (existing.giveaway[gwID] || 0) + value.giveaway[gwID];
                            }
                        } else {
                            this.messageCache.set(key, value);
                        }
                    }
                }

                console.log("[StatCacheManager] Önceki kapanıştan kalan veriler başarıyla kurtarıldı ve sıraya eklendi!");
                
                // Dosyayı sil ki tekrar tekrar okumasın
                fs.unlinkSync(BACKUP_FILE);
                
                // Hemen senkronize et
                this.syncToDatabase();
            } catch (err) {
                console.error("[StatCacheManager] Yedek yüklenirken hata oluştu:", err);
            }
        }
    }
}

module.exports = new StatCacheManager();
