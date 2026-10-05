const ConfigManager = require("../Core/Handlers/ConfigManager");

class TagBanService {
    static async getPayload(client) {
        const botAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        
        const enabled = ConfigManager.get("TagBan.Enabled");
        const action = ConfigManager.get("TagBan.Action") === "ban" ? "Sunucudan Yasakla" : "Cezalı Rolü Ver";
        
        const roleId = ConfigManager.get("TagBan.BannedTagRole");
        const channelId = ConfigManager.get("TagBan.LogChannel");
        
        const emojis = ConfigManager.get("Emojis") || {};
        const onay = emojis.toji_onay || "✅";
        const iptal = emojis.toji_iptal || "✖️";
        const info = emojis.toji_info || "ℹ️";
        const star = emojis.toji_sparkly || "✨";
        const nokta = emojis.toji_nokta || "•";
        
        const container = {
            type: 17,
            spoiler: false,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: botAvatar }
                    },
                    components: [
                        {
                            type: 10,
                            content: `> ## ${star} Yasaklı Tag Yönetim Paneli\n> -# **Bu sistem üzerinden yasaklı sunucu taglarını yönetebilirsiniz.**`
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `### ${info} Mevcut Durum\n**Sistem Durumu:** ${enabled ? `${onay} AÇIK` : `${iptal} KAPALI`}\n**Uygulanacak İşlem:** \`${action}\`\n\n### ${star} Ayarlanan Roller ve Kanallar\n**Cezalı Rolü:** ${roleId ? `<@&${roleId}>` : "\`Seçilmedi\`"}\n**Log Kanalı:** ${channelId ? `<#${channelId}>` : "\`Seçilmedi\`"}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 9,
                    components: [
                        {
                            type: 10,
                            content: `**${nokta} Sistemi Aç / Kapat:**\nYasaklı tag sistemini aktif veya pasif konuma getirebilirsiniz.`
                        }
                    ],
                    accessory: {
                        type: 2,
                        style: enabled ? 4 : 3,
                        custom_id: "tagban_panel_toggle",
                        label: enabled ? "Sistemi Kapat" : "Sistemi Aç"
                    }
                },
                {
                    type: 9,
                    components: [
                        {
                            type: 10,
                            content: `**${nokta} İşlem Tipini Değiştir:**\nYasaklı tag taşıyanlara uygulanacak işlemi belirleyin.`
                        }
                    ],
                    accessory: {
                        type: 2,
                        style: 1,
                        custom_id: "tagban_panel_action",
                        label: "İşlem Tipi: " + action
                    }
                },
                {
                    type: 9,
                    components: [
                        {
                            type: 10,
                            content: `**${nokta} Sunucu Ekle / Çıkar:**\nYasaklı tag (sunucu ID'si/davet) ekleyin veya çıkarın.`
                        }
                    ],
                    accessory: {
                        type: 2,
                        style: 2,
                        custom_id: "tagban_panel_manage",
                        label: "Sunucuları Yönet"
                    }
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 6,
                            custom_id: "tagban_panel_roleselect",
                            placeholder: "Yasaklı Tag Rolü Seç",
                            max_values: 1,
                            default_values: roleId ? [{ id: roleId, type: "role" }] : []
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 8,
                            custom_id: "tagban_panel_channelselect",
                            placeholder: "Log Kanalı Seç",
                            max_values: 1,
                            channel_types: [0],
                            default_values: channelId ? [{ id: channelId, type: "channel" }] : []
                        }
                    ]
                }
            ]
        };

        return {
            components: [container],
            flags: 32768
        };
    }
}

module.exports = TagBanService;
