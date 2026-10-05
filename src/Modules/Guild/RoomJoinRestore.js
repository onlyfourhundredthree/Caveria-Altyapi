
const PermanentRoom = require("../../Core/Database/PermanentRoom");
const PrivateRoomUser = require("../../Core/Database/PrivateRoomUser");
const Room = require("../../Core/Database/Rooms");

module.exports = async (member) => {
    try {
        const guild = member.guild;

        const permRooms = await PermanentRoom.find({ guildID: guild.id });
        for (const room of permRooms) {
            let shouldUpdate = false;
            let allowFlags = [];
            let isTeamMember = false;
            
            if (room.teamMembers && room.teamMembers.includes(member.id)) {
                allowFlags = ['Connect', 'ViewChannel', 'Speak', 'Stream', 'UseVAD'];
                isTeamMember = true;
                shouldUpdate = true;
            }
            
            if (room.moderators && room.moderators.includes(member.id)) {
                allowFlags = [...allowFlags, 'Connect', 'Speak', 'Stream', 'MuteMembers', 'DeafenMembers', 'MoveMembers', 'ViewChannel', 'UseVAD'];
                shouldUpdate = true;
            }

            if (shouldUpdate && room.channelID) {
                const channel = guild.channels.cache.get(room.channelID);
                if (channel) {
                    await channel.permissionOverwrites.edit(member.id, {
                        Connect: true,
                        ViewChannel: true,
                        Speak: true,
                        Stream: true,
                        UseVAD: true,
                        ...(room.moderators && room.moderators.includes(member.id) ? {
                            MuteMembers: true,
                            DeafenMembers: true,
                            MoveMembers: true
                        } : {})
                    }).catch(() => {});
                }

                if (isTeamMember && room.teamRoleEnabled && room.teamRoleID) {
                    const role = guild.roles.cache.get(room.teamRoleID);
                    if (role) {
                        await member.roles.add(role).catch(() => {});
                    }
                }
            }
        }

        const activeRooms = await Room.find({});
        for (const activeRoom of activeRooms) {
            const channel = guild.channels.cache.get(activeRoom.channelID);
            if (!channel) continue;

            const ownerProfile = await PrivateRoomUser.findOne({ userId: activeRoom.ownerID });
            if (!ownerProfile) continue;

            const activeProfileId = ownerProfile.lastUsedProfileId;
            const profile = ownerProfile.profiles.find(p => p.profileId === activeProfileId) || ownerProfile.profiles[0];
            if (!profile) continue;

            if (profile.allowedUsers && profile.allowedUsers.includes(member.id)) {
                await channel.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true }).catch(() => {});
            }
            if (profile.moderators && profile.moderators.includes(member.id)) {
                await channel.permissionOverwrites.edit(member.id, { Connect: true, ViewChannel: true, MuteMembers: true, DeafenMembers: true, MoveMembers: true }).catch(() => {});
            }
            if (profile.blockedUsers && profile.blockedUsers.includes(member.id)) {
                await channel.permissionOverwrites.edit(member.id, { Connect: false, ViewChannel: false }).catch(() => {});
            }
        }
    } catch (e) {
        console.error("RoomJoinRestore error:", e);
    }
};
