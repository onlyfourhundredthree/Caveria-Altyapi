const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    itemName: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    status: { type: String, default: "Bekliyor" },
    orderDate: { type: Date, default: Date.now },
    deliveredBy: { type: String, default: null },
    deliveredAt: { type: Date, default: null }
});

module.exports = model("MarketOrder", schema);
