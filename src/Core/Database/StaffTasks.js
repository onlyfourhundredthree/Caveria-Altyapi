const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    userID: String,
    date: { type: Number, default: () => Date.now() }, 
    partners: { type: Number, default: 0 },
    eventsManaged: { type: Number, default: 0 },
    eventsParticipated: { type: Number, default: 0 },
    bumps: { type: Number, default: 0 }
});

module.exports = mongoose.model("StaffTasks", schema);
