const { SlashCommandBuilder } = require("discord.js");
const LevelAyarService = require("../../../Services/Developers/LevelAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("levelayar")
        .setDescription("Level rol sistemini yönetir (Mesaj ve Ses levelleri)"),
    category: "Developers",
    execute: async (interaction) => {
        await LevelAyarService.execute(interaction);
    }
};
