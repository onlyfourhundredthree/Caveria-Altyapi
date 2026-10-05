const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("itiraf")
        .setDescription("Itiraf komutunu yönetmenizi sağlar.")
        .addStringOption((option) =>
            option
                .setName("itirafınız")
                .setDescription("Itiraf komutunu yönetmenizi sağlar.")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const itiraf = interaction.options.getString("itirafınız");

        const itirafEmbed = new EmbedBuilder()
            .setColor("Random")
            .setAuthor({ name: `${interaction.guild.name}`, iconURL: `${interaction.guild.iconURL({ dynamic: true })}` })
            .setDescription("Itiraf komutunu yönetmenizi sağlar.")
            .addFields(
                { name: "Gönderen", value: `${interaction.user} (${interaction.user.id})` },
                { name: "İtiraf Mesajı", value: itiraf }
            )
            .setTimestamp();

        const itirafChannel = client.channels.cache.get(ConfigManager.get("Channels.Itiraf"));
        if (itirafChannel) await itirafChannel.send({ embeds: [itirafEmbed] });
        const logChannel = client.channels.cache.get(ConfigManager.get("Channels.ItirafLog"));
        if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        await interaction.reply({ content: (ConfigManager.get("Emojis.toji_onay") || "✨") + " İtirafınız başarıyla gönderildi!", flags: [MessageFlags.Ephemeral] });
    },
};

