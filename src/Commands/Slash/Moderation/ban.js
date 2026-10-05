const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Kullanıcıyı sunucudan uzaklaştırmanızı ve 'underworld' cezası vermenizi sağlar.")
        .addUserOption(option => 
            option.setName("kullanıcı")
                .setDescription("Banlanacak kullanıcıyı seçin")
                .setRequired(true))
        .addStringOption(option => 
            option.setName("sebep")
                .setDescription("Banlama sebebini belirtin")
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        const reason = interaction.options.getString("sebep") || "Bir sebep belirtilmemiş.";

        await ModerationService.handleBan(interaction, targetUser, reason);
    }
};
