const mongoose = require("mongoose");

const punitivesSchema = new mongoose.Schema({
    No: Number,
    Member: String,
    Staff: String,
    Type: String,
    Reason: String,
    Duration: Number,
    Date: Number,
    Expried: Number,
    Remover: String,
    RemoveDate: Number,
    RemoveReason: String,
    Active: { type: Boolean, default: true },
    LastPunishType: String,
    Evidence: { type: Array, default: [] },
    Hidden: { type: Boolean, default: false },
    AuditStatus: { type: String, default: "Pending" }, // Pending, Handled, Approved, Lifted
    AuditedBy: { type: String, default: null },
    EvidencePoolSent: { type: Boolean, default: false },
    PromptChannelID: { type: String, default: null },
    PromptMessageID: { type: String, default: null }
});

punitivesSchema.index({ Member: 1 });
punitivesSchema.index({ Active: 1, Type: 1 });
punitivesSchema.index({ No: -1 });

module.exports = mongoose.model('Punitives', punitivesSchema);