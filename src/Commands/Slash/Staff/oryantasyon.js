const { SlashCommandBuilder } = require("discord.js");
const OryantasyonService = require("../../../Services/Staff/OryantasyonService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("oryantasyon")
        .setDescription("Yeni yetkili ile aynı ses kanalında minimum 3 dakikalık oryantasyon sürecini başlatır veya bitirir.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Oryantasyon yapılacak yeni yetkiliyi seçin")
                .setRequired(true)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        await OryantasyonService.execute(interaction, targetUser);
    }
};
