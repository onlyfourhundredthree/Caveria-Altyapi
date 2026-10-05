const Settings = require("../../../Settings.json");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const client = global.bot;

if (!global.lastMediaTime) global.lastMediaTime = new Map();
if (!global.lastMessageMap) global.lastMessageMap = new Map();
const lastMediaTime = global.lastMediaTime;
const lastMessageMap = global.lastMessageMap;


module.exports = async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author.bot) return;

    if (newMessage.partial) {
        try {
            await newMessage.fetch();
        } catch (err) {
            return;
        }
    }

    if (newMessage.channel.id === ConfigManager.get("Channels.Itiraf")) return newMessage.delete();
    const partnerChannels = [
        ConfigManager.get("Channels.Partner"),
        ConfigManager.get("Channels.PartnerTR"),
        ConfigManager.get("Channels.PartnerEN"),
        ConfigManager.get("Channels.PartnerGlobal")
    ].filter(id => Boolean(id) && typeof id === "string");

    if (partnerChannels.includes(newMessage.channel.id)) return;

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

    const isExempt = Settings.ChatGuardExempts && Settings.ChatGuardExempts.includes(newMessage.author.id);
    if (newMessage.channel.id === ConfigManager.get("Channels.Chat") && newMessage.member && !newMessage.member.permissions.has("Administrator") && !isExempt) {
        const now = Date.now();
        const content = newMessage.content || "";

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
            await newMessage.delete().catch(() => { });
            return;
        }

        const gifRegex = /(https?:\/\/.*\.(gif)(\?.*)?$)|(https?:\/\/tenor\.com\/.*)/i;

        if (oldMessage && !oldMessage.partial &&
            oldMessage.content === newMessage.content &&
            oldMessage.attachments.size === newMessage.attachments.size &&
            oldMessage.stickers.size === newMessage.stickers.size) return;

        if (
            newMessage.stickers.size > 0 ||
            newMessage.attachments.size > 0 ||
            gifRegex.test(content)
        ) {
            const oldHasMedia = oldMessage && !oldMessage.partial && (
                oldMessage.stickers.size > 0 ||
                oldMessage.attachments.size > 0 ||
                gifRegex.test(oldMessage.content || "")
            );

            if (!oldHasMedia) {
                const last = lastMediaTime.get(newMessage.author.id) || 0;
                const remaining = ConfigManager.get("ChatGuard.MediaCooldown") - (now - last);

                if (remaining > 0) {
                    await newMessage.delete().catch(() => { });
                    sendWarn(newMessage, `tekrar medya kullanabilmek için **${Math.ceil(remaining / 1000)} saniye** beklemelisin!`);
                    logToGuard(newMessage, "Medya Cooldown");
                    return;
                }

                lastMediaTime.set(newMessage.author.id, now);
            }
        }

        const textWithoutLinks = content.replace(/https?:\/\/\S+/gi, "");
        const customEmojiRegex = /<a?:\w+:\d+>/g;
        const unicodeEmojiRegex = /\p{Emoji_Presentation}/gu;
        const customEmojiCount = (textWithoutLinks.match(customEmojiRegex) || []).length;
        const unicodeEmojiCount = (textWithoutLinks.match(unicodeEmojiRegex) || []).length;

        const emojiCount = customEmojiCount + unicodeEmojiCount;
        const emojiLimit = ConfigManager.get("ChatGuard.EmojiLimit") || 6;

        if (emojiCount > 0 && emojiCount >= emojiLimit) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `çok fazla emoji kullanıyorsun!`);
            logToGuard(newMessage, "Emoji Limiti Aşıldı");
            return;
        }

        if (!content.includes("\n") && content.length > ConfigManager.get("ChatGuard.MaxSingleLine")) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `mesajın çok uzun!`);
            logToGuard(newMessage, "Mesaj Karakter Limiti");
            return;
        }

        if (newMessage.member && !newMessage.member.permissions.has("Administrator")) {
            const hasMedia = newMessage.attachments.size > 0 || newMessage.stickers.size > 0 || gifRegex.test(content);
            const lastMsg = lastMessageMap.get(newMessage.author.id);
            if (content && content.length > 0 && !hasMedia) {
                if (lastMsg === content) {
                    await newMessage.delete().catch(() => { });
                    sendWarn(newMessage, `aynı mesajı tekrar atamazsın!`);
                    logToGuard(newMessage, "Spam / Tekrarlanan Mesaj");
                    return;
                }
                lastMessageMap.set(newMessage.author.id, content);
            }
        }

        const mentionCount = (content.match(/<@!?\d+>/g) || []).length;
        if (mentionCount >= ConfigManager.get("ChatGuard.MentionLimit") || newMessage.mentions.everyone) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `çok fazla etiket kullanıyorsun!`);
            logToGuard(newMessage, "Etiket Limiti");
            return;
        }

        const spoilerCount = (content.match(/\|\|/g) || []).length / 2;

        if (spoilerCount >= ConfigManager.get("ChatGuard.SpoilerLimit")) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `çok fazla spoiler kullandın!`);
            logToGuard(newMessage, "Spoiler Limiti");
            return;
        }

        const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+[a-z]/gi;
        const hasInvite = inviteRegex.test(content) && ConfigManager.get("ChatGuard.InviteBlock");

        if (hasInvite) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `sunucu reklamı yapmak yasak!`);
            logToGuard(newMessage, "Sunucu Reklamı / Invite");
            return;
        }

        const zalgoRegex = /[\u0300-\u036f\u0483-\u0489\u1dc0-\u1dfb\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;
        if (zalgoRegex.test(content)) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `zalgo / bozuk yazı kullanımı yasaktır!`);
            logToGuard(newMessage, "Zalgo / Glitch Text");
            return;
        }

        const lines = content.split("\n");
        if (lines.length >= 8) {
            await newMessage.delete().catch(() => { });
            sendWarn(newMessage, `ascii / art spam yasak!`);
            logToGuard(newMessage, "Satır Limiti / Flood");
            return;
        }
    }
};
