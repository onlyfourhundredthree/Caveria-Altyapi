const Settings = require("../../../Settings.json");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StatHistory = require("../../Core/Database/StatHistory");
const GiveawayStats = require("../../Core/Database/GiveawayStats");
const moment = require("moment-timezone");
const client = global.bot;

if (!global.lastMediaTime) global.lastMediaTime = new Map();
if (!global.lastMessageMap) global.lastMessageMap = new Map();
const lastMediaTime = global.lastMediaTime;
const lastMessageMap = global.lastMessageMap;

if (!global.messageMapCleanerStarted) {
    setInterval(() => {
        const now = Date.now();
        for (const [userId, time] of lastMediaTime.entries()) {
            if (now - time > 60000) lastMediaTime.delete(userId);
        }
        lastMessageMap.clear();
    }, 60 * 60 * 1000);
    global.messageMapCleanerStarted = true;
}

module.exports = async (message) => {
    if (!message.guild || !message.member || message.author.bot) return;

    const LevelUtils = require("../../Services/Stats/LevelUtils");
    const XPManager = require("../../Core/Handlers/XPManager");

    if (message.channel.id === ConfigManager.get("Channels.Itiraf")) return message.delete();
    const partnerChannels = [
        ConfigManager.get("Channels.Partner"),
        ConfigManager.get("Channels.PartnerTR"),
        ConfigManager.get("Channels.PartnerEN"),
        ConfigManager.get("Channels.PartnerGlobal")
    ].filter(id => Boolean(id) && typeof id === "string");

    if (partnerChannels.includes(message.channel.id)) {
        const content = message.content || "";
        const linkRegex = /https?:\/\/\S+/gi;
        const hasLink = linkRegex.test(content);

        if (content.length >= 50 && hasLink) {
            const TaskManager = require("../../Core/Handlers/TaskManager");
            await TaskManager.progressTask(message.guild, message.member, "PARTNER");
        }
        return;
    }

    async function sendWarn(message, text) {
        const warn = await message.channel.send({
            content: `${message.author}, ${text}`
        }).catch(() => null);

        if (warn) {
            setTimeout(() => {
                warn.delete().catch(() => { });
            }, 5000);
        }
    }

    async function logToGuard(message, reason) {
        const guardLog = message.guild.channels.cache.find(c => c.name === "guard-log" && c.isTextBased());
        if (guardLog) {
            const ConfigManager = require("../../Core/Handlers/ConfigManager");
            const toji_iptal = ConfigManager.get("Emojis.toji_iptal") || "✨";
            const content = message.content ? (message.content.length > 1000 ? message.content.slice(0, 997) + "..." : message.content) : "Yok";

            const v2Payload = {
                components: [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `## ${toji_iptal} Chat Guard\n${message.author} kullanıcısının mesajı silindi.\n**Sebep:** ${reason}`
                            },
                            {
                                type: 14,
                                divider: true,
                                spacing: 1
                            },
                            {
                                type: 10,
                                content: `**Kanal:** ${message.channel}\n**Mesaj İçeriği:**\n\`\`\`\n${content}\n\`\`\``
                            }
                        ]
                    }
                ]
            };
            guardLog.send(v2Payload).catch(() => { });
        }
    }

    const isExempt = Settings.ChatGuardExempts && Settings.ChatGuardExempts.includes(message.author.id);
    if (message.channel.id === ConfigManager.get("Channels.Chat") && message.member && !message.member.permissions.has("Administrator") && !isExempt) {
        const now = Date.now();
        const content = message.content || "";

        const botMessages = [
            "tekrar medya kullanabilmek için",
            "çok fazla emoji kullanıyorsun!",
            "mesajın çok uzun!",
            "aynı mesajı tekrar atamazsın!",
            "çok fazla etiket kullanıyorsun!",
            "çok fazla spoiler kullandın!",
            "sunucu reklamı yapmak yasak!",
            "zalgo / bozuk yazı kullanımı yasaktır!",
            "ascii / art spam yasak!"
        ];
        if (botMessages.some(m => content.includes(m))) {
            await message.delete().catch(() => { });
            return;
        }

        const gifRegex = /(https?:\/\/.*\.(gif)(\?.*)?$)|(https?:\/\/tenor\.com\/.*)/i;

        if (
            message.stickers.size > 0 ||
            message.attachments.size > 0 ||
            gifRegex.test(content)
        ) {
            const last = lastMediaTime.get(message.author.id) || 0;
            const remaining = ConfigManager.get("ChatGuard.MediaCooldown") - (now - last);

            if (remaining > 0) {
                await message.delete().catch(() => { });
                sendWarn(message, `tekrar medya kullanabilmek için **${Math.ceil(remaining / 1000)} saniye** beklemelisin!`);
                logToGuard(message, "Medya Cooldown");
                return;
            }

            lastMediaTime.set(message.author.id, now);
        }

        const textWithoutLinks = content.replace(/https?:\/\/\S+/gi, "");
        const customEmojiRegex = /<a?:\w+:\d+>/g;
        const unicodeEmojiRegex = /\p{Emoji_Presentation}/gu;
        const customEmojiCount = (textWithoutLinks.match(customEmojiRegex) || []).length;
        const unicodeEmojiCount = (textWithoutLinks.match(unicodeEmojiRegex) || []).length;

        const emojiCount = customEmojiCount + unicodeEmojiCount;
        const emojiLimit = ConfigManager.get("ChatGuard.EmojiLimit") || 6;

        if (emojiCount > 0 && emojiCount >= emojiLimit) {
            await message.delete().catch(() => { });
            sendWarn(message, `çok fazla emoji kullanıyorsun!`);
            logToGuard(message, "Emoji Limiti Aşıldı");
            return;
        }

        if (content.length > ConfigManager.get("ChatGuard.MaxSingleLine")) {
            await message.delete().catch(() => { });
            sendWarn(message, `mesajın çok uzun!`);
            logToGuard(message, "Mesaj Karakter Limiti");
            return;
        }

        const hasMedia = message.attachments.size > 0 || message.stickers.size > 0 || gifRegex.test(content);
        if (content && content.length > 0 && !hasMedia) {
            const lastData = lastMessageMap.get(message.author.id) || { content: "", count: 0 };

            if (lastData.content === content) {
                lastData.count += 1;
                if (lastData.count >= 3) {
                    await message.delete().catch(() => { });
                    sendWarn(message, `aynı mesajı tekrar atamazsın!`);
                    logToGuard(message, "Spam / Tekrarlanan Mesaj");
                    return;
                }
                lastMessageMap.set(message.author.id, lastData);
            } else {
                lastMessageMap.set(message.author.id, { content: content, count: 1 });
            }
        }

        const mentionCount = (content.match(/<@!?\d+>/g) || []).length;
        if (mentionCount >= ConfigManager.get("ChatGuard.MentionLimit") || message.mentions.everyone) {
            await message.delete().catch(() => { });
            sendWarn(message, `çok fazla etiket kullanıyorsun!`);
            logToGuard(message, "Etiket Limiti");
            return;
        }

        const spoilerCount = (content.match(/\|\|/g) || []).length / 2;

        if (spoilerCount >= ConfigManager.get("ChatGuard.SpoilerLimit")) {
            await message.delete().catch(() => { });
            sendWarn(message, `çok fazla spoiler kullandın!`);
            logToGuard(message, "Spoiler Limiti");
            return;
        }

        const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/gi;
        const hasInvite = inviteRegex.test(content) && ConfigManager.get("ChatGuard.InviteBlock");

        if (hasInvite) {
            await message.delete().catch(() => { });
            sendWarn(message, `sunucu reklamı yapmak yasak!`);
            logToGuard(message, "Sunucu Reklamı / Invite");
            return;
        }

        const zalgoRegex = /[\u0300-\u036f\u0483-\u0489\u1dc0-\u1dfb\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;
        if (zalgoRegex.test(content)) {
            await message.delete().catch(() => { });
            sendWarn(message, `zalgo / bozuk yazı kullanımı yasaktır!`);
            logToGuard(message, "Zalgo / Glitch Text");
            return;
        }

        const lines = content.split("\n");
        if (lines.length >= 8) {
            await message.delete().catch(() => { });
            sendWarn(message, `ascii / art spam yasak!`);
            logToGuard(message, "Satır Limiti / Flood");
            return;
        }
    }

    const StatCacheManager = require("../../Core/Handlers/StatCacheManager");

    const activeGiveaways = client.giveawayManager ? client.giveawayManager.giveaways.filter(gw => !gw.ended && gw.extraData?.minMessages) : [];
    const giveawayIDs = activeGiveaways.map(g => g.messageId);

    let messageCoin = 0;
    if (message.channel.id === ConfigManager.get("Channels.BoosterAppLog")) {
        messageCoin = ConfigManager.get("Economy.MessageCoin") || 0.1;
    }

    StatCacheManager.addMessage(message.guild.id, message.author.id, message.channel.id, giveawayIDs, messageCoin);

    const TaskManager = require("../../Core/Handlers/TaskManager");
    if (message.channel.id === ConfigManager.get("Channels.Chat")) {
        await TaskManager.progressTask(message.guild, message.member, "MESSAGE");
        await TaskManager.progressMandatory(message.guild, message.member, "MESSAGE", 1);
    }

    await XPManager.processPassive(message.guild, message.member, "CHAT");

    const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
    await InviteClaimManager.updateProgress(message.guild.id, message.author.id, "MESSAGE", 1);
};
