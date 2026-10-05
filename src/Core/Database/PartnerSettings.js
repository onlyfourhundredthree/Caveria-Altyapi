const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: { type: String, required: true },
    lastMessageId: { type: String, default: "" },
});

module.exports = model("PartnerSettings", schema);
