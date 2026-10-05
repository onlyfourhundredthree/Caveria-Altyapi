const ConfigManager = require("../../Core/Handlers/ConfigManager");
const MuteAyarService = require("../../Services/Systems/MuteAyarService");

module.exports = async (interaction) => {
    const cid = interaction.customId || "";
    if (!cid.startsWith("muteayar_")) return;

    const parts = cid.split("_");
    // Format is mostly muteayar_action_action2_uid
    // Let's extract uid which is always the last part.
    const uid = parts[parts.length - 1];

    if (interaction.user.id !== uid) {
        return interaction.reply({ content: "❌ Bu menüyü sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    const saveReasons = async (newReasons) => {
        await ConfigManager.set("PunishmentReasons", newReasons, interaction.user.tag);
    };

    // Modal Submit Handling
    if (interaction.isModalSubmit()) {
        if (cid.startsWith("muteayar_modal_add_")) {
            const isChat = cid.includes("_add_chat_");
            const label = interaction.fields.getTextInputValue("label").trim();
            const value = interaction.fields.getTextInputValue("value").trim();
            const date1 = interaction.fields.getTextInputValue("date1").trim();
            const date2 = interaction.fields.getTextInputValue("date2").trim();
            const date3 = interaction.fields.getTextInputValue("date3").trim();

            let currentReasons = ConfigManager.get("PunishmentReasons") || [];

            if (currentReasons.some(r => r.value === value)) {
                await interaction.reply({ content: `❌ **${value}** sistem değeri zaten kullanılıyor! Başka bir değer seçin.`, ephemeral: true });
                return;
            }

            currentReasons.push({ label, value, type: isChat ? 5 : 4, date1, date2, date3 });
            await saveReasons(currentReasons);
            
            await interaction.update(MuteAyarService.getDashboard(uid, "main"));
            await interaction.followUp({ content: `✅ **${label}** başarıyla eklendi!`, ephemeral: true });
            return;
        }

        if (cid.startsWith("muteayar_modal_edit_")) {
            const targetValue = cid.replace("muteayar_modal_edit_", "").replace(`_${uid}`, "");
            const newLabel = interaction.fields.getTextInputValue("label").trim();
            const date1 = interaction.fields.getTextInputValue("date1").trim();
            const date2 = interaction.fields.getTextInputValue("date2").trim();
            const date3 = interaction.fields.getTextInputValue("date3").trim();

            let currentReasons = ConfigManager.get("PunishmentReasons") || [];
            const reason = currentReasons.find(r => r.value === targetValue);
            if (!reason) {
                await interaction.reply({ content: "Düzenlenmek istenen sebep bulunamadı.", ephemeral: true });
                return;
            }

            reason.label = newLabel;
            reason.date1 = date1;
            reason.date2 = date2;
            reason.date3 = date3;

            await saveReasons(currentReasons);
            
            await interaction.update(MuteAyarService.getDashboard(uid, "main"));
            await interaction.followUp({ content: `✅ **${newLabel}** başarıyla güncellendi!`, ephemeral: true });
            return;
        }
    }

    // Button Handling
    if (interaction.isButton()) {
        if (cid === `muteayar_close_${uid}`) {
            return interaction.update({ components: [{ type: 17, components: [{ type: 10, content: "❌ Menü kapatıldı." }] }] });
        }

        if (cid === `muteayar_back_${uid}`) {
            return interaction.update(MuteAyarService.getDashboard(uid, "main"));
        }

        if (cid === `muteayar_add_chat_${uid}` || cid === `muteayar_add_voice_${uid}`) {
            const isChat = cid === `muteayar_add_chat_${uid}`;
            const modal = {
                title: isChat ? "💬 Chat Mute Sebebi Ekle" : "🔊 Ses Mute Sebebi Ekle",
                custom_id: `muteayar_modal_add_${isChat ? "chat" : "voice"}_${uid}`,
                components: [
                    { type: 1, components: [{ type: 4, custom_id: "label", label: "Görünür İsim (Etiket)", style: 1, required: true, placeholder: "Örn: Kışkırtma" }] },
                    { type: 1, components: [{ type: 4, custom_id: "value", label: "Sistem Değeri (Boşluksuz)", style: 1, required: true, placeholder: "Örn: kiskirtma_chat" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date1", label: "1. İhlal Süresi", style: 1, required: true, placeholder: "Örn: 10m" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date2", label: "2. İhlal Süresi", style: 1, required: true, placeholder: "Örn: 30m" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date3", label: "3. İhlal Süresi", style: 1, required: true, placeholder: "Örn: 1h" }] }
                ]
            };
            return await interaction.showModal(modal);
        }

        if (cid === `muteayar_edit_init_${uid}`) {
            return interaction.update(MuteAyarService.getDashboard(uid, "edit"));
        }

        if (cid === `muteayar_delete_init_${uid}`) {
            return interaction.update(MuteAyarService.getDashboard(uid, "delete"));
        }
    }

    // Select Menu Handling
    if (interaction.isStringSelectMenu()) {
        if (cid === `muteayar_edit_select_${uid}`) {
            const selected = interaction.values[0];
            const currentReasons = (ConfigManager.get("PunishmentReasons") || []).filter(r => r && typeof r === "object");
            
            const reason = currentReasons.find((r, idx) => {
                const safeVal = r.value ? String(r.value).trim() : "";
                return (safeVal || `missing_val_${idx}`) === selected;
            });
            if (!reason) return interaction.update(MuteAyarService.getDashboard(uid, "main"));

            const modal = {
                title: "✏️ Sebebi Düzenle",
                custom_id: `muteayar_modal_edit_${reason.value}_${uid}`,
                components: [
                    { type: 1, components: [{ type: 4, custom_id: "label", label: "Görünür İsim (Etiket)", style: 1, required: true, value: reason.label }] },
                    { type: 1, components: [{ type: 4, custom_id: "date1", label: "1. İhlal Süresi", style: 1, required: true, value: reason.date1 }] },
                    { type: 1, components: [{ type: 4, custom_id: "date2", label: "2. İhlal Süresi", style: 1, required: true, value: reason.date2 }] },
                    { type: 1, components: [{ type: 4, custom_id: "date3", label: "3. İhlal Süresi", style: 1, required: true, value: reason.date3 }] }
                ]
            };
            return await interaction.showModal(modal);
        }

        if (cid === `muteayar_delete_select_${uid}`) {
            const selectedValue = interaction.values[0];
            let currentReasons = (ConfigManager.get("PunishmentReasons") || []).filter(r => r && typeof r === "object");
            const beforeCount = currentReasons.length;
            currentReasons = currentReasons.filter((r, idx) => {
                const safeVal = r.value ? String(r.value).trim() : "";
                return (safeVal || `missing_val_${idx}`) !== selectedValue;
            });

            if (currentReasons.length === beforeCount) {
                return interaction.update(MuteAyarService.getDashboard(uid, "main"));
            }

            await saveReasons(currentReasons);
            await interaction.update(MuteAyarService.getDashboard(uid, "main"));
            await interaction.followUp({ content: `✅ Seçili sebep başarıyla silindi!`, ephemeral: true });
        }
    }
};
