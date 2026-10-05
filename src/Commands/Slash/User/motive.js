const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("motive")
        .setDescription("Motive komutunu yönetmenizi sağlar."),

    async execute(interaction) {
        await interaction.reply({ content: `<@1007093190538563735> sunucunun %100 yerli motivesi ez kolay gg wp`, flags: [MessageFlags.Ephemeral] });
    }
};
