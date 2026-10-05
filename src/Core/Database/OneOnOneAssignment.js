const { Schema, model } = require("mongoose");

const OneOnOneAssignment = new Schema({
    guildID: { type: String, required: true },
    managerID: { type: String, required: true },
    assignedMemberIDs: [{ type: String }],
    history: [{
        memberID: String,
        action: { type: String, enum: ["assigned", "unassigned"] },
        date: { type: Date, default: Date.now },
        changedBy: String
    }],
    updatedAt: { type: Date, default: Date.now }
});

OneOnOneAssignment.index({ guildID: 1, managerID: 1 }, { unique: true });
OneOnOneAssignment.index({ guildID: 1, assignedMemberIDs: 1 });

module.exports = model("OneOnOneAssignment", OneOnOneAssignment);
