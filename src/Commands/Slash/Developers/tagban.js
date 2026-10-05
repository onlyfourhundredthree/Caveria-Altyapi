const { SlashCommandBuilder } = require('discord.js');
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const TagBanService = require("../../../Services/TagBanService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tagban")
        .setDescription("Yasaklı tag yönetim menüsünü açar."),
    async execute(interaction, client) {
        if (!ConfigManager.isOwner(interaction.member)) {
            return interaction.reply({ content: "Bu komutu kullanmaya yetkin yetmiyor.", ephemeral: true });
        }

        const payload = await TagBanService.getPayload(client);
        await interaction.reply(payload);
    }
};
