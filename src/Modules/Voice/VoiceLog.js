const { AuditLogEvent, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Settings = require("../../../Settings.json");
const VoiceLogs = require("../../Core/Database/VoiceLogs");
const client = global.bot;


function sendV2Log(channel, title, subtitle, detailsMap, iconUrl = null) {
    let detailsText = "> ### " + (ConfigManager.get("Emojis.toji_hubsparkles") || "✨") + " **Detaylar**\n";
    for (const [key, val] of Object.entries(detailsMap)) {
        if (val !== undefined && val !== null && val !== "") {
            detailsText += `**${key}:** ${val}\n`;
        }
    }

    const v2Log = [
        {
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: iconUrl || client.user.displayAvatarURL() }
                    },
                    components: [
                        { type: 10, content: `> ## ${title}\n> -# ${subtitle}` }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: detailsText }
            ]
        }
    ];

    return channel.send({
        components: v2Log,
        flags: [MessageFlags.IsComponentsV2],
        allowedMentions: { parse: [] }
    }).catch(() => { });
}

module.exports = async (oldState, newState) => {
    if ((oldState.member && oldState.member.user.bot) || (newState.member && newState.member.user.bot)) return;
    if (newState.guild.id != Settings.Main.GuildID) return;

    const VoiceLogChannel = client.channels.cache.find(x => x.name == "voice-log");
    const MuteLog = client.channels.cache.find(x => x.name == "voice-log");

    const emojis = ConfigManager.get("Emojis") || {};
    const toji_nokta = emojis.toji_nokta || "•";

    const member = newState.member || oldState.member;
    if (!member || !member.user) return;
    const avatarUrl = member.user.displayAvatarURL({ dynamic: true });

    if (!oldState.channel && newState.channel) {
        const channel = newState.channel;
        await new VoiceLogs({ userID: member.id, newChannel: channel.id, type: "JOIN" }).save();

        if (!VoiceLogChannel) return;

        const Members = channel.members.map((x) => `${toji_nokta} <@${x.user.id}>`).splice(0, 20).join("\n");
        return sendV2Log(VoiceLogChannel, "Kanal Girişi", `${member} isimli kullanıcı bir ses kanalına katıldı.`, {
            "Kullanıcı": member.toString(),
            "Kanal": `<#${channel.id}> \`(${channel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`,
            "Odada Olan Üyeler": Members ? `\n${Members}` : "Yok"
        }, avatarUrl);
    }

    if (oldState.channel && !newState.channel) {
        const channel = oldState.channel;
        
        let disconnectAdmin = null;
        try {
            let Logs = await oldState.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberDisconnect });
            let entry = Logs.entries.first();
            if (entry && entry.target && entry.target.id === member.id && (Date.now() - entry.createdTimestamp < 5000)) {
                disconnectAdmin = entry.executor;
            }
        } catch(e) {}

        const logType = disconnectAdmin ? "DISCONNECT" : "LEAVE";
        await new VoiceLogs({ userID: member.id, adminID: disconnectAdmin?.id, oldChannel: channel.id, type: logType }).save();

        if (!VoiceLogChannel) return;

        const Members = channel.members.map((x) => `${toji_nokta} <@${x.user.id}>`).splice(0, 20).join("\n");
        
        const logTitle = disconnectAdmin ? "Sağ-Tık Bağlantı Kesildi" : "Kanal Çıkışı";
        const logSubtitle = disconnectAdmin 
            ? `${member} isimli kullanıcının bağlantısı yetkili tarafından kesildi.` 
            : `${member} isimli kullanıcı bir ses kanalından ayrıldı.`;

        const details = {
            "Kullanıcı": member.toString(),
            "Kanal": `<#${channel.id}> \`(${channel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`,
            "Çıkış Yaptığında Odada Olanlar": Members ? `\n${Members}` : "Yok"
        };
        if (disconnectAdmin) {
            details["Yetkili"] = `${disconnectAdmin} \`(${disconnectAdmin.id})\``;
        }

        return sendV2Log(VoiceLogChannel, logTitle, logSubtitle, details, avatarUrl);
    }

    if (oldState.channel && newState.channel && oldState.channel.id != newState.channel.id) {
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        let moveAdmin = null;
        try {
            let Logs = await newState.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberMove });
            let entry = Logs.entries.first();
            if (entry && entry.target && entry.target.id === member.id && (Date.now() - entry.createdTimestamp < 5000)) {
                moveAdmin = entry.executor;
            }
        } catch(e) {}

        await new VoiceLogs({ userID: member.id, adminID: moveAdmin?.id, oldChannel: oldChannel.id, newChannel: newChannel.id, type: "MOVE" }).save();

        if (!VoiceLogChannel) return;

        const Members = newChannel.members.map((x) => `${toji_nokta} <@${x.user.id}>`).splice(0, 20).join("\n");
        
        const details = {
            "Kullanıcı": member.toString(),
            "Eski Kanal": `<#${oldChannel.id}> \`(${oldChannel.name})\``,
            "Yeni Kanal": `<#${newChannel.id}> \`(${newChannel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`,
            "Giriş Yaptığında Odada Olanlar": Members ? `\n${Members}` : "Yok"
        };
        if (moveAdmin) {
            details["Taşıyan Yetkili"] = `${moveAdmin} \`(${moveAdmin.id})\``;
        }

        sendV2Log(VoiceLogChannel, "Kanal Değişimi", `${member} isimli kullanıcı bulunduğu ses kanalını değiştirdi.`, details, avatarUrl);
        return;
    }

    if (oldState.channel && oldState.selfMute && !newState.selfMute) {
        const channel = newState.channel;
        await new VoiceLogs({ userID: member.id, newChannel: channel.id, type: "UNMUTE" }).save();
        if (!MuteLog) return;
        return sendV2Log(MuteLog, "Mikrofon Açma", `${member} isimli kullanıcı kendi susturmasını kaldırdı.`, {
            "Kullanıcı": member.toString(),
            "Kanal": `<#${channel.id}> \`(${channel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
        }, avatarUrl);
    }

    if (oldState.channel && !oldState.selfMute && newState.selfMute) {
        const channel = newState.channel;
        await new VoiceLogs({ userID: member.id, newChannel: channel.id, type: "MUTE" }).save();
        if (!MuteLog) return;
        return sendV2Log(MuteLog, "Mikrofon Kapatma", `${member} isimli kullanıcı kendini susturdu.`, {
            "Kullanıcı": member.toString(),
            "Kanal": `<#${channel.id}> \`(${channel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
        }, avatarUrl);
    }

    if (oldState.channel && oldState.selfDeaf && !newState.selfDeaf) {
        const channel = newState.channel;
        await new VoiceLogs({ userID: member.id, newChannel: channel.id, type: "UNDEAF" }).save();
        if (!MuteLog) return;
        return sendV2Log(MuteLog, "Kulaklık Açma", `${member} isimli kullanıcı kendi sağırlaştırmasını kaldırdı.`, {
            "Kullanıcı": member.toString(),
            "Kanal": `<#${channel.id}> \`(${channel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
        }, avatarUrl);
    }

    if (oldState.channel && !oldState.selfDeaf && newState.selfDeaf) {
        const channel = newState.channel;
        await new VoiceLogs({ userID: member.id, newChannel: channel.id, type: "DEAF" }).save();
        if (!MuteLog) return;
        return sendV2Log(MuteLog, "Kulaklık Kapatma", `${member} isimli kullanıcı kendini sağırlaştırdı.`, {
            "Kullanıcı": member.toString(),
            "Kanal": `<#${channel.id}> \`(${channel.name})\``,
            "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
        }, avatarUrl);
    }

    if (oldState.serverMute != newState.serverMute || oldState.serverDeaf != newState.serverDeaf) {
        const channel = newState.channel || oldState.channel;
        let Logs = await newState.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate });
        let entry = Logs.entries.first();

        if (entry && entry.target && entry.target.id === newState.id) {
            let executorText = entry.executor ? `${entry.executor} \`(${entry.executor.id})\`` : "Bilinmiyor";
            let channelText = channel ? `<#${channel.id}> \`(${channel.name})\`` : "Bulunamadı";

            if (!oldState.serverMute && newState.serverMute) {
                await new VoiceLogs({ userID: member.id, adminID: entry?.executor?.id, newChannel: channel?.id, type: "SERVER-MUTE" }).save();
                if (MuteLog) {
                    sendV2Log(MuteLog, "Sağ-Tık Susturma", `${member} isimli kullanıcı yetkili tarafından susturuldu.`, {
                        "Kullanıcı": member.toString(),
                        "Yetkili": executorText,
                        "Kanal": channelText,
                        "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
                    }, avatarUrl);
                }
            }
            if (oldState.serverMute && !newState.serverMute) {
                await new VoiceLogs({ userID: member.id, adminID: entry?.executor?.id, newChannel: channel?.id, type: "SERVER-UNMUTE" }).save();
                if (MuteLog) {
                    sendV2Log(MuteLog, "Sağ-Tık Susturma Kaldırıldı", `${member} kullanıcısının susturulması kaldırıldı.`, {
                        "Kullanıcı": member.toString(),
                        "Yetkili": executorText,
                        "Kanal": channelText,
                        "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
                    }, avatarUrl);
                }
            }
            if (!oldState.serverDeaf && newState.serverDeaf) {
                await new VoiceLogs({ userID: member.id, adminID: entry?.executor?.id, newChannel: channel?.id, type: "SERVER-DEAF" }).save();
                if (MuteLog) {
                    sendV2Log(MuteLog, "Sağ-Tık Sağırlaştırma", `${member} isimli kullanıcı yetkili tarafından sağırlaştırıldı.`, {
                        "Kullanıcı": member.toString(),
                        "Yetkili": executorText,
                        "Kanal": channelText,
                        "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
                    }, avatarUrl);
                }
            }
            if (oldState.serverDeaf && !newState.serverDeaf) {
                await new VoiceLogs({ userID: member.id, adminID: entry?.executor?.id, newChannel: channel?.id, type: "SERVER-UNDEAF" }).save();
                if (MuteLog) {
                    sendV2Log(MuteLog, "Sağ-Tık Sağırlaştırma Kaldırıldı", `${member} kullanıcısının sağırlaştırması kaldırıldı.`, {
                        "Kullanıcı": member.toString(),
                        "Yetkili": executorText,
                        "Kanal": channelText,
                        "Tarih": `<t:${Math.floor(Date.now() / 1000)}:R>`
                    }, avatarUrl);
                }
            }
        }
    }
};
