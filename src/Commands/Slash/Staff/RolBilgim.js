const { SlashCommandBuilder } = require("discord.js");
const CustomRoleService = require("../../../Services/Systems/CustomRoleService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolbilgim")
        .setDescription("Kullanabildiğiniz özel rol komutlarını ve kotalarınızı gösterir."),
    async execute(interaction, client) {
        return CustomRoleService.sendRoleInfo(interaction);
    }
};
