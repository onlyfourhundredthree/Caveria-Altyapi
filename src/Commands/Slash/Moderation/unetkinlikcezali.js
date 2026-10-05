const { SlashCommandBuilder } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unetkinlikcezali")
        .setDescription("Kullanıcının üzerindeki Etkinlik Cezalı cezasını ve rolünü kaldırır.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Cezası kaldırılacak kullanıcıyı seçin")
                .setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        await ModerationService.handleUnEventJail(interaction, targetUser);
    }
};
