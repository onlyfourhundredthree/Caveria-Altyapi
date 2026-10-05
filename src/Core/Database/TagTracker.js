const { Schema, model } = require("mongoose");

const TagTrackerSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    date: { type: String, required: true }, 
    ourTagCount: { type: Number, default: 0 },    
    otherTagCount: { type: Number, default: 0 },  
    noTagCount: { type: Number, default: 0 }       
});

TagTrackerSchema.index({ guildID: 1, userID: 1, date: 1 }, { unique: true });
TagTrackerSchema.index({ guildID: 1, date: 1 });

module.exports = model("TagTracker", TagTrackerSchema);
