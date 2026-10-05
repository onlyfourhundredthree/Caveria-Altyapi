const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    addedBy: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Playlist", playlistSchema);
