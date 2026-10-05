const { Schema, model } = require("mongoose");

const MandatoryTaskLog = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    weekKey: { type: String, required: true }, 
    voice: { type: Number, default: 0 }, 
    publicVoice: { type: Number, default: 0 }, 
    message: { type: Number, default: 0 }, 
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "HOLD"], default: "PENDING" },
    reviewedBy: { type: String, default: null }, 
    reviewAction: { type: String, enum: ["PROMOTE", "DEMOTE", "HOLD", "COMPLETE", null], default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: "" }
});

MandatoryTaskLog.index({ guildID: 1, userID: 1, weekKey: 1 }, { unique: true });
MandatoryTaskLog.index({ guildID: 1, userID: 1, status: 1 });

module.exports = model("MandatoryTaskLog", MandatoryTaskLog);
