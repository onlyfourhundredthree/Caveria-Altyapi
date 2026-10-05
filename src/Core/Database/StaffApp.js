const mongoose = require("mongoose");

const schema = mongoose.Schema({
    userID: { type: String, required: true },
    guildID: { type: String, required: true },
    panelId: { type: mongoose.Schema.Types.ObjectId, ref: "ApplicationPanel" },
    customId: String,
    threadID: String,
    channelID: String,
    answers: [{ question: String, answer: String }],
    currentQuestion: { type: Number, default: 0 },
    status: { type: String, default: "active", enum: ["active", "completed", "cancelled", "approved", "rejected"] },
    questionTimeout: Date,
    startedAt: { type: Date, default: Date.now },
    completedAt: Date
});

module.exports = mongoose.model("StaffApp", schema);
