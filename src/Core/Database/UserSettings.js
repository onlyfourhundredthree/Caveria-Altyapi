const mongoose = require("mongoose");

const userSettingsSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    language: { type: String, default: null } // null means inherit from role/default
});

module.exports = mongoose.model("UserSettings", userSettingsSchema);
