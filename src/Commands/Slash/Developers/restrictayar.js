const { SlashCommandBuilder } = require("discord.js");
const RestrictAyarService = require("../../../Services/Developers/RestrictAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("restrictayar")
        .setDescription("Kısıtlı yetkili (Restrict) sistemini yönetir"),
    category: "Developers",
    execute: async (interaction) => {
        await RestrictAyarService.execute(interaction);
    }
};
