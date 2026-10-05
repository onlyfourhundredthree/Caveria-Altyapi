const { Schema, model } = require("mongoose");

const StaffPrivateNote = new Schema({
    guildID: { type: String, required: true },
    memberID: { type: String, required: true },
    authorID: { type: String, required: true },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

StaffPrivateNote.index({ guildID: 1, memberID: 1 });

module.exports = model("StaffPrivateNote", StaffPrivateNote);
