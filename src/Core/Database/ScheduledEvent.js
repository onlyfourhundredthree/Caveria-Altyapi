const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,
    authorID: String,
    managerID: String,
    channelID: String, 
    announcementChannelID: String, 
    eventName: String,
    announcementText: String, // Metin kanalına giden duyuru
    eventDescription: String, // Takvime işlenen Discord etkinlik açıklaması
    autoAnnounce: { type: Boolean, default: true },
    scheduleTime: { type: Date, default: () => new Date(Date.now() + 30 * 60000) },
    isStarted: { type: Boolean, default: false },
    isFinished: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },
    announcementSent: { type: Boolean, default: false },
    deafenCheck: { type: Boolean, default: true },
    subChannels: { type: [String], default: [] },
    coverImage: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    participants: { type: Map, of: Object, default: () => new Map() },
    discordEventID: { type: String, default: null } 
});

module.exports = mongoose.model("ScheduledEvent", schema);
