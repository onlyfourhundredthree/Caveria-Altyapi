const MonopolyGame = require("../../../Core/Database/MonopolyGame");
const MonopolyGameService = require("../../../Services/Fun/MonopolyGameService");

module.exports = {
    conf: {
        usages: ["caveriapoly", "cpoly", "monopoly", "borsa", "caveriapoly-kur", "monopoly-kur"],
        description: "Metin kanalında maksimum 18 kişilik Caveriapoly oyun lobisi ve etkinliğini başlatır.",
        category: "Fun",
        usage: ".caveriapoly"
    },

    run: async (client, message, args) => {
        // Check active game in this channel
        const activeGame = await MonopolyGame.findOne({ channelID: message.channel.id, status: { $ne: "FINISHED" } });
        if (activeGame) {
            return message.reply("⚠️ Bu kanalda zaten aktif bir Monopoly lobisi/oyunu bulunuyor.");
        }

        const game = new MonopolyGame({
            guildID: message.guild.id,
            channelID: message.channel.id,
            hostID: message.author.id,
            status: "LOBBY",
            players: [
                {
                    userID: message.author.id,
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

        const lobbyPayload = await MonopolyGameService.renderLobbyPanel(game, client);
        const sentMsg = await message.reply(lobbyPayload);
        game.messageID = sentMsg.id;
        await game.save();
    }
};
