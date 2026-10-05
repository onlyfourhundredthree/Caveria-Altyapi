const { SlashCommandBuilder } = require('discord.js');
const BanSorgulaService = require("../../../Services/Moderation/BanSorgulaService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bansorgula")
        .setDescription("Uzaklaştırılmış bir kullanıcının ban detaylarını sorgular.")
        .addStringOption(option => option.setName("kullanıcı_id").setDescription("Kullanıcı ID'si").setRequired(false))
        .addUserOption(option => option.setName("kullanıcı").setDescription("Kullanıcı").setRequired(false)),
    execute: async (interaction) => {
        const userId = interaction.options.getString("kullanıcı_id");
        const userObj = interaction.options.getUser("kullanıcı");
        const target = userObj || userId;
        await BanSorgulaService.execute(interaction, target);
    }
};
