const mongoose = require('mongoose');

const GiveawayStatsSchema = new mongoose.Schema({
    giveawayId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    messageCount: {
        type: Number,
        default: 0
    },
    voiceTime: {
        type: Number,
        default: 0
    },
    voteCount: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    },
    inviteCount: {
        type: Number,
        default: 0
    }
});



module.exports = mongoose.model('GiveawayStats', GiveawayStatsSchema);
