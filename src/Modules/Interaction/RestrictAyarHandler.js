const { ActionRowBuilder, UserSelectMenuBuilder, RoleSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const RestrictAyarService = require("../../Services/Developers/RestrictAyarService");

const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("restrictayar_")) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    if (!isOwner) return interaction.reply({ content: "Bu işlem için kurucu yetkisine sahip olmalısınız.", flags: [64] });

    const cid = interaction.customId;

    if (cid === "restrictayar_menu") {
        const val = interaction.values[0];
        if (val === "users") {
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder()
                    .setCustomId("restrictayar_set_users")
                    .setPlaceholder("Korunacak Üyeleri Seçin")
                    .setMinValues(1)
                    .setMaxValues(10)
            );
            const panel = new V2PanelBuilder().addText("> " + "Korunacak üyeleri seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }
        if (val === "roles") {
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("restrictayar_set_roles")
                    .setPlaceholder("Yasaklı Rolleri Seçin")
                    .setMinValues(1)
                    .setMaxValues(10)
            );
            const panel = new V2PanelBuilder().addText("> " + "Alınması yasaklanacak rolleri seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }
    }

    if (cid === "restrictayar_set_users") {
        await ConfigManager.updateNested("Restrict", "Users", interaction.values, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return RestrictAyarService.execute(interaction);
    }

    if (cid === "restrictayar_set_roles") {
        await ConfigManager.updateNested("Restrict", "Roles", interaction.values, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return RestrictAyarService.execute(interaction);
    }

    if (cid === "restrictayar_sifirla") {
        await ConfigManager.set("Restrict", {}, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return RestrictAyarService.execute(interaction);
    }

    if (cid === "restrictayar_yenile") {
        await interaction.deferUpdate().catch(()=>{});
        return RestrictAyarService.execute(interaction);
    }
};

module.exports.conf = {
    name: "interactionCreate"
};
