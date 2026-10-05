const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { PrivateRoomManagement } = require("../../Services/Systems/PrivateRooms/Management");
const AdminGuard = require("../../Services/Systems/PrivateRooms/AdminGuard");
const { joinCooldowns } = require("../../Services/Systems/PrivateRooms/PrivateRoomUtils");

module.exports = async (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    const config = ConfigManager.get("privateRooms");
    const createChannelId = config.createChannelId;

    if (newState.channelId === createChannelId) {
        if (joinCooldowns.isCoolingDown(member.id)) {
            await member.voice.disconnect("Anti-Spam").catch(() => null);
            return;
        }
        joinCooldowns.setCooldown(member.id, config.antiSpamCooldown || 5000);
        await PrivateRoomManagement.createRoom(member);
        return;
    }

    if (newState.channelId && newState.channelId !== oldState.channelId) {
        await AdminGuard.checkEntry(newState, oldState);
    }

    if (oldState.channel) {
        await PrivateRoomManagement.handleEmptyRoom(oldState.channel);
    }

    if (newState.channel) {
        await PrivateRoomManagement.handleEmptyRoom(newState.channel);
    }
};
