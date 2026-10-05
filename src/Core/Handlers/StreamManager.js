const StreamJoinedAt = require("../Database/StreamJoinedAt");
const StatHistory = require("../Database/StatHistory");
const ConfigManager = require("./ConfigManager");
const TaskManager = require("./TaskManager");
const Settings = require("../../../Settings.json");
const moment = require("moment-timezone");

class StreamManager {

    static async getLiveTime(userID, persistentTime = 0) {
        const session = await StreamJoinedAt.findOne({ userID });
        if (session && session.date) {
            const liveDiff = Date.now() - session.date;
            return persistentTime + Math.max(0, liveDiff);
        }
        return persistentTime;
    }


    static async saveCheckpoint(member, channel) {
        const session = await StreamJoinedAt.findOne({ userID: member.id });
        if (!session || !session.date) return;

        const diff = Date.now() - session.date;
        if (diff < 30000) return;

        await this.saveStreamData(member, channel, diff);

        await StreamJoinedAt.updateOne(
            { _id: session._id },
            { $set: { date: Date.now() } }
        ).catch(() => {});
    }

    static async saveStreamData(member, channel, diff, isDeafened = false) {
        if (!member || !channel || !channel.id || diff <= 0) return;

        const MAX_DIFF = 12 * 3600000;
        if (diff > MAX_DIFF) {
            console.warn(`[STREAM-CAP] User ${member.id} had a diff of ${diff}ms, capping to 12h.`);
            diff = MAX_DIFF;
        }

        const userID = member.id;
        const channelID = channel.id;
        const todayDate = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");

        const allowedChannels = ConfigManager.get("Channels.PublicVoices") || [];
        const privateCategoryId = ConfigManager.get("privateRooms.categoryId");

        const isOther = allowedChannels.length > 0 && !allowedChannels.includes(channel.id);
        const isPrivate = privateCategoryId && channel.parentId === privateCategoryId;

        let streamMinutes = Math.floor(diff / 60000);

        if (isDeafened || isPrivate) {
            streamMinutes = 0;
        } else if (channel.userLimit > 0) {
            streamMinutes = Math.floor(streamMinutes / 2);
        }

        if (streamMinutes > 0) {
            await TaskManager.progressTask(member.guild, member, "STREAM", streamMinutes, null, isOther);
        }

        await StatHistory.findOneAndUpdate(
            { guildID: Settings.Main.GuildID, userID: userID, date: todayDate },
            {
                $inc: {
                    "streamer.total": diff,
                    [`streamer.channels.${channelID}`]: diff
                }
            },
            { upsert: true }
        );
    }
}

module.exports = StreamManager;
