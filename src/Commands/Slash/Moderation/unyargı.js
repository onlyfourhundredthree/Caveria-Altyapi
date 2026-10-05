const { SlashCommandBuilder } = require('discord.js');
const YargiService = require("../../../Services/Moderation/YargiService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unyargı")
        .setDescription("Unyargı komutu ile 'yargı' cezasını kaldırmanızı sağlar.")
        .addUserOption(option => option.setName("kullanıcı").setDescription("Cezası kaldırılacak kullanıcı").setRequired(true))
        .addStringOption(option => option.setName("sebep").setDescription("Kaldırma sebebi").setRequired(false)),
    execute: async (interaction) => {
        const user = interaction.options.getUser("kullanıcı") || interaction.options.getMember("kullanıcı");
        const reason = interaction.options.getString("sebep");
        await YargiService.executeUnYargi(interaction, user, reason);
    }
};
