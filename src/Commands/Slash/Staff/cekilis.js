const { SlashCommandBuilder } = require("discord.js");
const CekilisService = require("../../../Services/Staff/CekilisService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cekilis")
        .setDescription("Sunucuda çekiliş başlatmanızı veya yönetmenizi sağlar."),
    category: "Staff",
    execute: async (interaction) => {
        await CekilisService.execute(interaction);
    }
};
