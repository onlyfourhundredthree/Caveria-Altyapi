const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class MuteAyarService {
    static getDashboard(uid, mode = "main") {
        const rawReasons = ConfigManager.get("PunishmentReasons") || [];
        const currentReasons = rawReasons.filter(r => r && typeof r === "object");
        const currentChat = currentReasons.filter(r => r.type === 5);
        const currentVoice = currentReasons.filter(r => r.type === 4);

        const formatReason = (r) => {
            return `> **${r.label}** \`(${r.value})\` - \`${r.date1}\` → \`${r.date2}\` → \`${r.date3}\``;
        };

        const chatText = currentChat.length > 0
            ? currentChat.map(formatReason).join("\n")
            : "> -# *⚠️ Henüz chat mute sebebi eklenmemiş.*";

        const voiceText = currentVoice.length > 0
            ? currentVoice.map(formatReason).join("\n")
            : "> -# *⚠️ Henüz ses mute sebebi eklenmemiş.*";

        const components = [
            {
                type: 10,
                content: `> ## 🔇 Mute Sebep Yönetim Paneli\n> -# Aşağıdaki butonları kullanarak chat ve ses susturma sebeplerini yönetebilirsiniz.`
            },
            { type: 14, spacing: 1, divider: true },
            {
                type: 10,
                content: `> ### 💬 Chat Mute Sebepleri (${currentChat.length})\n${chatText}`
            },
            { type: 14, spacing: 1, divider: true },
            {
                type: 10,
                content: `> ### 🔊 Ses Mute Sebepleri (${currentVoice.length})\n${voiceText}`
            },
            { type: 14, spacing: 1, divider: true }
        ];

        if (mode === "main") {
            components.push({
                type: 1,
                components: [
                    { type: 2, style: 3, custom_id: `muteayar_add_chat_${uid}`, label: "💬 Chat Sebep Ekle" },
                    { type: 2, style: 3, custom_id: `muteayar_add_voice_${uid}`, label: "🔊 Ses Sebep Ekle" },
                    { type: 2, style: 1, custom_id: `muteayar_edit_init_${uid}`, label: "✏️ Sebep Düzenle" },
                    { type: 2, style: 4, custom_id: `muteayar_delete_init_${uid}`, label: "🗑️ Sebep Sil" },
                    { type: 2, style: 2, custom_id: `muteayar_close_${uid}`, label: "❌ Kapat" }
                ]
            });
        } else if (mode === "edit" || mode === "delete") {
            const validReasons = (currentReasons || []).filter(r => r && typeof r === "object");
            const options = validReasons.map((r, index) => {
                const safeLabel = r.label ? String(r.label).trim() : "";
                const safeValue = r.value ? String(r.value).trim() : "";
                return {
                    label: safeLabel ? safeLabel.substring(0, 100) : `Sebep ${index + 1}`,
                    description: `${r.type === 5 ? "Chat" : "Ses"} | ${r.date1 || ""} → ${r.date2 || ""} → ${r.date3 || ""}`.substring(0, 100),
                    value: (safeValue || `missing_val_${index}`).substring(0, 100)
                };
            }).slice(0, 25);

            components.push({
                type: 10,
                content: mode === "edit" ? "> ✏️ **Düzenlemek istediğiniz sebebi seçin.**" : "> 🗑️ **Silmek istediğiniz sebebi seçin.**"
            });

            if (options.length > 0) {
                components.push({
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `muteayar_${mode}_select_${uid}`,
                            placeholder: "Lütfen bir sebep seçin...",
                            options: options
                        }
                    ]
                });
            } else {
                components.push({
                    type: 10,
                    content: "> ❌ *Herhangi bir sebep bulunamadı.*"
                });
            }

            components.push({
                type: 1,
                components: [
                    { type: 2, style: 2, custom_id: `muteayar_back_${uid}`, label: "Geri Dön" }
                ]
            });
        }

        return {
            flags: [MessageFlags.IsComponentsV2, 32768],
            components: [
                {
                    type: 17,
                    components: components
                }
            ]
        };
    }
}

module.exports = MuteAyarService;
