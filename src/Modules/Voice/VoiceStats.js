const VoiceJoined = require("../../Core/Database/Voice.JoinedAt");
const GiveawayStats = require("../../Core/Database/GiveawayStats");
const VoiceManager = require("../../Core/Handlers/VoiceManager");
const client = global.bot;

module.exports = async (oldState, newState) => {
    if ((oldState.member && oldState.member.user.bot) || (newState.member && newState.member.user.bot)) return;

    const userID = newState.id || oldState.id;
    const now = Date.now();

    if (!oldState.channelId && newState.channelId) {
        await VoiceJoined.findOneAndUpdate(
            { userID },
            { $set: { date: now } },
            { upsert: true }
        );
        return;
    }

    if (oldState.channelId && !newState.channelId) {
        const data = await VoiceJoined.findOneAndDelete({ userID });
        if (data && data.date) {
            let diff = now - data.date;
            if (diff <= 0) return;
            diff = Math.min(diff, 24 * 60 * 60 * 1000);

            await VoiceManager.saveVoiceData(oldState.member, oldState.channel, diff, oldState.selfDeaf);

            const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
            await InviteClaimManager.updateProgress(oldState.guild.id, userID, "VOICE", Math.floor(diff / 60000));
        }
    }
    else if (oldState.channelId && newState.channelId && (oldState.channelId !== newState.channelId || oldState.selfDeaf !== newState.selfDeaf)) {
        const data = await VoiceJoined.findOneAndUpdate(
            { userID },
            { $set: { date: now } },
            { upsert: true }
        );

        if (data && data.date) {
            let diff = now - data.date;
            if (diff <= 0) return;
            diff = Math.min(diff, 24 * 60 * 60 * 1000);

            await VoiceManager.saveVoiceData(oldState.member, oldState.channel, diff, oldState.selfDeaf);

            const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
            await InviteClaimManager.updateProgress(oldState.guild.id, userID, "VOICE", Math.floor(diff / 60000));
        }
    }
};
