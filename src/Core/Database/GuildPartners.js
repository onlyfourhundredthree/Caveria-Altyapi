const { Schema, model } = require("mongoose");

const guildPartnerSchema = new Schema({
    guildID: { type: String, required: true },
    userID: { type: String },
    guildName: { type: String, default: null },
    avatar: { type: String, default: null },
    reason: { type: String, default: "Belirtilmedi" },
    lastPartnerAt: { type: Date, default: null },
    banned: { type: Boolean, default: false },
    pendingText: { type: String, default: null },
    inviteCode: { type: String, default: null },
    lang: { type: String, default: "tr" }
});

guildPartnerSchema.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = model("GuildPartners", guildPartnerSchema);
