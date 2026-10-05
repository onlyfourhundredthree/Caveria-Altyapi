const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: String,
    userID: String,
    history: { type: Array, default: [] }
});

module.exports = model("welcomeUsers", schema);
