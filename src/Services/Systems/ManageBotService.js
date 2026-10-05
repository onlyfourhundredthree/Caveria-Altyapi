const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class ManageBotService {
    static async getDashboard(client) {
        const emojis = ConfigManager.get("Emojis") || {};
        const toji_onay = emojis.toji_onay || "✨";

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [
                {
                    type: 17,
                    components: [
                        { type: 10, content: `## ${toji_onay} Bot Ayar Paneli\n**Bot:** ${client.user} (\`${client.user.tag}\`)\nAşağıdaki butonları kullanarak botun avatarını, ismini, bannerını değiştirebilir veya botu yeniden başlatabilirsiniz.` },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 1,
                            components: [
                                { type: 2, style: 1, label: "Profil Fotoğrafını Değiştir", custom_id: "botupdateavatar" },
                                { type: 2, style: 1, label: "İsmini Değiştir", custom_id: "botupdatename" },
                                { type: 2, style: 2, label: "Banner Değiştir", custom_id: "botupdatebanner" },
                                { type: 2, style: 4, label: "Yeniden Başlat", custom_id: "botrestart" }
                            ]
                        }
                    ]
                }
            ]
        };
    }
}

module.exports = ManageBotService;
