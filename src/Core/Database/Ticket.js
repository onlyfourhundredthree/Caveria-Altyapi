const mongoose = require("mongoose");

const TicketSchema = mongoose.Schema({
    guildID: { type: String, default: "" },
    userID: { type: String, default: "" },
    channelID: { type: String, default: "" },
    ticketID: { type: String, default: "" },
    panelId: { type: String, default: "" }, // Hangi panelden açıldı
    reason: { type: String, default: "" },
    active: { type: Boolean, default: true },
    staffID: { type: String, default: "" },
    permittedUsers: { type: [String], default: [] },
    resolved: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
    subject: { type: String, default: "" },
    problem: { type: String, default: "" },
    solution: { type: String, default: "" },
    result: { type: String, default: "" },
    messageID: { type: String, default: "" }
});

module.exports = mongoose.model("Tickets", TicketSchema);
