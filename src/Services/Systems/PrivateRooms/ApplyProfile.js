const PrivateRoomUser = require("../../../Core/Database/PrivateRoomUser");
const PermissionManager = require("./Permissions");

class ProfileApplier {
    static async apply(channel, ownerMember, profileId) {
        const userData = await PrivateRoomUser.findOne({ userId: ownerMember.id });
        if (!userData) return false;

        const profile = userData.profiles.find(p => p.profileId === profileId);
        if (!profile) return false;

        if (profile.channelName) {
            await channel.setName(profile.channelName).catch(() => null);
        }

        await PermissionManager.syncProfilePermissions(channel, ownerMember, profile);

        return true;
    }

    static async saveCurrentToProfile(channel, ownerMember, profileName) {
    }
}

module.exports = ProfileApplier;
