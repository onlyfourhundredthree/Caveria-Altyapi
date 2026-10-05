const { Schema, model } = require("mongoose");

const schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: String, default: "System" },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = model("SystemSettings", schema);
