const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: { type: String, required: true },
    name: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    questions: [{ question: String }],
    answerTimeLimit: { type: Number, default: 10 },
    approveRoles: [String],
    giveRoles: [String],
    panelMessage: { type: String, default: "" },
    active: { type: Boolean, default: true }
});

module.exports = mongoose.model("ApplicationPanel", schema);
