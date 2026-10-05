const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    bio: { type: String, default: "Henüz bir biyografi eklenmemiş." },
    followers: { type: [String], default: [] },
    following: { type: [String], default: [] },
    likes: { type: Number, default: 0 },
    tweets: { type: Number, default: 0 },
    verified: { type: Boolean, default: false }
});

schema.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = model("TwitterUser", schema);
