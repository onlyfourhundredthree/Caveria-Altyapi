const { SlashCommandBuilder } = require("discord.js");
const ClaimsService = require("../../../Services/Staff/ClaimsService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("claims")
        .setDescription("Aktif claimlerinizi görüntüleyin."),
    category: "Staff",
    execute: async (interaction) => {
        await ClaimsService.execute(interaction);
    }
};
