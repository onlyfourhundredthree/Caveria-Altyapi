const moment = require("moment-timezone");
const StatHistory = require("../Database/StatHistory");
const ConfigManager = require("./ConfigManager");
const Settings = require("../../../Settings.json");
const SystemSettings = require("../Database/SystemSettings");
const { MessageFlags } = require("discord.js");

module.exports = (client) => {
    const check = async () => {
        const now = moment().tz("Europe/Istanbul");

        if (now.day() === 1) {
            const weekKey = `WeeklyReward_${now.isoWeekYear()}_${now.isoWeek()}`;
            const lock = await SystemSettings.findOneAndUpdate(
                { key: weekKey },
                { $setOnInsert: { value: true, updatedAt: new Date() } },
                { upsert: true, new: false }
            );

            if (!lock) {
                console.log(`[WEEKLY-REWARD] Running for week: ${weekKey}`);
                await runWeeklyReward(client);
            }
        }
    };

    setTimeout(() => check(), 15000);
    setInterval(check, 15 * 60 * 1000);
};

async function runWeeklyReward(client, isManual = false, xVoice = null, xMessage = null) {
    const guild = client.guilds.cache.get(Settings.Main.GuildID);
    if (!guild) return;

    const config = ConfigManager.get("WeeklyReward");
    if (!config) return;

    const voiceWinnersCount = xVoice || config.VoiceWinners || 3;
    const messageWinnersCount = xMessage || config.MessageWinners || 3;
    const streamWinnersCount = config.StreamerWinners || 3;
    const voiceRoleID = config.VoiceRole;
    const messageRoleID = config.MessageRole;
    const streamRoleID = config.StreamerRole;
    const logChannelID = config.LogChannel || ConfigManager.get("Channels.Chat");

    const sevenDaysAgo = moment().tz("Europe/Istanbul").subtract(7, "days").startOf("day");
    const today = moment().tz("Europe/Istanbul").startOf("day");

    const stats = await StatHistory.find({
        guildID: guild.id,
        date: { $gte: sevenDaysAgo.format("YYYY-MM-DD"), $lt: today.format("YYYY-MM-DD") }
    });

    const channelsConfig = ConfigManager.get("Channels");
    const chatChannel = channelsConfig?.Chat;
    const publicVoices = Array.isArray(channelsConfig?.PublicVoices) ? channelsConfig.PublicVoices : [];

    const userStats = {}; 
    const excludedTokens = ["1174171687915368521", "1294350192253861940", "1294346993300144152", "1294353603582099572", "1294345192341639372"];

    stats.forEach(s => {
        if (excludedTokens.includes(s.userID)) return;
        if (!userStats[s.userID]) userStats[s.userID] = { voice: 0, message: 0, stream: 0 };

        if (s.voice?.channels && publicVoices.length > 0) {
            publicVoices.forEach(id => {
                userStats[s.userID].voice += (s.voice.channels.get ? s.voice.channels.get(id) : s.voice.channels[id]) || 0;
            });
        }

        if (s.message?.channels && chatChannel) {
            userStats[s.userID].message += (s.message.channels.get ? s.message.channels.get(chatChannel) : s.message.channels[chatChannel]) || 0;
        }

        if (s.streamer?.channels && publicVoices.length > 0) {
            publicVoices.forEach(id => {
                userStats[s.userID].stream += (s.streamer.channels.get ? s.streamer.channels.get(id) : s.streamer.channels[id]) || 0;
            });
        }
    });

    const VoiceJoined = require("../Database/Voice.JoinedAt");
    const StreamJoinedAt = require("../Database/StreamJoinedAt");
    const nowTimestamp = Date.now();

    if (publicVoices.length > 0) {
        const liveVoices = await VoiceJoined.find({});
        for (const session of liveVoices) {
            if (excludedTokens.includes(session.userID)) continue;
            const mem = guild.members.cache.get(session.userID);
            if (mem && mem.voice.channelId && publicVoices.includes(mem.voice.channelId)) {
                if (!userStats[session.userID]) userStats[session.userID] = { voice: 0, message: 0, stream: 0 };
                userStats[session.userID].voice += Math.max(0, nowTimestamp - session.date);
            }
        }
        
        const liveStreams = await StreamJoinedAt.find({});
        for (const session of liveStreams) {
            if (excludedTokens.includes(session.userID)) continue;
            const mem = guild.members.cache.get(session.userID);
            if (mem && mem.voice.channelId && publicVoices.includes(mem.voice.channelId) && (mem.voice.streaming || mem.voice.selfVideo)) {
                if (!userStats[session.userID]) userStats[session.userID] = { voice: 0, message: 0, stream: 0 };
                userStats[session.userID].stream += Math.max(0, nowTimestamp - session.date);
            }
        }
    }

    const statUserIds = Object.keys(userStats);
    if (statUserIds.length > 0) {
        await guild.members.fetch({ user: statUserIds }).catch(() => new Map());
    }

    const voiceTop = Object.entries(userStats)
        .map(([userID, data]) => ({ userID, total: data.voice }))
        .filter(u => guild.members.cache.has(u.userID) && u.total >= (config.MinVoiceTime || 0))
        .sort((a, b) => b.total - a.total)
        .slice(0, voiceWinnersCount);

    const messageTop = Object.entries(userStats)
        .map(([userID, data]) => ({ userID, total: data.message }))
        .filter(u => guild.members.cache.has(u.userID) && u.total >= (config.MinMessageCount || 0))
        .sort((a, b) => b.total - a.total)
        .slice(0, messageWinnersCount);

    const streamTop = Object.entries(userStats)
        .map(([userID, data]) => ({ userID, total: data.stream }))
        .filter(u => guild.members.cache.has(u.userID) && u.total >= (config.MinStreamTime || 0))
        .sort((a, b) => b.total - a.total)
        .slice(0, streamWinnersCount);

    const voiceRole = guild.roles.cache.get(voiceRoleID);
    const messageRole = guild.roles.cache.get(messageRoleID);

    if (voiceRole) {
        const membersWithVoiceRole = guild.members.cache.filter(m => m.roles.cache.has(voiceRoleID));
        for (const [id, member] of membersWithVoiceRole) {
            await member.roles.remove(voiceRole).catch(() => { });
        }
    }

    if (messageRole) {
        const membersWithMessageRole = guild.members.cache.filter(m => m.roles.cache.has(messageRoleID));
        for (const [id, member] of membersWithMessageRole) {
            await member.roles.remove(messageRole).catch(() => { });
        }
    }

    const streamRole = guild.roles.cache.get(streamRoleID);
    if (streamRole) {
        const membersWithStreamRole = guild.members.cache.filter(m => m.roles.cache.has(streamRoleID));
        for (const [id, member] of membersWithStreamRole) {
            await member.roles.remove(streamRole).catch(() => { });
        }
    }

    for (const win of voiceTop) {
        const member = guild.members.cache.get(win.userID);
        if (member && voiceRole) await member.roles.add(voiceRole).catch(() => { });
    }

    for (const win of messageTop) {
        const member = guild.members.cache.get(win.userID);
        if (member && messageRole) await member.roles.add(messageRole).catch(() => { });
    }

    for (const win of streamTop) {
        const member = guild.members.cache.get(win.userID);
        if (member && streamRole) await member.roles.add(streamRole).catch(() => { });
    }

    const logChannel = guild.channels.cache.get(logChannelID);
    if (logChannel) {
        const components = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: guild.iconURL() } },
                        components: [
                            {
                                type: 10,
                                content: `## Haftalık Aktiflik Ödülleri\n> Geçtiğimiz haftanın en aktif kullanıcıları belirlendi ve ödülleri teslim edildi!`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `### Ses Birincileri\n${voiceTop.length > 0 ? voiceTop.map((u, i) => `${i + 1}. <@${u.userID}> - \`${(u.total / 3600000).toFixed(1)} saat\``).join("\n") : "Bu hafta yeterli aktiflik sağlanamadı."}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `### Mesaj Birincileri\n${messageTop.length > 0 ? messageTop.map((u, i) => `${i + 1}. <@${u.userID}> - \`${u.total} mesaj\``).join("\n") : "Bu hafta yeterli aktiflik sağlanamadı."}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `### Yayın Birincileri\n${streamTop.length > 0 ? streamTop.map((u, i) => `${i + 1}. <@${u.userID}> - \`${(u.total / 3600000).toFixed(1)} saat\``).join("\n") : "Bu hafta yeterli aktiflik sağlanamadı."}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `-# Ödül kazanan tüm kullanıcılarımızı tebrik eder, aktifliklerinin devamını dileriz!`
                    }
                ]
            }
        ];

        await logChannel.send({
            flags: [MessageFlags.IsComponentsV2],
            components
        });
    }

    return { voiceTop, messageTop, streamTop };
}

module.exports.runWeeklyReward = runWeeklyReward;
