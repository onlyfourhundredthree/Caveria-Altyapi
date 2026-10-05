const { SlashCommandBuilder } = require("discord.js");
const BoostAyarService = require("../../../Services/Developers/BoostAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boostayar")
        .setDescription("Sunucu Takviye (Boost) sistemini yönetir"),
    category: "Developers",
    execute: async (interaction) => {
        await BoostAyarService.execute(interaction);
    }
};
