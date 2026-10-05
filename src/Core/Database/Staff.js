const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    userID: String,
    staffID: String,
    initiatorID: { type: String, default: "" },
    startTime: { type: Number, default: Date.now() },
    endTime: { type: Number, default: null },
    active: { type: Boolean, default: true },
    roles: [String],

    settings: {
        dmEnabled: { type: Boolean, default: true }
    },

    leftRoles: { type: Array, default: [] },
    leftDate: { type: Number, default: null },
});

module.exports = mongoose.model("Staff", schema);
