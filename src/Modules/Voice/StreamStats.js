const StreamJoinedAt = require("../../Core/Database/StreamJoinedAt");
const StreamManager = require("../../Core/Handlers/StreamManager");
const client = global.bot;

module.exports = async (oldState, newState) => {
    if ((oldState.member && oldState.member.user.bot) || (newState.member && newState.member.user.bot)) return;

    const userID = newState.id || oldState.id;
    const now = Date.now();

    const oldIsLive = oldState.streaming || oldState.selfVideo;
    const newIsLive = newState.streaming || newState.selfVideo;

    if (oldIsLive && newIsLive && newState.channelId && (oldState.selfDeaf !== newState.selfDeaf)) {
        const data = await StreamJoinedAt.findOneAndUpdate(
            { userID },
            { $set: { date: now } },
            { upsert: true }
        );

        if (data && data.date) {
            const diff = Math.min(now - data.date, 24 * 60 * 60 * 1000);
            if (diff > 0) {
                await StreamManager.saveStreamData(oldState.member, oldState.channel, diff, oldState.selfDeaf);
            }
        }
    }

    if (!oldIsLive && newIsLive && newState.channelId) {
        await StreamJoinedAt.findOneAndUpdate(
            { userID },
            { $set: { date: now } },
            { upsert: true }
        );
        return;
    }

    if (oldIsLive && !newIsLive && newState.channelId) {
        const data = await StreamJoinedAt.findOneAndDelete({ userID });
        if (data && data.date) {
            const diff = Math.min(now - data.date, 24 * 60 * 60 * 1000);
            if (diff > 0) {
                await StreamManager.saveStreamData(newState.member, newState.channel, diff, newState.selfDeaf);
            }
        }
    }

    if (oldIsLive && (oldState.channelId !== newState.channelId)) {
        const data = await StreamJoinedAt.findOneAndDelete({ userID });
        if (data && data.date) {
            const diff = Math.min(now - data.date, 24 * 60 * 60 * 1000);
            if (diff > 0) {
                await StreamManager.saveStreamData(oldState.member, oldState.channel, diff, oldState.selfDeaf);
            }
        }

        if (newIsLive && newState.channelId) {
            await StreamJoinedAt.findOneAndUpdate(
                { userID },
                { $set: { date: now } },
                { upsert: true }
            );
        }
    }
};
