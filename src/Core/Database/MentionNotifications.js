const { Schema, model } = require("mongoose");

const mentionNotificationSchema = new Schema({
    messageID: { type: String, required: true, unique: true },
    guildID: { type: String, required: true },
    channelID: { type: String, required: true },
    authorID: { type: String, required: true },
    authorTag: { type: String, required: true },
    authorAvatar: { type: String, default: "" },
    content: { type: String, default: "" },
    mentionedUsers: [{ type: String }],
    createdAt: { type: Date, default: Date.now, expires: 86400 }
});

module.exports = model("MentionNotifications", mentionNotificationSchema);
