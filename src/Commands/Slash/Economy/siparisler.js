const { SlashCommandBuilder } = require("discord.js");
const SiparislerService = require("../../../Services/Economy/SiparislerService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("siparisler")
        .setDescription("Sunucudaki siparişleri yönetebileceğiniz paneli açar."),
    category: "Economy",
    execute: async (interaction) => {
        await SiparislerService.execute(interaction);
    }
};
