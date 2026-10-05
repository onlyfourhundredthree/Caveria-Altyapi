const { Schema, model } = require("mongoose");

const roleButtonSchema = new Schema({
    guildID: { type: String, required: true },
    customId: { type: String, required: true },
    roleId: { type: String, required: true },
    actionType: { type: String, required: true }, // "give", "take", "toggle"
    successMessage: { type: String, default: "" }
});

roleButtonSchema.index({ guildID: 1, customId: 1 }, { unique: true });

module.exports = model("RoleButton", roleButtonSchema);
