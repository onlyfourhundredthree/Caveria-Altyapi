const mongoose = require("mongoose");

const schema = mongoose.Schema({
    id: { type: String, required: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    mvpCount: { type: Number, default: 0 },
    elo: { type: Number, default: 1000 },
    rolesPlayed: { type: Object, default: {} }
});

module.exports = mongoose.model("VampireProfile", schema);
