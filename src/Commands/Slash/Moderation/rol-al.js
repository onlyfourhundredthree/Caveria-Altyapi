const { SlashCommandBuilder } = require("discord.js");
const RoleService = require("../../../Services/Staff/RoleService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolal")
        .setDescription("Üyeden veya topluluktan rol almanızı sağlar (Yetkiye göre akıllı menü)."),
    async execute(interaction) {
        await RoleService.execute(interaction, "REMOVE");
    }
};
