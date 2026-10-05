const { SlashCommandBuilder } = require("discord.js");
const PermanentAyarService = require("../../../Services/Developers/PermanentAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("permanentayar")
        .setDescription("Kalıcı Özel Oda sistemini yönetir"),
    category: "Developers",
    execute: async (interaction) => {
        await PermanentAyarService.execute(interaction);
    }
};
