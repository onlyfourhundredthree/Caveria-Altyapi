const MentionNotifications = require("../../Core/Database/MentionNotifications");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { PermissionsBitField } = require("discord.js");
const client = global.bot;

module.exports = async (message) => {
    try {
        if (!message || !message.id) return;

        const mentionData = await MentionNotifications.findOne({ messageID: message.id });
        if (!mentionData) return;

        if (mentionData.createdAt && Date.now() - new Date(mentionData.createdAt).getTime() > 86400000) return;

        if (mentionData.authorID === "1078973188718993418") return;

        const guild = client.guilds.cache.get(mentionData.guildID);
        const channel = guild?.channels.cache.get(mentionData.channelID);

        if (guild) {
            try {
                // Son 3 saniye içinde silinen mesaja ait log'a bak
                const fetchedLogs = await guild.fetchAuditLogs({
                    limit: 1,
                    type: 72 // AuditLogEvent.MessageDelete
                });
                const deletionLog = fetchedLogs.entries.first();

                if (deletionLog) {
                    const { executor, target } = deletionLog;
                    // Eğer silinen mesajın sahibi bizsek (target.id == message.author.id) ve silen bot ise bildirim atma
                    if (target.id === message.author.id && executor.bot) {
                        await MentionNotifications.deleteOne({ messageID: message.id });
                        return;
                    }
                }
            } catch (err) {
                // Yetki veya rate limit hatası, devam et
            }
        }

        const truncatedContent = mentionData.content.length > 500
            ? mentionData.content.substring(0, 500) + "..."
            : mentionData.content || "*(Mesaj içeriği yok)*";

        const msgTimestamp = mentionData.createdAt
            ? Math.floor(new Date(mentionData.createdAt).getTime() / 1000)
            : null;

        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "";
        const nokta = emojis.toji_nokta || "-";
        const iptal = emojis.toji_iptal || "";

        for (const userID of mentionData.mentionedUsers) {
            try {
                if (channel && !channel.permissionsFor(userID)?.has(PermissionsBitField.Flags.ViewChannel)) continue;

                const user = await client.users.fetch(userID);
                if (!user || user.bot) continue;

                const timestampText = msgTimestamp
                    ? `${nokta} **Mesaj Tarihi:** <t:${msgTimestamp}:f> (<t:${msgTimestamp}:R>)`
                    : `${nokta} **Mesaj Tarihi:** Bilinmiyor`;

                await user.send({
                    flags: [1 << 15],
                    components: [{
                        type: 17,
                        components: [
                            { type: 10, content: `## ${spark} Etiket Bildirimi\n> Bir mesajda etiketlendin ve o mesaj silindi.` },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 9,
                                components: [
                                    { type: 10, content: `${nokta} **Gönderen:** ${mentionData.authorTag}\n${nokta} **Kanal:** #${channel?.name || "bilinmeyen-kanal"}` }
                                ],
                                accessory: {
                                    type: 11,
                                    media: { url: mentionData.authorAvatar || "https://cdn.discordapp.com/embed/avatars/0.png" }
                                }
                            },
                            { type: 14, divider: true, spacing: 1 },
                            { type: 10, content: timestampText },
                            { type: 10, content: `${nokta} **Mesaj İçeriği:**\n${truncatedContent}` },
                            { type: 14, divider: true, spacing: 1 },
                            { type: 10, content: `> ${iptal} Bu mesaj silindiği için bu bildirimi alıyorsun.` }
                        ]
                    }]
                });
            } catch (dmError) {}
        }

        await MentionNotifications.deleteOne({ messageID: message.id });
    } catch (error) {
        console.error("[MentionDeleteNotifier] Bildirim gönderimi sırasında hata:", error);
    }
};
