const { Schema, model } = require("mongoose");

const schema = new Schema({
    guildID: String,
    messageID: String,
    authorID: String,
    content: String,
    likes: { type: [String], default: [] }, 
    retweets: { type: Number, default: 0 },
    isRetweet: { type: Boolean, default: false },
    originalImageUrl: String,
    date: { type: Number, default: Date.now() }
});

schema.index({ messageID: 1 }, { unique: true });

module.exports = model("TwitterTweet", schema);
