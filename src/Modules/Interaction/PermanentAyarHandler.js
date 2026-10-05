const { ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const PermanentAyarService = require("../../Services/Developers/PermanentAyarService");

const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("permanentayar_")) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    const isAdmin = interaction.member.permissions.has("Administrator");
    if (!isOwner && !isAdmin) return interaction.reply({ content: "Bu işlem için yetkiniz yok.", flags: [64] });

    const cid = interaction.customId;

    if (cid === "permanentayar_kanal_select") {
        const selected = interaction.values[0];
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`permanentayar_set_ch_${selected}`).setLabel("Ses Kanalı Yap").setStyle(1),
            new ButtonBuilder().setCustomId(`permanentayar_set_cat_${selected}`).setLabel("Kategori Yap").setStyle(2),
            new ButtonBuilder().setCustomId(`permanentayar_set_log_${selected}`).setLabel("Log Kanalı Yap").setStyle(3)
        );
        return interaction.update({ content: `<#${selected}> kanalını ne olarak ayarlamak istiyorsunuz?`, components: [row] });
    }

    if (cid.startsWith("permanentayar_set_ch_")) {
        const id = cid.split("_")[3];
        await ConfigManager.updateNested("PermanentRoomSettings", "Channel", id, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PermanentAyarService.execute(interaction);
    }

    if (cid.startsWith("permanentayar_set_cat_")) {
        const id = cid.split("_")[3];
        await ConfigManager.updateNested("PermanentRoomSettings", "Category", id, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PermanentAyarService.execute(interaction);
    }
    
    if (cid.startsWith("permanentayar_set_log_")) {
        const id = cid.split("_")[3];
        await ConfigManager.updateNested("PermanentRoomSettings", "LogChannel", id, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PermanentAyarService.execute(interaction);
    }

    if (cid === "permanentayar_price") {
        const modal = new ModalBuilder()
            .setCustomId("permanentayar_modal_price")
            .setTitle("Oda Ücretini Ayarla");
            
        const input = new TextInputBuilder()
            .setCustomId("price")
            .setLabel("Oda açma ücreti (Coin)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (cid === "permanentayar_modal_price") {
        const price = parseInt(interaction.fields.getTextInputValue("price"));
        if (isNaN(price)) return interaction.reply({ content: "Lütfen geçerli bir sayı girin.", flags: [64] });
        await ConfigManager.updateNested("PermanentRoomSettings", "Price", price, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PermanentAyarService.execute(interaction);
    }

    if (cid === "permanentayar_sifirla") {
        await ConfigManager.set("PermanentRoomSettings", {}, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PermanentAyarService.execute(interaction);
    }
    
    if (cid === "permanentayar_yenile") {
        await interaction.deferUpdate();
        return PermanentAyarService.execute(interaction);
    }
};
