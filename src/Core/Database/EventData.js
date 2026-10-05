const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    eventID: { type: Number, index: true },
    channelID: String,
    starterID: String,
    startTime: { type: Number, default: Date.now() },
    endTime: { type: Number, default: null },
    participants: { type: Array, default: [] }, 
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("EventData", schema);
