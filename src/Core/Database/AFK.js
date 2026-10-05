const mongoose = require("mongoose");

const AFKSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    reason: { type: String, default: "Belirtilmedi" },
    date: { type: Number, default: Date.now }
});

module.exports = mongoose.model("AFK", AFKSchema);
