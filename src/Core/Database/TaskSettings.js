const { Schema, model } = require("mongoose");

const TaskSettings = new Schema({
    guildID: { type: String },
    taskName: { type: String, required: true },
    taskCategory: {
        type: String,
        enum: ["MESSAGE", "VOICE", "PUBLIC_VOICE", "STREAM", "INVITE", "TICKET", "EVENT_MANAGE", "EVENT_PARTICIPATE", "PARTNER", "BUMP", "VOTE", "REVIEW", "REGISTER", "THREADS", "EVIDENCE", "RECRUIT", "OTHER"],
        required: true
    },
    targetCount: { type: Number, required: true },
    rewardXP: { type: Number, required: true },
    allowedRoles: [{ type: String }],
    isAuto: { type: Boolean, default: false },
    limitType: { type: String, enum: ["DAILY", "WEEKLY", "NONE"], default: "NONE" },
    limitCount: { type: Number, default: 0 },
    roleLimits: [{
        roleID: { type: String },
        limitCount: { type: Number },
        stretchLimit: { type: Number, default: 0 }
    }],
    active: { type: Boolean, default: true }
});

module.exports = model("TaskSettings", TaskSettings);
