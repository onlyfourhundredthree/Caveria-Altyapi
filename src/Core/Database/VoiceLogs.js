const mongoose = require("mongoose");

const voiceSchema = new mongoose.Schema({
    userID: String,
    adminID: String,
    oldChannel: String,
    newChannel: String,
    type: String, 
    date: { type: Number, default: Date.now }
});

voiceSchema.index({ userID: 1 });
voiceSchema.index({ date: -1 });

module.exports = mongoose.model('VoiceLogs', voiceSchema);
