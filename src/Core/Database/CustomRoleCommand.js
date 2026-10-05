const mongoose = require("mongoose");

const CustomRoleCommandSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    commandName: { type: String, required: true },
    allowedRoles: { type: [String], default: [] },
    roleLimits: { type: [{ roleID: String, limit: Number }], default: [] },
    globalLimit: { type: Number, default: 0 },
    rolesToGive: { type: [String], default: [] },
    logChannelID: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    useCount: { type: Number, default: 0 }
});

CustomRoleCommandSchema.index({ guildID: 1, commandName: 1 }, { unique: true });

module.exports = mongoose.model("CustomRoleCommand", CustomRoleCommandSchema);
