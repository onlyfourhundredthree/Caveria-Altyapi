const { SlashCommandBuilder } = require("discord.js");
const PrivateAyarService = require("../../../Services/Developers/PrivateAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("privateayar")
        .setDescription("Özel Oda (Private Rooms) sistemini yönetir"),
    category: "Developers",
    execute: async (interaction) => {
        await PrivateAyarService.execute(interaction);
    }
};
