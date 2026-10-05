const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    coin: { type: Number, default: 0 },
    inventory: { type: Array, default: [] },
    marriage: {
        married: { type: Boolean, default: false },
        partnerID: { type: String, default: null },
        date: { type: Date, default: null },
        ring: { type: String, default: null },
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 }
    },
    lastMessageCoin: { type: Number, default: 0 },
    voiceWaitMs: { type: Number, default: 0 },
});

schema.index({ guildID: 1, userID: 1 }, { unique: true });
schema.index({ guildID: 1, coin: -1 });

module.exports = model("Economy", schema);
