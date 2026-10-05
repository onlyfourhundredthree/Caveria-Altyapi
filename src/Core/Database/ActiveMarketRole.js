const mongoose = require("mongoose");

const ActiveMarketRoleSchema = new mongoose.Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    roleID: { type: String, required: true },
    expireAt: { type: Date, default: null } 
});

module.exports = mongoose.model("ActiveMarketRole", ActiveMarketRoleSchema);
