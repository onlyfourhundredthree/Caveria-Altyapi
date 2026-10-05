const { SlashCommandBuilder } = require('discord.js');
const EmojiService = require("../../../Services/Systems/EmojiService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("emojiekle")
        .setDescription("Dış kaynaklı bir emojiyi URL veya isimle sunucuya pratikçe ekler.")
        .addStringOption(option => option.setName("link_veya_emoji").setDescription("Link veya varsayılan emoji").setRequired(true))
        .addStringOption(option => option.setName("isim").setDescription("Emojinin verilecek ismi").setRequired(false)),
    execute: async (interaction) => {
        const link = interaction.options.getString("link_veya_emoji");
        const name = interaction.options.getString("isim");
        await EmojiService.execute(interaction, link, name);
    }
};
