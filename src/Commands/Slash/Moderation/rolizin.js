const { SlashCommandBuilder } = require("discord.js");
const RolizinService = require("../../../Services/Moderation/RolizinService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolizin")
        .setDescription("Bir veya birden fazla rolün izinlerini toplu yönetir."),

    async execute(interaction, client) {
        await RolizinService.handleRolizin(interaction, client);
    },
};
