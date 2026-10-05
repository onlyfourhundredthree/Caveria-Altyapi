const { Schema, model } = require("mongoose");

const MemberClaim = new Schema({
    guildID: { type: String, required: true },
    claimerID: { type: String, required: true },
    claimedID: { type: String, required: true },
    claimType: { type: String, enum: ["VOICE", "CHAT"], default: null },
    voiceMinutes: { type: Number, default: 0 },
    messageCount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ["ACTIVE", "COMPLETED", "EXPIRED", "RELEASED", "CLOSED", "CANCELLED"], default: "ACTIVE" }
});

MemberClaim.index({ guildID: 1, claimedID: 1, claimType: 1, status: 1 }, { unique: true });

module.exports = model("MemberClaim", MemberClaim);
