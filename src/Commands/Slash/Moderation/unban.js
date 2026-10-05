const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Uzaklaştırılmış bir kullanıcının banını kaldırır.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Banı kaldırılacak kullanıcı.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.options.getUser("user");
        await ModerationService.handleUnban(interaction, targetUser);
    }
};
