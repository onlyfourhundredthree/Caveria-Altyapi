const { Schema, model } = require("mongoose");

const statDetailSchema = new Schema({
    total: { type: Number, default: 0 },
    channels: { type: Map, of: Number, default: {} }
}, { _id: false });

const schema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    date: { type: String, required: true }, 
    message: { type: statDetailSchema, default: () => ({}) },
    voice: { type: statDetailSchema, default: () => ({}) },
    streamer: { type: statDetailSchema, default: () => ({}) },
    ticket: { type: Number, default: 0 },
    invite: { type: Number, default: 0 },
    inviteBonus: { type: Number, default: 0 },
    inviteFake: { type: Number, default: 0 },
    inviteLeave: { type: Number, default: 0 },
    register: { type: Number, default: 0 },
    invites: { type: Array, default: [] }, 
    partner: { type: Number, default: 0 },
    event: { type: Number, default: 0 },
    punishment: { type: Number, default: 0 },
    bump: { type: Number, default: 0 },
    respect: { type: Number, default: 0 },
    task: { type: Number, default: 0 },
    partnerHistory: { type: Array, default: [] }, 
    cooldowns: {
        respect: { type: Date, default: null },
        ticket: { type: Date, default: null }
    }
});

schema.index({ guildID: 1, userID: 1, date: 1 }, { unique: true });
schema.index({ guildID: 1, date: 1 });
schema.index({ guildID: 1 });

module.exports = model("StatHistory", schema);
