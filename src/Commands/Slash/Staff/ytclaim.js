const { SlashCommandBuilder } = require("discord.js");
const YtClaimService = require("../../../Services/Staff/YtClaimService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ytclaim")
        .setDescription("Yeni alınan bir yetkiliyi 6 saat içerisinde claimlemenizi sağlar.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Claimlenecek yeni yetkiliyi seçin")
                .setRequired(true)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        await YtClaimService.execute(interaction, targetUser);
    }
};
