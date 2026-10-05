const mongoose = require("mongoose");

const monopolyProfileSchema = new mongoose.Schema({
    userID: { type: String, required: true, unique: true },
    playedGames: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    totalMoneyEarned: { type: Number, default: 0 },
    propertiesBought: { type: Number, default: 0 },
    bankruptcies: { type: Number, default: 0 }
});

module.exports = mongoose.model("MonopolyProfile", monopolyProfileSchema);
