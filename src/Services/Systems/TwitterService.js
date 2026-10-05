const TwitterUser = require("../../Core/Database/TwitterUser");

class TwitterService {
    async toggleFollow(guildID, followerID, targetID) {
        if (followerID === targetID) return { success: false, message: "Kendini takip edemezsin!" };

        let targetUser = await TwitterUser.findOne({ guildID, userID: targetID });
        let currentUser = await TwitterUser.findOne({ guildID, userID: followerID });

        if (!targetUser) targetUser = await TwitterUser.create({ guildID, userID: targetID });
        if (!currentUser) currentUser = await TwitterUser.create({ guildID, userID: followerID });

        const isFollowing = targetUser.followers.includes(followerID);

        if (isFollowing) {
            await TwitterUser.updateOne({ guildID, userID: targetID }, { $pull: { followers: followerID } });
            await TwitterUser.updateOne({ guildID, userID: followerID }, { $pull: { following: targetID } });
            return { success: true, status: 'unfollowed', message: `<@${targetID}> kullanıcısını takipten çıkardın.` };
        } else {
            await TwitterUser.updateOne({ guildID, userID: targetID }, { $push: { followers: followerID } });
            await TwitterUser.updateOne({ guildID, userID: followerID }, { $push: { following: targetID } });
            return { success: true, status: 'followed', message: `<@${targetID}> kullanıcısını takip etmeye başladın!` };
        }
    }
}

module.exports = new TwitterService();
