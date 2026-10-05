const mongoose = require("mongoose");

const bumpReminderSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    channelID: { type: String, required: true },
    remindAt: { type: Date, required: true },
});

module.exports = mongoose.model("BumpReminder", bumpReminderSchema);
