const { WebhookClient } = require("discord.js");
const client = global.bot;
const DMThread = require("../../Core/Database/DMMessages");

const ConfigManager = require("../../Core/Handlers/ConfigManager");
module.exports = async (message) => {
    const FORUM_CHANNEL_ID = ConfigManager.get("Channels.DmForum");
    const CONTROL_CHANNEL_ID = ConfigManager.get("Channels.DmControl");

    if (!message.guild) {
        if (message.author.bot) return;

        let threadData = await DMThread.findOne({ userID: message.author.id });
        const forum = client.channels.cache.get(FORUM_CHANNEL_ID);
        if (!forum) return

        if (!threadData) {
            const thread = await forum.threads.create({
                name: `${message.author.username} (${message.author.id})`,
                type: 11,
                message: { content: `Sohbet etkileşimi başlatıldı. - ${message.author}` }
            });

            threadData = await DMThread.create({
                userID: message.author.id,
                threadID: thread.id,
                messages: new Map()
            });
        }

        const thread = await client.channels.fetch(threadData.threadID).catch(() => null);
        if (!thread) return;

        let webhook = (await forum.fetchWebhooks()).find(w => w.name === "tojimaniac");
        if (!webhook) webhook = await forum.createWebhook({ name: "tojimaniac" });

        const webhookClient = new WebhookClient({ url: webhook.url });

        const forumMsg = await webhookClient.send({
            content: message.content || (message.attachments.size > 0 ? null : "*Mesaj içeriği yok*"),
            username: message.author.username,
            avatarURL: message.author.displayAvatarURL(),
            files: message.attachments.map(a => ({ attachment: a.url, name: a.name })),
            threadId: thread.id
        });

        await DMThread.findOneAndUpdate(
            { userID: message.author.id },
            {
                $set: {
                    [`messages.${forumMsg.id}`]: {
                        dmMessageID: message.id,
                        forumMessageID: forumMsg.id
                    }
                }
            }
        );
        return;
    }

    if (message.channel.isThread() && message.channel.parentId === FORUM_CHANNEL_ID && !message.author.bot) {
        const threadData = await DMThread.findOne({ threadID: message.channel.id });
        if (!threadData) return;

        const user = await client.users.fetch(threadData.userID).catch(() => null);
        if (!user) return;

        try {
            const dmMsg = await user.send({
                content: message.content || (message.attachments.size > 0 ? null : "⚠️ Mesaj içeriği yok"),
                files: message.attachments.map(a => ({ attachment: a.url, name: a.name }))
            });

            await DMThread.findOneAndUpdate(
                { threadID: message.channel.id },
                {
                    $set: {
                        [`messages.${message.id}`]: {
                            dmMessageID: dmMsg.id,
                            forumMessageID: message.id
                        }
                    }
                }
            );

        } catch (err) {
            console.error("Kullanıcıya mesaj gönderilemedi:", err);
        }
        return;
    }

    if (message.channel.id === CONTROL_CHANNEL_ID && message.author.id !== client.user.id) {
        const mentioned = message.mentions.users.first();
        let targetUser = mentioned;

        if (!targetUser) {
            const match = message.content.match(/\d{17,19}/);
            if (match) {
                try { targetUser = await client.users.fetch(match[0]); }
                catch { targetUser = null; }
            }
        }

        if (!targetUser) return;

        let dmStatus = true;
        try { await targetUser.send("Selam! DM testi."); } catch { dmStatus = false; }

        if (!dmStatus) return message.reply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " Kullanıcının DM'i kapalı, thread açılamadı.");

        const forum = client.channels.cache.get(FORUM_CHANNEL_ID);
        if (!forum) return

        let threadData = await DMThread.findOne({ userID: targetUser.id });
        if (threadData) return message.reply(`⚠️ Bu kullanıcı için zaten thread var: <#${threadData.threadID}>`);

        const thread = await forum.threads.create({
            name: `${targetUser.username} (${targetUser.id})`,
            type: 11,
            message: { content: `${targetUser} için manuel DM açıldı.` }
        });

        await DMThread.create({
            userID: targetUser.id,
            threadID: thread.id,
            messages: new Map()
        });

        return message.reply(`${targetUser.tag} için DM açıldı: <#${thread.id}>`);
    }
};
