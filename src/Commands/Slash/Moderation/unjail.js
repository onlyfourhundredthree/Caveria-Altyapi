const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unjail")
        .setDescription("Karantina alanında bulunan bir üyenin cezasını kaldırır.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Cezası kaldırılacak kullanıcı.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.options.getUser("user");
        await ModerationService.handleUnjail(interaction, targetUser);
    }
};
