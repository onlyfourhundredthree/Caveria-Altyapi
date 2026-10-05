const { MessageFlags } = require("discord.js");
const GuildBackup = require("../../Core/Database/GuildBackup");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

function formatDate(ts) {
    return `<t:${Math.floor(ts / 1000)}:f> (<t:${Math.floor(ts / 1000)}:R>)`;
}

class BackupService {
    static async getDashboard(guild) {
        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✦";
        const latest = await GuildBackup.findOne({ guildID: guild.id }).select("_id createdAt backupType roleCount channelCount emojiCount stickerCount").sort({ createdAt: -1 }).lean();

        let statText = "";
        if (latest) {
            statText = `> **Son Yedek:** ${formatDate(latest.createdAt)} (${latest.backupType})\n` +
                `> **Roller:** \`${latest.roleCount || 0}\` | **Kanallar:** \`${latest.channelCount || 0}\` | **Emojiler:** \`${latest.emojiCount || 0}\` | **Sticker:** \`${latest.stickerCount || 0}\``;
        } else {
            statText = "> *Henüz yedek alınmamış.*";
        }

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## ${spark} Yedekleme Sistemi\nSunucu yedeklerini yönetin.` },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: statText },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 3, label: "Yedek Oluştur", custom_id: "backup_create", emoji: { name: "📦" } },
                            { type: 2, style: 1, label: "Yedekleri Yönet", custom_id: "backup_list", emoji: { name: "📋" } },
                            { type: 2, style: 2, label: "Yenile", custom_id: "backup_refresh", emoji: { name: "🔄" } }
                        ]
                    }
                ]
            }]
        };
    }
}

module.exports = BackupService;
