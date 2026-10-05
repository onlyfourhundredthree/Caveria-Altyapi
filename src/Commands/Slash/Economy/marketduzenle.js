const { SlashCommandBuilder } = require("discord.js");
const MarketDuzenleService = require("../../../Services/Economy/MarketDuzenleService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("marketdüzenle")
        .setDescription("Ekonomi marketindeki ürünleri düzenler (Sadece Sahipler)."),
        category: "Economy",
    execute: async (interaction) => {
        await MarketDuzenleService.execute(interaction);
    }
};
