const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    if (interaction.customId === "partner_edit_message") {
        const modal = new ModalBuilder()
            .setCustomId("partner_message_modal")
            .setTitle("Partner Mesajını Düzenle");

        const currentText = ConfigManager.get("Partner.Message") || "Partnerlik yaptığın için teşekkürler!\\nToplam: {topStat} | Haftalık: {weeklyStat} | Sıralama: #{weeklyRank}";

        const textInput = new TextInputBuilder()
            .setCustomId("partner_msg_input")
            .setLabel("Yeni Mesaj")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(currentText)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    if (interaction.customId === "partner_edit_ad") {
        const modal = new ModalBuilder()
            .setCustomId("partner_ad_modal")
            .setTitle("Reklam Metnini Düzenle");

        const currentAd = ConfigManager.get("Partner.AdvertisementText") || "Lütfen sunucu reklam metnimizi girin.";

        const textInput = new TextInputBuilder()
            .setCustomId("partner_ad_input")
            .setLabel("Yeni Reklam Metni")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(currentAd)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    if (interaction.customId === "partner_message_modal") {
        const newText = interaction.fields.getTextInputValue("partner_msg_input");
        
        await ConfigManager.set("Partner.Message", newText, interaction.user.tag);
        
        await interaction.reply({
            content: `✅ **Partner Mesajı başarıyla güncellendi!**\n\n**Yeni Mesaj:**\n\`\`\`\n${newText}\n\`\`\``,
            flags: [MessageFlags.Ephemeral]
        });
    }

    if (interaction.customId === "partner_ad_modal") {
        const newAd = interaction.fields.getTextInputValue("partner_ad_input");
        
        await ConfigManager.set("Partner.AdvertisementText", newAd, interaction.user.tag);
        
        await interaction.reply({
            content: `✅ **Reklam Metni başarıyla güncellendi!**\n\n**Yeni Metin:**\n\`\`\`\n${newAd}\n\`\`\``,
            flags: [MessageFlags.Ephemeral]
        });
    }
};
