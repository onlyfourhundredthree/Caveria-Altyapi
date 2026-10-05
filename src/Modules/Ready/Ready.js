const client = global.bot;
const { ActivityType } = require("discord.js");
const Settings = require("../../../Settings.json");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const BackupManager = require("../../Core/Handlers/BackupManager");
const moment = require("moment-timezone");

module.exports = async () => {
    console.log(`[BOT] Başarıyla giriş yapıldı: ${client.user.tag}`);

    client.user.setPresence({
        activities: [{ name: "www.403products.com", type: ActivityType.Streaming, url: "https://www.twitch.tv/403products" }],
        status: "dnd"
    });

    require("../../Core/Handlers/BoosterCheck")(client);
    require("../../Core/Handlers/RoleGuardCheck")(client);
    require("../../Core/Handlers/EventJob")(client);
    require("../../Core/Handlers/VoiceJob")(client);
    require("../../Modules/Ready/WordGameStartup")(client);
    require("../../Core/Handlers/OwnerRoleGuard").init(client);

    const PartnerSettings = require("../../Core/Database/PartnerSettings");
    async function clearBotMessagesOnce() {
        setTimeout(async () => {
            let iChannel = client.channels.cache.get(ConfigManager.get("Channels.Partner"));
            if (!iChannel || !iChannel.isTextBased()) return;

            try {
                const fetched = await iChannel.messages.fetch({ limit: 100 });
                const partnerSettings = await PartnerSettings.findOne({ guildID: Settings.Main.GuildID });
                const lastMsgId = partnerSettings ? partnerSettings.lastMessageId : null;

                const botMessages = fetched.filter(m => m.author.id === client.user.id && m.id !== lastMsgId && m.embeds.length > 0);

                if (botMessages.size > 0) {
                    await iChannel.bulkDelete(botMessages, true).catch(err => {
                        console.error((ConfigManager.get("Emojis.toji_iptal") || "✨") + " [Partner Cleanup] Mesaj silme hatası:", err);
                    });
                }
            } catch (err) {
                console.error((ConfigManager.get("Emojis.toji_iptal") || "✨") + " [Partner Cleanup] Hata:", err);
            }
        }, 5000);
    }
    clearBotMessagesOnce();

    const TaskManager = require("../../Core/Handlers/TaskManager");
    const VoiceManager = require("../../Core/Handlers/VoiceManager");
    const StreamManager = require("../../Core/Handlers/StreamManager");
    const VoiceJoined = require("../../Core/Database/Voice.JoinedAt");
    const StreamJoinedAt = require("../../Core/Database/StreamJoinedAt");
    const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");

    try {
        await TaskManager.cleanupExpiredTasks();

        const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
        await InviteClaimManager.checkExpirations();

        const guild = client.guilds.cache.get(Settings.Main.GuildID);
        if (guild) {
            const roles = await StaffRoleSystem.find({ guildID: guild.id, active: true });
            const staffIDs = roles.map(r => r.roleID);

            guild.members.cache.forEach(async (member) => {
                if (member.user.bot) return;
                const isStaff = staffIDs.length > 0 && staffIDs.some(roleID => member.roles.cache.has(roleID));

                if (isStaff) {
                    await TaskManager.assignRandomTasks(member);
                }
            });
        }
    } catch (e) { console.error("[Tasks/Claims] Initial Cleanup Error:", e.message); }

    setInterval(async () => {
        try {
            await TaskManager.cleanupExpiredTasks();

            const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
            await InviteClaimManager.checkExpirations();

            const guild = client.guilds.cache.get(Settings.Main.GuildID);
            if (guild) {
                const roles = await StaffRoleSystem.find({ guildID: guild.id, active: true });
                const staffIDs = roles.map(r => r.roleID);

                guild.members.cache.forEach(async (member) => {
                    if (member.user.bot) return;
                    const isStaff = staffIDs.length > 0 && staffIDs.some(roleID => member.roles.cache.has(roleID));

                    if (isStaff) {
                        await TaskManager.assignRandomTasks(member);
                    }
                });
            }
        } catch (e) { console.error("[Tasks/Claims] Periodic Cycle Error:", e.message); }
    }, 30 * 60000);


    try {
        const allSessions = await VoiceJoined.find({});
        for (const session of allSessions) {
            const guild = client.guilds.cache.get(Settings.Main.GuildID);
            const member = guild?.members.cache.get(session.userID);

            const diff = Date.now() - session.date;
            if (diff > 0) {
                const saveTime = Math.min(diff, 60 * 60 * 1000);
                await VoiceManager.saveVoiceData(member, member?.voice.channel, saveTime);
            }

            if (!member || !member.voice.channel) {
                await VoiceJoined.deleteOne({ userID: session.userID }).catch(() => { });
            } else {
                await VoiceJoined.updateOne({ _id: session._id }, { $set: { date: Date.now() } }).catch(() => { });
            }
        }

        client.guilds.cache.forEach(guild => {
            guild.channels.cache.filter(c => c.isVoiceBased()).forEach(channel => {
                channel.members.forEach(async (member) => {
                    if (!member.user.bot) {
                        await VoiceJoined.findOneAndUpdate(
                            { userID: member.id },
                            { $setOnInsert: { date: Date.now() } },
                            { upsert: true }
                        );
                    }
                });
            });
        });
    } catch (e) {
        console.error("[VOICE] Senkronizasyon hatası:", e);
    }

    try {
        const allStreamSessions = await StreamJoinedAt.find({});
        for (const session of allStreamSessions) {
            const guild = client.guilds.cache.get(Settings.Main.GuildID);
            const member = guild?.members.cache.get(session.userID);

            const diff = Date.now() - session.date;
            if (diff > 0) {
                const saveTime = Math.min(diff, 60 * 60 * 1000);
                await StreamManager.saveStreamData(member, member?.voice.channel, saveTime);
            }

            if (!member || !member.voice.channel || (!member.voice.streaming && !member.voice.selfVideo)) {
                await StreamJoinedAt.deleteOne({ userID: session.userID }).catch(() => { });
            } else {
                await StreamJoinedAt.updateOne({ _id: session._id }, { $set: { date: Date.now() } }).catch(() => { });
            }
        }

        client.guilds.cache.forEach(guild => {
            guild.channels.cache.filter(c => c.isVoiceBased()).forEach(channel => {
                channel.members.forEach(async (member) => {
                    if (!member.user.bot && (member.voice.streaming || member.voice.selfVideo)) {
                        await StreamJoinedAt.findOneAndUpdate(
                            { userID: member.id },
                            { $setOnInsert: { date: Date.now() } },
                            { upsert: true }
                        );
                    }
                });
            });
        });
    } catch (e) {
        console.error("[STREAM] Senkronizasyon hatası:", e);
    }

    setTimeout(() => {
        const voiceChannelId = ConfigManager.get("Channels.BotVoiceChannel");
        if (voiceChannelId) {
            let channel = client.channels.cache.get(voiceChannelId);

            if (!channel) {
                const guild = client.guilds.cache.get(Settings.Main.GuildID);
                if (guild) channel = guild.channels.cache.get(voiceChannelId);
            }

            if (channel) {
                const MusicManager = require("../../Core/Handlers/MusicManager");
                try {
                    const streamUrl = "https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio";
                    const radioName = "PowerTürk (Türkçe Pop)";
                    MusicManager.playRadio(channel, streamUrl, radioName);
                } catch (e) {
                    console.error("[VOICE] AFK Kanalına katılamadı:", e);
                }
            }
        }

        try {
            const { PrivateRoomManagement } = require("../../Services/Systems/PrivateRooms/Management");
            client.guilds.cache.forEach(guild => {
                PrivateRoomManagement.cleanupOrphanedRooms(guild).catch(err => console.error(`Cleanup error for guild ${guild.id}:`, err));
            });
        } catch (e) { }
    }, 1500);

    const ActiveMarketRole = require("../../Core/Database/ActiveMarketRole");
    setInterval(async () => {
        try {
            const activeRoles = await ActiveMarketRole.find({});
            for (const doc of activeRoles) {
                const guild = client.guilds.cache.get(doc.guildID);
                if (!guild) continue;

                const member = await guild.members.fetch(doc.userID).catch(() => null);
                if (!member) continue;

                if (doc.expireAt && doc.expireAt < Date.now()) {
                    if (member.roles.cache.has(doc.roleID)) {
                        await member.roles.remove(doc.roleID).catch(() => {});
                    }
                    await ActiveMarketRole.deleteOne({ _id: doc._id });
                } else {
                    if (!member.roles.cache.has(doc.roleID)) {
                        await member.roles.add(doc.roleID).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error("[MARKET ROLE] Kontrol hatası:", e.message);
        }
    }, 5 * 60000);

    const guild = client.guilds.cache.get(Settings.Main.GuildID);
    if (guild) {
        const cron = require("node-cron");
        const GuildBackup = require("../../Core/Database/GuildBackup");
        
        // Her gün 12:00 ve 00:00'da çalışır
        cron.schedule("0 0,12 * * *", async () => {
            console.log("[BACKUP] Zamanlanmış yedekleme başlatılıyor...");
            try {
                // 30 günlük silme işlemi BackupManager.js içerisinden yapılıyor
                await BackupManager.createBackup(guild, "auto");
                console.log("[BACKUP] Zamanlanmış yedekleme başarıyla tamamlandı.");
            } catch (e) {
                console.error("[BACKUP] Yedekleme hatası:", e.message);
            }
        }, {
            timezone: "Europe/Istanbul"
        });
    }
};
