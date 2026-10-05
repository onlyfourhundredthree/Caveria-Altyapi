const { Schema, model } = require("mongoose");

const ScheduledMessage = new Schema({
    guildID: { type: String, required: true },
    channelID: { type: String, required: true },
    message: { type: String, required: true },
    hour: { type: Number, required: true }, 
    minute: { type: Number, required: true }, 
    isRepeating: { type: Boolean, default: false },
    intervalHours: { type: Number, default: 0 },
    maxRepetitions: { type: Number, default: 0 }, 
    sentCount: { type: Number, default: 0 },
    lastSent: { type: Date, default: null },
    active: { type: Boolean, default: true }
});

module.exports = model("ScheduledMessage", ScheduledMessage);
