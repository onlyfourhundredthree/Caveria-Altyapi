const { SlashCommandBuilder } = require("discord.js");
const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Sunucudaki toplam üye, aktif, sesli ve taglı kullanıcı sayısını anlık raporlar."),

    async execute(interaction) {
        await GeneralService.sendSayStats(interaction, interaction.guild, interaction.user);
    }
};
