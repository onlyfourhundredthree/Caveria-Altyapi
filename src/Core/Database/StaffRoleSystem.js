const { Schema, model } = require("mongoose");

const StaffRoleSystem = new Schema({
    guildID: { type: String },
    roleID: { type: String, required: true },
    rankName: { type: String },
    requiredXP: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    autoPromotion: { type: Boolean, default: true },
    extraRoles: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    maxServerXP: { type: Number, default: 0 },

    xpMultiplierRoles: [{
        roleID: { type: String },
        multiplier: { type: Number, default: 1.0 }
    }],

    responsibilityRoles: { type: [String], default: [] }, 
    responsibilityLimit: { type: Number, default: 0 }, 
    responsibilityPenalty: { type: Number, default: 0 }, 

    mandatoryWeeks: { type: Number, default: 2 } 
});

StaffRoleSystem.index({ guildID: 1, requiredXP: 1 });
StaffRoleSystem.index({ guildID: 1, sortOrder: 1 });

module.exports = model("StaffRoleSystem", StaffRoleSystem);
