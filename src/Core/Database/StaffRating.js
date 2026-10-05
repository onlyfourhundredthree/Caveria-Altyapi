const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: { type: String, required: true },
    staffID: { type: String, required: true },
    userID: { type: String, required: true },
    actionType: { type: String, required: true }, 
    rating: { type: Number, required: true }, 
    comment: { type: String, default: "" },
    date: { type: Date, default: Date.now }
});

module.exports = model("StaffRating", schema);
