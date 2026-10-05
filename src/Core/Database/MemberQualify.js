const { Schema, model } = require("mongoose");

const MemberQualify = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    voiceMinutes: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    isDropped: { type: Boolean, default: false },
    dropMessageId: { type: String, default: null },
    logMessageId: { type: String, default: null },
    voiceClaimed: { type: Boolean, default: false },
    chatClaimed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

MemberQualify.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = model("MemberQualify", MemberQualify);
