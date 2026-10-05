const ConfigManager = require("../../Core/Handlers/ConfigManager");
const JailAyarService = require("../../Services/Systems/JailAyarService");

module.exports = async (interaction) => {
    const cid = interaction.customId || "";
    if (!cid.startsWith("jailayar_")) return;

    const parts = cid.split("_");
    const uid = parts[parts.length - 1];

    if (interaction.user.id !== uid) {
        return interaction.reply({ content: "❌ Bu menüyü sadece komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    const saveReasons = async (newReasons) => {
        await ConfigManager.set("PunishmentReasons", newReasons, interaction.user.tag);
    };

    // Modal Submit Handling
    if (interaction.isModalSubmit()) {
        if (cid.startsWith("jailayar_modal_add_")) {
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

            currentReasons.push({ label, value, type: 3, date1, date2, date3 });
            await saveReasons(currentReasons);
            
            await interaction.update(JailAyarService.getDashboard(uid, "main"));
            await interaction.followUp({ content: `✅ Jail sebebi **${label}** başarıyla eklendi!`, ephemeral: true });
            return;
        }

        if (cid.startsWith("jailayar_modal_edit_")) {
            const targetValue = cid.replace("jailayar_modal_edit_", "").replace(`_${uid}`, "");
            const newLabel = interaction.fields.getTextInputValue("label").trim();
            const date1 = interaction.fields.getTextInputValue("date1").trim();
            const date2 = interaction.fields.getTextInputValue("date2").trim();
            const date3 = interaction.fields.getTextInputValue("date3").trim();

            let currentReasons = ConfigManager.get("PunishmentReasons") || [];
            const reason = currentReasons.find(r => r.value === targetValue);
            if (!reason) {
                await interaction.reply({ content: "Düzenlenmek istenen jail sebebi bulunamadı.", ephemeral: true });
                return;
            }

            reason.label = newLabel;
            reason.date1 = date1;
            reason.date2 = date2;
            reason.date3 = date3;

            await saveReasons(currentReasons);
            
            await interaction.update(JailAyarService.getDashboard(uid, "main"));
            await interaction.followUp({ content: `✅ Jail sebebi **${newLabel}** başarıyla güncellendi!`, ephemeral: true });
            return;
        }
    }

    // Button Handling
    if (interaction.isButton()) {
        if (cid === `jailayar_close_${uid}`) {
            return interaction.update({ components: [{ type: 17, components: [{ type: 10, content: "❌ Menü kapatıldı." }] }] });
        }

        if (cid === `jailayar_back_${uid}`) {
            return interaction.update(JailAyarService.getDashboard(uid, "main"));
        }

        if (cid === `jailayar_add_${uid}`) {
            const modal = {
                title: "⛓️ Jail / Karantina Sebebi Ekle",
                custom_id: `jailayar_modal_add_${uid}`,
                components: [
                    { type: 1, components: [{ type: 4, custom_id: "label", label: "Görünür İsim (Sebep Adı)", style: 1, required: true, placeholder: "Örn: Ağır Küfür / Hakaret" }] },
                    { type: 1, components: [{ type: 4, custom_id: "value", label: "Sistem Değeri (Boşluksuz/Benzersiz)", style: 1, required: true, placeholder: "Örn: jail-kufur" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date1", label: "1. İhlal Süresi", style: 1, required: true, placeholder: "Örn: 1d" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date2", label: "2. İhlal Süresi", style: 1, required: true, placeholder: "Örn: 3d" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date3", label: "3. İhlal Süresi", style: 1, required: true, placeholder: "Örn: 7d" }] }
                ]
            };
            return await interaction.showModal(modal);
        }

        if (cid === `jailayar_edit_init_${uid}`) {
            return interaction.update(JailAyarService.getDashboard(uid, "edit"));
        }

        if (cid === `jailayar_delete_init_${uid}`) {
            return interaction.update(JailAyarService.getDashboard(uid, "delete"));
        }
    }

    // Select Menu Handling
    if (interaction.isStringSelectMenu()) {
        if (cid === `jailayar_edit_select_${uid}`) {
            const selectedVal = interaction.values[0];
            const currentReasons = ConfigManager.get("PunishmentReasons") || [];
            const reason = currentReasons.find(r => r.value === selectedVal);

            if (!reason) {
                await interaction.reply({ content: "Seçilen sebep bulunamadı.", ephemeral: true });
                return;
            }

            const modal = {
                title: "✏️ Jail Sebebi Düzenle",
                custom_id: `jailayar_modal_edit_${selectedVal}_${uid}`,
                components: [
                    { type: 1, components: [{ type: 4, custom_id: "label", label: "Görünür İsim (Sebep Adı)", style: 1, required: true, value: reason.label || "" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date1", label: "1. İhlal Süresi", style: 1, required: true, value: reason.date1 || "1d" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date2", label: "2. İhlal Süresi", style: 1, required: true, value: reason.date2 || "3d" }] },
                    { type: 1, components: [{ type: 4, custom_id: "date3", label: "3. İhlal Süresi", style: 1, required: true, value: reason.date3 || "7d" }] }
                ]
            };
            return await interaction.showModal(modal);
        }

        if (cid === `jailayar_delete_select_${uid}`) {
            const selectedVal = interaction.values[0];
            let currentReasons = (ConfigManager.get("PunishmentReasons") || []).filter(r => r && typeof r === "object");
            
            const targetReason = currentReasons.find(r => r.value === selectedVal);
            const labelName = targetReason ? targetReason.label : selectedVal;

            currentReasons = currentReasons.filter(r => r.value !== selectedVal);
            await saveReasons(currentReasons);

            await interaction.update(JailAyarService.getDashboard(uid, "main"));
            await interaction.followUp({ content: `🗑️ **${labelName}** jail sebebi silindi!`, ephemeral: true });
            return;
        }
    }
};
