const { SlashCommandBuilder } = require('discord.js');
const SicilTemizleService = require("../../../Services/Moderation/SicilTemizleService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("siciltemizle")
        .setDescription("İstisnai durumlarda bir kullanıcının geçmişteki tüm ceza kayıtlarını sıfırlar.")
        .addUserOption(option => option.setName("kullanıcı").setDescription("Sicili temizlenecek kullanıcı").setRequired(true)),
    execute: async (interaction) => {
        const user = interaction.options.getUser("kullanıcı") || interaction.options.getMember("kullanıcı");
        await SicilTemizleService.execute(interaction, user);
    }
};
