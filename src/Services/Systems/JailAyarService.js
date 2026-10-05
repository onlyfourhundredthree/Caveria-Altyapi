const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class JailAyarService {
    static getDashboard(uid, mode = "main") {
        const rawReasons = ConfigManager.get("PunishmentReasons") || [];
        const currentReasons = rawReasons.filter(r => r && typeof r === "object");
        const currentJail = currentReasons.filter(r => r.type === 3);

        const formatReason = (r) => {
            return `> **${r.label}** \`(${r.value})\` - 1. İhlal: \`${r.date1 || "1d"}\` → 2. İhlal: \`${r.date2 || "3d"}\` → 3. İhlal: \`${r.date3 || "7d"}\``;
        };

        const jailText = currentJail.length > 0
            ? currentJail.map(formatReason).join("\n")
            : "> -# *⚠️ Henüz jail sebebi ve süresi eklenmemiş.*";

        const components = [
            {
                type: 10,
                content: `> ## ⛓️ Jail / Karantina Sebep & Süre Yönetim Paneli\n> -# Aşağıdaki butonları kullanarak jail sebeplerini ve ihlal sayılarına göre sürelerini yönetebilirsiniz.`
            },
            { type: 14, spacing: 1, divider: true },
            {
                type: 10,
                content: `> ### ⛓️ Tanımlı Jail Sebepleri & Süreleri (${currentJail.length})\n${jailText}`
            },
            { type: 14, spacing: 1, divider: true }
        ];

        if (mode === "main") {
            components.push({
                type: 1,
                components: [
                    { type: 2, style: 3, custom_id: `jailayar_add_${uid}`, label: "⛓️ Jail Sebep Ekle" },
                    { type: 2, style: 1, custom_id: `jailayar_edit_init_${uid}`, label: "✏️ Sebep Düzenle" },
                    { type: 2, style: 4, custom_id: `jailayar_delete_init_${uid}`, label: "🗑️ Sebep Sil" },
                    { type: 2, style: 2, custom_id: `jailayar_close_${uid}`, label: "❌ Kapat" }
                ]
            });
        } else if (mode === "edit" || mode === "delete") {
            const validReasons = currentJail.filter(r => r && typeof r === "object");
            const options = validReasons.map((r, index) => {
                const safeLabel = r.label ? String(r.label).trim() : "";
                const safeValue = r.value ? String(r.value).trim() : "";
                return {
                    label: safeLabel ? safeLabel.substring(0, 100) : `Jail Sebep ${index + 1}`,
                    description: `1: ${r.date1 || "1d"} | 2: ${r.date2 || "3d"} | 3: ${r.date3 || "7d"}`.substring(0, 100),
                    value: (safeValue || `missing_jail_val_${index}`).substring(0, 100)
                };
            }).slice(0, 25);

            components.push({
                type: 10,
                content: mode === "edit" ? "> ✏️ **Düzenlemek istediğiniz jail sebebini seçin.**" : "> 🗑️ **Silmek istediğiniz jail sebebini seçin.**"
            });

            if (options.length > 0) {
                components.push({
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `jailayar_${mode}_select_${uid}`,
                            placeholder: "Lütfen bir jail sebebi seçin...",
                            options: options
                        }
                    ]
                });
            } else {
                components.push({
                    type: 10,
                    content: "> ❌ *Herhangi bir jail sebebi bulunamadı.*"
                });
            }

            components.push({
                type: 1,
                components: [
                    { type: 2, style: 2, custom_id: `jailayar_back_${uid}`, label: "Geri Dön" }
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

module.exports = JailAyarService;
