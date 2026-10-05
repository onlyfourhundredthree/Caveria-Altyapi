const mongoose = require("mongoose");

const monopolyGameSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    channelID: { type: String, required: true },
    messageID: { type: String, default: null },
    hostID: { type: String, required: true },
    status: { type: String, enum: ["LOBBY", "PLAYING", "FINISHED"], default: "LOBBY" },
    players: [
        {
            userID: { type: String, required: true },
            balance: { type: Number, default: 1500 },
            position: { type: Number, default: 0 },
            inJail: { type: Boolean, default: false },
            jailTurns: { type: Number, default: 0 },
            isBankrupt: { type: Boolean, default: false },
            color: { type: String, default: "#3498db" }
        }
    ],
    tiles: [
        {
            index: { type: Number, required: true },
            name: { type: String, required: true },
            type: { type: String, enum: ["GO", "PROPERTY", "JAIL", "GO_TO_JAIL", "CHANCE", "AIRPORT", "TAX", "VACATION"], required: true },
            price: { type: Number, default: 0 },
            rent: { type: Number, default: 0 },
            colorGroup: { type: String, default: null },
            ownerID: { type: String, default: null },
            level: { type: Number, default: 0 } // 0: base property, 1-4: houses, 5: hotel
        }
    ],
    turnIndex: { type: Number, default: 0 },
    turnDeadline: { type: Date, default: null },
    lastDice: { type: Array, default: [0, 0] },
    lastActionLog: { type: String, default: "Oyun başladı! Zar atma sırası ilk oyuncuda." },
    winnerID: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MonopolyGame", monopolyGameSchema);
