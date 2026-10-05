const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class KurulumService {
    static getDashboard() {
        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✦";

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## ${spark} Kurulum Paneli\nBot ayarlarını ve sistem kanallarını yönetin.` },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 3, label: "Emoji Kur", custom_id: "kurulum_emojis" },
                            { type: 2, style: 1, label: "Log Kanalları Kur", custom_id: "kurulum_logs" },
                            { type: 2, style: 1, label: "Emoji Listesi", custom_id: "kurulum_list" },
                            { type: 2, style: 4, label: "Emoji Sil", custom_id: "kurulum_emojisil" }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 2, label: "Ayarları Yenile", custom_id: "kurulum_reload" }
                        ]
                    }
                ]
            }]
        };
    }
}

module.exports = KurulumService;
