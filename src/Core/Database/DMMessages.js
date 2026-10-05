const { Schema, model } = require("mongoose");

const dmThreadSchema = new Schema({
    userID: { type: String, required: true, unique: true },
    threadID: { type: String, required: true },
    messages: {
        type: Map,
        of: new Schema({
            dmMessageID: String,
            forumMessageID: String
        }),
        default: {}
    }
});

module.exports = model("DMMessages", dmThreadSchema);
