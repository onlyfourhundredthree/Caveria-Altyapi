const { SlashCommandBuilder } = require("discord.js");
const LeaderboardService = require("../../../Services/Staff/LeaderboardService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("Sunucu genelindeki verilerin sıralamasını görüntüler."),

    async execute(interaction, client) {
        await LeaderboardService.execute(interaction);
    }
};
