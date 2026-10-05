const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    background: { type: String, default: null }, 
});

schema.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = model("UserBanners", schema);
