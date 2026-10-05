const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const StatHistory = require("../../../Core/Database/StatHistory");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("davet")
        .setDescription("Davet komutunu yönetmenizi sağlar.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Davet komutunu yönetmenizi sağlar.")
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
            return interaction.reply({ content: "Kullanıcı bulunamadı.", ephemeral: true });
        }
        
        const StatService = require("../../../Services/Stats/StatService");
        await StatService.handleInvite(interaction, targetMember);
    }
};
