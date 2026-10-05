const { SlashCommandBuilder } = require("discord.js");
const CustomRoleService = require("../../../Services/Systems/CustomRoleService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ozel-komut")
        .setDescription("Sunucuda özel komutlar oluşturmanızı ve yönetmenizi sağlar."),
    category: "Owners",
    owner: true,
    execute: async (interaction) => {
        const payload = await CustomRoleService.getDashboard(interaction.client, interaction.guild);
        await interaction.reply(payload);
    }
};
