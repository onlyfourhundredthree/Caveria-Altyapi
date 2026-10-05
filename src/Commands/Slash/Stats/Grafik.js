const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const StatHistory = require("../../../Core/Database/StatHistory");
const moment = require("moment");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("grafik")
        .setDescription("Grafik komutunu yönetmenizi sağlar.")
        .addStringOption(option =>
            option.setName("tür")
                .setDescription("Grafik komutunu yönetmenizi sağlar.")
                .addChoices(
                    { name: "Sunucu", value: "server" },
                    { name: "Kullanıcı", value: "user" }
                )
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Grafik komutunu yönetmenizi sağlar.")
                .setRequired(false)
        ),

    async execute(interaction) {
        const type = interaction.options.getString("tür");
        
        let targetMember = null;
        if (type === "user") {
            const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
            targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        }

        const StatService = require("../../../Services/Stats/StatService");
        await StatService.handleGraphs(interaction, targetMember);
    }
};
