const mongoose = require("mongoose");

const TicketBanSchema = mongoose.Schema({
    guildID: { type: String, default: "" },
    userID: { type: String, default: "" },
    staffID: { type: String, default: "" },
    reason: { type: String, default: "" },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TicketBans", TicketBanSchema);
