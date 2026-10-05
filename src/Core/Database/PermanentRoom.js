const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    ownerID: String,
    managerID: String,
    channelID: String,
    teamMembers: [String],
    moderators: [String],
    channelName: String,
    totalCount: Number,
    status: { type: String, default: "ACTIVE" }, 
    weeklyVoiceTime: { type: Number, default: 0 },
    lastActivityCheck: { type: Number, default: Date.now() },
    createdAt: { type: Number, default: Date.now() },
    lockDate: Number,
    failedChecks: { type: Number, default: 0 },
    teamRoleID: { type: String, default: null },
    teamRoleEnabled: { type: Boolean, default: false },
    canCreateTeamRole: { type: Boolean, default: false },
    panelMessageID: { type: String, default: null }
});

module.exports = mongoose.model("PermanentRoom", schema);
