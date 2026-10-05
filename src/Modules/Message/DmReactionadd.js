const DMThread = require("../../Core/Database/DMMessages");
const client = global.bot;

const FORUM_CHANNEL_ID = "1417258771985731677";

module.exports = async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) reaction = await reaction.fetch();

        const message = reaction.message;
        let threadData;

        if (!message.guild) {
            const allThreads = await DMThread.find({});
            threadData = allThreads.find(td =>
                [...td.messages.values()].some(m => m.dmMessageID === message.id)
            );
        } else if (message.channel.isThread() && message.channel.parentId === FORUM_CHANNEL_ID) {
            threadData = await DMThread.findOne({ threadID: message.channel.id });
        }

        if (!threadData) return;


        const msgPair = [...threadData.messages.values()].find(
            m => String(m.dmMessageID) === String(message.id) || String(m.forumMessageID) === String(message.id)
        );
        if (!msgPair) return;

        if (String(msgPair.dmMessageID) === String(message.id)) {
            const forumChannel = await client.channels.fetch(threadData.threadID).catch(() => null);
            if (!forumChannel) return;

            const forumMsg = await forumChannel.messages.fetch(msgPair.forumMessageID).catch(() => null);
            if (!forumMsg) return;

            await forumMsg.react(reaction.emoji);
        }

        if (String(msgPair.forumMessageID) === String(message.id)) {
            const userDM = await client.users.fetch(threadData.userID).catch(() => null);
            if (!userDM) return;

            const dmChannel = userDM.dmChannel || await userDM.createDM();
            const dmMsg = await dmChannel.messages.fetch(msgPair.dmMessageID).catch(() => null);
            if (!dmMsg) return;

            await dmMsg.react(reaction.emoji);
        }

    } catch (err) {
        console.error("ReactionAdd sırasında hata:", err);
    }
};
