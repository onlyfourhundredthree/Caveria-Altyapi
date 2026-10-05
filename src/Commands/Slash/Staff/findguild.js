const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const FindGuildService = require("../../../Services/FindGuildService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("findguild")
        .setDescription("Kullanıcının taşıdığı primary guild (klan) ID'sini bulur.")
        .addStringOption(option =>
            option.setName("id")
                .setDescription("Bilgisi alınacak kullanıcının ID'si.")
                .setRequired(true)),

    async execute(interaction, client) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Bu komutu kullanmaya yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const userId = interaction.options.getString("id");
        const payload = await FindGuildService.getPayload(client, userId, interaction.user);
        await interaction.reply(payload);
    }
};
