const { Schema, model } = require("mongoose");

const StaffGlobalSettings = new Schema({
    guildID: { type: String, required: true, unique: true },
    responsibilityRoles: { type: [String], default: [] }, 
    stretchRoles: { type: [String], default: [] },       
    stretchPlans: [{                                     
        name: { type: String, required: true },
        roleIDs: { type: [String], default: [] }
    }],
    xpMultipliers: {
        type: [{
            roleID: String,
            multiplier: Number
        }],
        default: []
    }
});

module.exports = model("StaffGlobalSettings", StaffGlobalSettings);
