const { SlashCommandBuilder } = require('discord.js');
const AfService = require("../../../Services/Moderation/AfService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("af")
        .setDescription("Sunucudaki Jail ve Underworld cezaları için af menüsünü açar."),
    execute: async (interaction) => {
        await AfService.execute(interaction);
    }
};
