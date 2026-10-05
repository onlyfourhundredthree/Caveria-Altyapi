const { SlashCommandBuilder } = require('discord.js');
const YargiService = require("../../../Services/Moderation/YargiService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("yargı")
        .setDescription("Yargı komutu ile 'yargı' cezası uygulamanızı sağlar.")
        .addUserOption(option => option.setName("kullanıcı").setDescription("Yargılanacak kullanıcı").setRequired(true))
        .addStringOption(option => option.setName("sebep").setDescription("Ceza sebebi").setRequired(false)),
    execute: async (interaction) => {
        const user = interaction.options.getUser("kullanıcı") || interaction.options.getMember("kullanıcı");
        const reason = interaction.options.getString("sebep");
        await YargiService.executeYargi(interaction, user, reason);
    }
};
