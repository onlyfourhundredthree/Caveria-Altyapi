const { Schema, model } = require("mongoose");

const StaffUser = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },

    totalXP: { type: Number, default: 0 },
    weeklyXP: { type: Number, default: 0 },
    overflowXP: { type: Number, default: 0 },
    currentLevel: { type: Number, default: 1 },
    serverOperationXP: { type: Number, default: 0 },

    totalMessages: { type: Number, default: 0 },
    totalVoiceMinutes: { type: Number, default: 0 },
    totalPublicVoiceMinutes: { type: Number, default: 0 },
    totalInvites: { type: Number, default: 0 },

    activeTasks: [{
        taskID: { type: Schema.Types.ObjectId, ref: "TaskSettings" },
        currentCount: { type: Number, default: 0 },
        otherChannelCount: { type: Number, default: 0 }, 
        startedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date }
    }],

    completedTasks: { type: Number, default: 0 },
    categoryStats: [{
        category: { type: String },
        count: { type: Number, default: 0 }
    }],

    lastMessageAt: { type: Date, default: Date.now },
    dailyPassiveXP: {
        message: { type: Number, default: 0 },
        voice: { type: Number, default: 0 },
        date: { type: String } 
    },

    history: [{
        action: String,
        amountXP: Number,
        date: { type: Date, default: Date.now },
        reason: String
    }],
    cooldowns: [{
        category: String,
        expiresAt: Date
    }],
    staffStartAt: { type: Date, default: null },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    isClaimable: { type: Boolean, default: false }
});

StaffUser.index({ guildID: 1, userID: 1 }, { unique: true });
StaffUser.index({ totalXP: -1 });
StaffUser.index({ weeklyXP: -1 });

module.exports = model("StaffUser", StaffUser);
