const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Kullanıcının metin veya ses kanallarını kullanmasını yasaklar.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Mute atılacak kullanıcı.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.options.getUser("user");
        await ModerationService.handleMute(interaction, targetUser);
    }
};
