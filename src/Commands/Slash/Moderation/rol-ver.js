const { SlashCommandBuilder } = require("discord.js");
const RoleService = require("../../../Services/Staff/RoleService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolver")
        .setDescription("Üyeye veya topluluğa rol vermenizi sağlar (Yetkiye göre akıllı menü)."),
    async execute(interaction) {
        await RoleService.execute(interaction, "ADD");
    }
};
