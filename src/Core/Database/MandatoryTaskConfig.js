const { Schema, model } = require("mongoose");

const MandatoryTaskConfig = new Schema({
    guildID: { type: String, required: true },
    rankRoleID: { type: String, required: true }, 
    voiceGoal: { type: Number, default: 0 }, 
    publicVoiceGoal: { type: Number, default: 0 }, 
    messageGoal: { type: Number, default: 0 }, 
    inviteGoal: { type: Number, default: 0 },

    stretchPercentage: { type: Number, default: 0 }, 

    planModifiers: [{ 
        planName: { type: String },
        percentage: { type: Number }
    }],

    roleModifiers: [{ 
        roleID: { type: String },
        modifierType: { type: String, enum: ["PERCENT", "FIXED"] },
        modifierValue: { type: Number }
    }]
});

MandatoryTaskConfig.index({ guildID: 1, rankRoleID: 1 }, { unique: true });

module.exports = model("MandatoryTaskConfig", MandatoryTaskConfig);
