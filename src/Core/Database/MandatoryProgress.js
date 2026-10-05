const { Schema, model } = require("mongoose");

const MandatoryProgress = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },

    voiceMs: { type: Number, default: 0 },
    publicVoiceMs: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    inviteCount: { type: Number, default: 0 },

    overflowVoiceMs: { type: Number, default: 0 },
    overflowPublicVoiceMs: { type: Number, default: 0 },
    overflowMessageCount: { type: Number, default: 0 },
    overflowInviteCount: { type: Number, default: 0 },

    lastUpdated: { type: Date, default: Date.now }
});

MandatoryProgress.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = model("MandatoryProgress", MandatoryProgress);
