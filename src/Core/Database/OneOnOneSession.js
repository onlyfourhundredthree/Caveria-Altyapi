const { Schema, model } = require("mongoose");

const OneOnOneSession = new Schema({
    guildID: { type: String, required: true },
    managerID: { type: String, required: true },
    memberID: { type: String, required: true },
    channelID: { type: String, required: true },
    startTime: { type: Date, default: Date.now },
    pausedAt: { type: Date, default: null },
    pauseDuration: { type: Number, default: 0 }
});

OneOnOneSession.index({ guildID: 1, managerID: 1 }, { unique: true });

module.exports = model("OneOnOneSession", OneOnOneSession);
