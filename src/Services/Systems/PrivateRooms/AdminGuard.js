const { PermissionFlagsBits } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const PrivateRoomUser = require("../../../Core/Database/PrivateRoomUser");
const Room = require("../../../Core/Database/Rooms");
const { PrivateRoomLogger } = require("./PrivateRoomUtils");

class AdminGuard {
    static async checkEntry(newState, oldState) {
        const member = newState.member;
        const channel = newState.channel;
        if (!channel || !member || member.user.bot) return;

        const roomData = await Room.findOne({ channelID: channel.id });
        if (!roomData) return;

        if (member.id === roomData.ownerID) return;

        if (roomData.members && roomData.members.includes(member.id)) return;

        const everyonePerm = channel.permissionOverwrites.cache.get(channel.guild.id);
        const isLocked = everyonePerm && everyonePerm.deny.has(PermissionFlagsBits.Connect);

        if (!isLocked) return;

        const userOverwrite = channel.permissionOverwrites.cache.get(member.id);
        const isExplicitlyAllowed = userOverwrite && userOverwrite.allow.has(PermissionFlagsBits.Connect);

        if (isExplicitlyAllowed) return;

        const ownerProfiles = await PrivateRoomUser.findOne({ userId: roomData.ownerID });
        const isProfileAllowed = ownerProfiles?.profiles.some(p =>
            (p.allowedUsers && p.allowedUsers.includes(member.id)) ||
            (p.moderators && p.moderators.includes(member.id))
        );
        if (isProfileAllowed) return;

        const hasAdminControlEnabled = ownerProfiles?.profiles.some(p => p.adminEntryControl);

        if (hasAdminControlEnabled) {
            await member.voice.disconnect("Private Room Guard: Admin Entry Control Active").catch(() => null);
            await PrivateRoomLogger.log(
                channel.guild,
                "Unauthorized Entry Blocked",
                `**${member.user.tag}** kilitli odaya (<@${roomData.ownerID}>) yetkisi olmadan giriş yaptı ve bağlantısı kesildi. (Giriş Kontrolü Aktif)`,
                "#ff0000"
            );
        }
    }
}

module.exports = AdminGuard;
