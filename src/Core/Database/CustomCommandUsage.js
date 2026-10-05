const mongoose = require("mongoose");

const CustomCommandUsageSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    commandName: { type: String, required: true },
    managerID: { type: String, required: true },
    givenTo: { type: [String], default: [] } // Rol verilen üyelerin ID listesi
});

CustomCommandUsageSchema.index({ guildID: 1, commandName: 1, managerID: 1 }, { unique: true });

module.exports = mongoose.model("CustomCommandUsage", CustomCommandUsageSchema);
