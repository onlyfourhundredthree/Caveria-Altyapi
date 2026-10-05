const { ActionRowBuilder, ButtonBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const PrivateAyarService = require("../../Services/Developers/PrivateAyarService");

const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("privateayar_")) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    const isAdmin = interaction.member.permissions.has("Administrator");
    if (!isOwner && !isAdmin) return interaction.reply({ content: "Bu işlem için yetkiniz yok.", flags: [64] });

    const cid = interaction.customId;

    if (cid === "privateayar_kanal_select") {
        const selected = interaction.values[0];
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`privateayar_set_main_${selected}`).setLabel("Ana Ses Kanalı Yap").setStyle(1),
            new ButtonBuilder().setCustomId(`privateayar_set_cat_${selected}`).setLabel("Kategori Yap").setStyle(2)
        );
        return interaction.update({ content: `<#${selected}> kanalını ne olarak ayarlamak istiyorsunuz?`, components: [row] });
    }

    if (cid.startsWith("privateayar_set_main_")) {
        const id = cid.split("_")[3];
        await ConfigManager.updateNested("privateRooms", "MainChannel", id, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PrivateAyarService.execute(interaction);
    }

    if (cid.startsWith("privateayar_set_cat_")) {
        const id = cid.split("_")[3];
        await ConfigManager.updateNested("privateRooms", "Category", id, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PrivateAyarService.execute(interaction);
    }

    if (cid === "privateayar_sifirla") {
        await ConfigManager.set("privateRooms", {}, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return PrivateAyarService.execute(interaction);
    }
    
    if (cid === "privateayar_yenile") {
        await interaction.deferUpdate();
        return PrivateAyarService.execute(interaction);
    }
};
