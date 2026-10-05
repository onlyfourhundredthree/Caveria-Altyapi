const { Schema, model } = require("mongoose");

const MemberClaimSettings = new Schema({
    guildID: { type: String, required: true, unique: true },
    requiredVoice: { type: Number, default: 60 }, 
    requiredMessages: { type: Number, default: 50 },
    qualifyVoice: { type: Number, default: 10 },
    qualifyMessages: { type: Number, default: 25 },
    xpPerMessage: { type: Number, default: 1 },
    xpPerMinute: { type: Number, default: 2 },
    maxMessageLimit: { type: Number, default: 100 },
    maxVoiceLimit: { type: Number, default: 60 },
    xpReward: { type: Number, default: 100 },
    maxClaims: { type: Number, default: 3 }
});

module.exports = model("MemberClaimSettings", MemberClaimSettings);
