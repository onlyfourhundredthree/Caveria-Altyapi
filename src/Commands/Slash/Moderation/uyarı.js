const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uyari")
        .setDescription("Kullanıcıya kural ihlali sebebiyle uyarı verir.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Kullanıcıya kural ihlali sebebiyle uyarı verir.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("sebep")
                .setDescription("Kullanıcıya kural ihlali sebebiyle uyarı verir.")
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("kullanıcı");
        const reason = interaction.options.getString("sebep");

        await ModerationService.handleWarn(interaction, target, reason);
    }
};
