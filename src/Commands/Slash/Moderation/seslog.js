const { SlashCommandBuilder } = require('discord.js');
const SesLogService = require("../../../Services/Stats/SesLogService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seslog")
        .setDescription("Kullanıcının sesli kanallarda ne kadar kaldığını ve hangi kanallarda gezdiğini dökümler.")
        .addUserOption(option => option.setName("kullanıcı").setDescription("Ses loglarını görmek istediğiniz kullanıcı").setRequired(true)),
    execute: async (interaction) => {
        const user = interaction.options.getUser("kullanıcı") || interaction.options.getMember("kullanıcı");
        await SesLogService.execute(interaction, user);
    }
};
