const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    createdAt: { type: Number, default: Date.now() },
    backupType: { type: String, default: "manual" }, 
    roleCount: { type: Number, default: 0 },
    channelCount: { type: Number, default: 0 },
    emojiCount: { type: Number, default: 0 },
    stickerCount: { type: Number, default: 0 },

    roles: [{
        id: String,
        name: String,
        color: String,
        hoist: Boolean,
        position: Number,
        permissions: String, 
        mentionable: Boolean,
        icon: String, 
        iconHash: String,
        members: [String] 
    }],

    channels: [{
        id: String,
        name: String,
        type: { type: Number }, 
        position: Number,
        parentId: String, 
        topic: String,
        nsfw: Boolean,
        rateLimitPerUser: Number, 
        userLimit: Number, 
        bitrate: Number,
        permissionOverwrites: [{
            id: String, 
            type: { type: Number }, 
            allow: String,
            deny: String
        }],
        messages: [{
            authorId: String,
            username: String,
            avatar: String,
            content: String,
            embeds: [Object],
            attachments: [Object],
            createdAt: Number
        }]
    }],

    emojis: [{
        id: String,
        name: String,
        url: String,
        roles: [String] 
    }],
    stickers: [{
        id: String,
        name: String,
        url: String,
        tags: String,
        description: String
    }],

    guild: {
        name: String,
        iconURL: String,
        bannerURL: String,
        splashURL: String,
        description: String,
        afkChannelId: String,
        afkTimeout: Number,
        systemChannelId: String,
        verificationLevel: Number,
        defaultMessageNotifications: Number,
        explicitContentFilter: Number,
        rulesChannelId: String,
        publicUpdatesChannelId: String,
        preferredLocale: String,
        vanityURLCode: String 
    }
});

schema.index({ guildID: 1, createdAt: -1 });
schema.index({ guildID: 1, backupType: 1, createdAt: -1 });

module.exports = mongoose.model("GuildBackup", schema);
