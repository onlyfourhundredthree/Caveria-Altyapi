const { SlashCommandBuilder } = require('discord.js');
const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardım')
        .setDescription("Yardım komutunu yönetmenizi sağlar."),

    async execute(interaction, client) {
        // İkili mimari & Components V2 yapısı
        interaction.client = client;
        await GeneralService.handleHelp(interaction);
    }
};
