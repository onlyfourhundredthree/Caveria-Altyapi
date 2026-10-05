const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const LevelUtils = require("../../../Services/Stats/LevelUtils");
const StatHistory = require("../../../Core/Database/StatHistory");
const Economy = require("../../../Core/Database/Economy");

module.exports = {
    conf: {
        usages: ["levelcoinayarla", "levelcoin-ayarla", "levelcoinsifirla", "levelcoin-sifirla"],
        description: "Kullanıcıların geçmiş seviye coinlerini sıfırlar ve mevcut seviyelerine (.setup / .ecoayar ayarına) göre coinlerini eşitler.",
        category: "Owners",
        usage: ".levelcoinayarla [@kullanici / hepsi]",
        owner: true
    },

    run: async (client, message, args) => {
        const guild = message.guild;
        if (!guild) return;

        const levelCoinRate = ConfigManager.get("Economy.LevelCoin") ?? 100;
        let targetMember = message.mentions.members.first() || (args[0] && args[0] !== "hepsi" && args[0] !== "all" ? guild.members.cache.get(args[0]) : null);

        // Eğer belirli bir kullanıcı hedeflendiyse:
        if (targetMember) {
            const stats = await StatHistory.aggregate([
                { $match: { guildID: guild.id, userID: targetMember.id } },
                { $group: { _id: "$userID", msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
            ]);

            const msgXP = stats[0] ? stats[0].msgTotal : 0;
            const voiceXP = stats[0] ? stats[0].voiceTotal : 0;

            const msgLevel = LevelUtils.calculateMessageLevel(msgXP);
            const voiceLevel = LevelUtils.calculateVoiceLevel(voiceXP);
            const totalLevel = msgLevel + voiceLevel;

            const calculatedCoin = totalLevel * levelCoinRate;

            await Economy.findOneAndUpdate(
                { guildID: guild.id, userID: targetMember.id },
                { $set: { coin: calculatedCoin } },
                { upsert: true }
            );

            return message.reply({
                content: `${ConfigManager.get("Emojis.toji_onay") || "✅"} ${targetMember.toString()} kullanıcısının seviye coinleri sıfırlandı ve mevcut seviyesine göre yeniden tanımlandı!\n` +
                         `> Mesaj Seviyesi: **${msgLevel}** | Ses Seviyesi: **${voiceLevel}** (Toplam: **${totalLevel}**)\n` +
                         `> Tanımlanan Coin: **${calculatedCoin}** *(Seviye Başı: ${levelCoinRate} Coin)*\n\n` +
                         `-# Seviye başı ödül oranını değiştirmek için \`.setup set Economy.LevelCoin [Miktar]\` veya \`.ecoayar\` panelini kullanabilirsiniz.`
            });
        }

        // Tüm kullanıcılar için senkronizasyon (Varsayılan veya 'hepsi' / 'all' denmişse)
        const processMsg = await message.reply({ content: `⏳ Sunucudaki tüm kullanıcıların seviye coinleri hesaplanıyor ve mevcut seviyelerine göre eşitleniyor, lütfen bekleyin...` });

        try {
            const allStats = await StatHistory.aggregate([
                { $match: { guildID: guild.id } },
                { $group: { _id: "$userID", msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
            ]);

            if (!allStats || allStats.length === 0) {
                return processMsg.edit({ content: `${ConfigManager.get("Emojis.toji_iptal") || "❌"} Senkronize edilecek seviye kaydı bulunamadı.` });
            }

            const bulkOps = [];
            let updatedCount = 0;

            for (const stat of allStats) {
                const uID = stat._id;
                if (!uID) continue;

                const msgLevel = LevelUtils.calculateMessageLevel(stat.msgTotal || 0);
                const voiceLevel = LevelUtils.calculateVoiceLevel(stat.voiceTotal || 0);
                const totalLevel = msgLevel + voiceLevel;

                const targetCoin = totalLevel * levelCoinRate;

                bulkOps.push({
                    updateOne: {
                        filter: { guildID: guild.id, userID: uID },
                        update: { $set: { coin: targetCoin } },
                        upsert: true
                    }
                });
                updatedCount++;
            }

            if (bulkOps.length > 0) {
                await Economy.bulkWrite(bulkOps);
            }

            return processMsg.edit({
                content: `${ConfigManager.get("Emojis.toji_onay") || "✅"} **${updatedCount}** kullanıcının geçmiş seviye coinleri sıfırlandı ve mevcut seviyelerine göre eşitlendi!\n` +
                         `> Seviye Başı Ödül Oranı: **${levelCoinRate} Coin**\n` +
                         `> Uygulanan Sunucu: **${guild.name}**\n\n` +
                         `-# Seviye başı ödül oranını değiştirmek için \`.setup set Economy.LevelCoin [Miktar]\` veya \`.ecoayar\` panelini kullanabilirsiniz.`
            });

        } catch (error) {
            console.error("[LevelCoinAyarla] Hata:", error);
            return processMsg.edit({ content: `${ConfigManager.get("Emojis.toji_iptal") || "❌"} İşlem sırasında bir hata oluştu: ${error.message}` });
        }
    }
};
