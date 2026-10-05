const PermanentRoom = require("../../Core/Database/PermanentRoom");
const PermanentRoomProfile = require("../../Core/Database/PermanentRoomProfile");

const voiceTimes = new Map(); 

module.exports = async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) return;

    const member = newState.member || oldState.member;
    if (!member) return;

    const guildID = newState.guild.id || oldState.guild.id;
    const userID = member.id;

    if (!oldState.channelId && newState.channelId) {
        const room = await PermanentRoom.findOne({ guildID, channelID: newState.channelId });
        if (room) {
            const isOwner = room.ownerID === userID;
            const isTeamMember = room.teamMembers && room.teamMembers.includes(userID);
            const isModerator = room.moderators && room.moderators.includes(userID);
            if (!isOwner && !isTeamMember && !isModerator && member.user.bot === false) {
                const profile = await PermanentRoomProfile.findOne({ userId: room.ownerID });
                if (profile && profile.profiles && profile.profiles.length > 0 && profile.profiles[0].adminEntryControl) {
                    await member.voice.disconnect("Kalıcı Oda: Admin Korumalı Kilit Aktif").catch(() => null);
                    return;
                }
            }
            voiceTimes.set(userID, { start: Date.now(), channelID: newState.channelId });
        }
    }

    if (oldState.channelId && (!newState.channelId || oldState.channelId !== newState.channelId)) {
        const session = voiceTimes.get(userID);
        if (session && session.channelID === oldState.channelId) {
            const duration = Date.now() - session.start;
            await PermanentRoom.findOneAndUpdate(
                { guildID, channelID: oldState.channelId },
                { $inc: { weeklyVoiceTime: duration } }
            );
            voiceTimes.delete(userID);
        }

        if (newState.channelId) {
            const room = await PermanentRoom.findOne({ guildID, channelID: newState.channelId });
            if (room) {
                const isOwner = room.ownerID === userID;
                const isTeamMember = room.teamMembers && room.teamMembers.includes(userID);
                const isModerator = room.moderators && room.moderators.includes(userID);
                if (!isOwner && !isTeamMember && !isModerator && member.user.bot === false) {
                    const profile = await PermanentRoomProfile.findOne({ userId: room.ownerID });
                    if (profile && profile.profiles && profile.profiles.length > 0 && profile.profiles[0].adminEntryControl) {
                        await member.voice.disconnect("Kalıcı Oda: Admin Korumalı Kilit Aktif").catch(() => null);
                        return;
                    }
                }
                voiceTimes.set(userID, { start: Date.now(), channelID: newState.channelId });
            }
        }
    }
};

module.exports.voiceTimes = voiceTimes;

module.exports.syncActiveRooms = async (client) => {
    try {
        const rooms = await PermanentRoom.find({ status: "ACTIVE" }).lean();
        for (const room of rooms) {
            const guild = client.guilds.cache.get(room.guildID);
            if (!guild) continue;
            const channel = guild.channels.cache.get(room.channelID);
            if (!channel) continue;

            for (const [memberID, member] of channel.members) {
                if (member.user.bot) continue;
                if (!voiceTimes.has(memberID)) {
                    voiceTimes.set(memberID, { start: Date.now(), channelID: room.channelID });
                }
            }
        }

        setInterval(async () => {
            const now = Date.now();
            const updates = new Map();

            for (const [memberID, session] of voiceTimes.entries()) {
                const duration = now - session.start;
                if (duration > 0) {
                    const current = updates.get(session.channelID) || 0;
                    updates.set(session.channelID, current + duration);
                    session.start = now; 
                }
            }

            for (const [channelID, totalDuration] of updates.entries()) {
                await PermanentRoom.findOneAndUpdate(
                    { channelID: channelID },
                    { $inc: { weeklyVoiceTime: totalDuration } }
                ).catch(() => {});
            }
        }, 30 * 60 * 1000);

    } catch (e) {
        console.error("[PermanentRoomVoiceTracker] Sync error:", e);
    }
};
