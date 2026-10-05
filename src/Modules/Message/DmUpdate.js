const { WebhookClient } = require("discord.js");
const client = global.bot;
const DMThread = require("../../Core/Database/DMMessages");

const FORUM_CHANNEL_ID = "1417258771985731677";

module.exports = async (oldMsg, newMsg) => {
    try {
        if (newMsg.partial) newMsg = await newMsg.fetch();
        if (newMsg.author?.bot) return;

        let threadData;
        if (!newMsg.guild) {
            threadData = await DMThread.findOne({ userID: newMsg.author.id });
        } else if (newMsg.channel.isThread() && newMsg.channel.parentId === FORUM_CHANNEL_ID) {
            threadData = await DMThread.findOne({ threadID: newMsg.channel.id });
        }

        if (!threadData) return;


        const msgPair = [...threadData.messages.values()].find(
            m => String(m.dmMessageID) === String(newMsg.id) || String(m.forumMessageID) === String(newMsg.id)
        );
        if (!msgPair) return;

        if (String(msgPair.dmMessageID) === String(newMsg.id)) {
            const forumChannel = client.channels.cache.get(FORUM_CHANNEL_ID);
            if (!forumChannel) return

            let webhook = (await forumChannel.fetchWebhooks()).find(w => w.name === "tojimaniac");
            if (!webhook) webhook = await forumChannel.createWebhook({ name: "tojimaniac" });

            const webhookClient = new WebhookClient({ url: webhook.url });

            await webhookClient.editMessage(msgPair.forumMessageID, {
                content: newMsg.content || (newMsg.attachments.size > 0 ? null : "*Mesaj içeriği yok*"),
                files: newMsg.attachments.map(a => ({ attachment: a.url, name: a.name })),
                threadId: threadData.threadID
            });

            return;
        }

        if (String(msgPair.forumMessageID) === String(newMsg.id)) {
            const user = await client.users.fetch(threadData.userID).catch(() => null);
            if (!user) return;

            const dmChannel = user.dmChannel || await user.createDM();
            const dmMsg = await dmChannel.messages.fetch(msgPair.dmMessageID, { force: true }).catch(() => null);
            if (!dmMsg) return;

            await dmMsg.edit({
                content: newMsg.content || (newMsg.attachments.size > 0 ? null : "*Mesaj silindi*"),
                files: newMsg.attachments.map(a => ({ attachment: a.url, name: a.name }))
            });
        }

    } catch (err) {
        console.error("Message update sırasında hata:", err);
    }
};
