const { Schema, model } = require("mongoose");

const RiotAccount = new Schema({
    userId: { type: String, required: true }, 
    puuid: { type: String, required: true },
    gameType: { type: String, required: true, enum: ['lol', 'valo'] }, 
    gameName: { type: String },
    tagLine: { type: String },
    riotId: { type: String }, 
    isVerified: { type: Boolean, default: false },
    linkedAt: { type: Date, default: Date.now }
});

module.exports = model("RiotAccount", RiotAccount);
