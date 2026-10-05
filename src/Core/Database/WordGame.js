const { Schema, model } = require("mongoose");

const WordGame = new Schema({
    GuildID: { type: String, required: true },
    ChannelID: { type: String, required: true },
    LastWord: { type: String, default: "" },
    LastUser: { type: String, default: "" },
    UsedWords: { type: Array, default: [] },
    TotalWords: { type: Number, default: 0 }
});

module.exports = model("WordGame", WordGame);
