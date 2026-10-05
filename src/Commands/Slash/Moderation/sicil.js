const { SlashCommandBuilder } = require('discord.js');
const SicilService = require("../../../Services/Moderation/SicilService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sicil")
        .setDescription("Kullanıcının daha önce aldığı uyarı, ban ve mute gibi tüm cezaların listesini açar.")
        .addUserOption(option => option.setName("kullanıcı").setDescription("Siciline bakmak istediğiniz kullanıcı").setRequired(false))
        .addIntegerOption(option => option.setName("cezano").setDescription("Özellikle bir cezanın detayına bakmak için ceza numarası").setRequired(false)),
    
    execute: async (interaction) => {
        const targetMember = interaction.options.getUser("kullanıcı") || interaction.options.getMember("kullanıcı");
        const cezaNo = interaction.options.getInteger("cezano");
        await SicilService.execute(interaction, targetMember, cezaNo);
    }
};
