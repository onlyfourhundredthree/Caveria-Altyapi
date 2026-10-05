const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    rankName: String,
    roleID: String,
    displayName: String,
    sortOrder: { type: Number, default: 0 },
    requirements: {
        invites: { type: Number, default: 0 },
        responsibilities: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        voiceTime: { type: Number, default: 0 }, 
        eventsParticipated: { type: Number, default: 0 },
        eventsManaged: { type: Number, default: 0 },
        randomInteractions: { type: Number, default: 0 },
        staffRecruits: { type: Number, default: 0 },
        ticketSolved: { type: Number, default: 0 },
        mentoring: { type: Number, default: 0 },
        partners: { type: Number, default: 0 },
        bumps: { type: Number, default: 0 },
        roleAbility: { type: [String], default: [] }
    },
    recoveryRequirements: {
        messageCount: { type: Number, default: 0 },
        voiceTime: { type: Number, default: 0 }, 
        eventsParticipated: { type: Number, default: 0 },
        eventsManaged: { type: Number, default: 0 },
        staffRecruits: { type: Number, default: 0 },
        partners: { type: Number, default: 0 },
        invites: { type: Number, default: 0 }
    }
});

module.exports = mongoose.model("StaffRanks", schema);
