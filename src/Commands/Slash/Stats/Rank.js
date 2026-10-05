const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const StatService = require("../../../Services/Stats/StatService");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Sunucudaki aktifliğinize göre kazandığınız XP seviyesini ve rütbe kartını açar.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Rank kartı açılacak kullanıcı")
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);

        if (!member) {
            return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Kullanıcı bulunamadı.", flags: [MessageFlags.Ephemeral] });
        }

        await StatService.handleRank(interaction, member);
    }
};
