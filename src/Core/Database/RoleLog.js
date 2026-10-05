const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    userID: String,
    adminID: String,
    roleID: String,
    type: String, 
    method: { type: String, default: "MANUAL" }, 
    date: { type: Number, default: Date.now }
});

schema.index({ guildID: 1, userID: 1 });
schema.index({ date: -1 });

module.exports = mongoose.model("RoleLog", schema);
