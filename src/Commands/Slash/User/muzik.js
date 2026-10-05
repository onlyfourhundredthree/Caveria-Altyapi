const { SlashCommandBuilder } = require("discord.js");
const MuzikService = require("../../../Services/Systems/MuzikService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("müzik")
        .setDescription("Gelişmiş Müzik ve Playlist Yönetim Paneli"),
    async execute(interaction) {
        await MuzikService.execute(interaction);
    }
};
