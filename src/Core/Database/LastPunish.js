const mongoose = require("mongoose");

const LastPunishSchema = new mongoose.Schema({
    Member: { type: String, unique: true },
    tier: { type: Number, default: 0 }
});

const LastPunish = mongoose.model("LastPunish", LastPunishSchema);

module.exports = LastPunish;
