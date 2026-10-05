const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("etkinlikcezali")
        .setDescription("Kullanıcıya Etkinlik Cezalı rolünü verir ve ceza uygular.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Caza uygulanacak kullanıcıyı seçin")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("süre")
                .setDescription("Ceza süresi (örn: 1h, 1d, 3d)")
                .setRequired(false))
        .addStringOption(option =>
            option.setName("sebep")
                .setDescription("Cezalandırma sebebi")
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        const duration = interaction.options.getString("süre");
        const reason = interaction.options.getString("sebep") || "Etkinlik kuralları ihlali.";

        await ModerationService.handleEventJail(interaction, targetUser, reason, duration);
    }
};
