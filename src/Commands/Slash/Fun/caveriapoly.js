const { SlashCommandBuilder } = require("discord.js");
const MonopolyGame = require("../../../Core/Database/MonopolyGame");
const MonopolyGameService = require("../../../Services/Fun/MonopolyGameService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("caveriapoly")
        .setDescription("Metin kanalında maksimum 18 kişilik Caveriapoly etkinliğini başlatır."),

    async execute(interaction) {
        const activeGame = await MonopolyGame.findOne({ channelID: interaction.channel.id, status: { $ne: "FINISHED" } });
        if (activeGame) {
            return interaction.reply({ content: "⚠️ Bu kanalda zaten aktif bir Caveriapoly lobisi/oyunu bulunuyor.", ephemeral: true });
        }

        const game = new MonopolyGame({
            guildID: interaction.guild.id,
            channelID: interaction.channel.id,
            hostID: interaction.user.id,
            status: "LOBBY",
            players: [
                {
                    userID: interaction.user.id,
                    balance: 1500,
                    position: 0,
                    inJail: false,
                    jailTurns: 0,
                    isBankrupt: false,
                    color: "#ef4444"
                }
            ]
        });

        await game.save();

        const lobbyPayload = await MonopolyGameService.renderLobbyPanel(game, interaction.client);
        return interaction.reply(lobbyPayload);
    }
};
