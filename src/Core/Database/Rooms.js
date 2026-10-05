const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    ownerID: { type: String, required: true, unique: true },
    channelID: { type: String, required: true, unique: true },
    members: { type: [String], default: [] },
});

module.exports = mongoose.model("Rooms", roomSchema);
