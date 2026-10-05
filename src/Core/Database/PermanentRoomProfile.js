const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
    profileId: { type: String, required: true },
    profileName: { type: String, required: true },
    channelName: { type: String, default: "" },
    userLimit: { type: Number, default: 0 },
    allowedUsers: { type: [String], default: [] },
    blockedUsers: { type: [String], default: [] },
    moderators: { type: [String], default: [] },
    permissions: {
        connect: { type: Boolean, default: true },
        speak: { type: Boolean, default: true },
        video: { type: Boolean, default: true },
        stream: { type: Boolean, default: true }
    },
    adminEntryControl: { type: Boolean, default: false }
});

const PermanentRoomProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    profiles: [ProfileSchema],
    lastUsedProfileId: { type: String, default: null }
});

module.exports = mongoose.model("PermanentRoomProfile", PermanentRoomProfileSchema);
