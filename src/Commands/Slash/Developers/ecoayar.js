const { SlashCommandBuilder } = require("discord.js");
const EcoAyarService = require("../../../Services/Developers/EcoAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ecoayar")
        .setDescription("Ekonomi sistemini yönetir"),
    category: "Developers",
    execute: async (interaction) => {
        await EcoAyarService.execute(interaction);
    }
};
