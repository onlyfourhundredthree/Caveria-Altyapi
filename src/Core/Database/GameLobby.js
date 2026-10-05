const { Schema, model } = require("mongoose");

const GameLobby = new Schema({
    userId: { type: String, required: true, unique: true }, 
    game: { type: String, required: true }, 
    mode: { type: String, required: true }, 
    roles: { type: [String], default: [] }, 
    partyUsers: { type: [String], default: [] }, 
    playerCount: { type: Number, required: true }, 
    rankRange: { type: String },
    note: { type: String },
    expiresAt: { type: Date, required: true },
    messageId: { type: String },
    voiceChannelId: { type: String }
});

module.exports = model("GameLobby", GameLobby);
