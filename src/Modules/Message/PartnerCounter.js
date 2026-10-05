const ConfigManager = require("../../Core/Handlers/ConfigManager");
const client = global.bot;
const GuildPartner = require("../../Core/Database/GuildPartners");

const PartnerSettings = require("../../Core/Database/PartnerSettings");
const StatHistory = require("../../Core/Database/StatHistory");
const TaskManager = require("../../Core/Handlers/TaskManager");
const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const COOLDOWN = 3 * 60 * 60 * 1000;

module.exports = async (message) => {
    const partnerChannels = [
        ConfigManager.get("Channels.Partner"),
        ConfigManager.get("Channels.PartnerTR"),
        ConfigManager.get("Channels.PartnerEN"),
        ConfigManager.get("Channels.PartnerGlobal")
    ].filter(id => Boolean(id) && typeof id === "string");

    if (!partnerChannels.includes(message.channel.id)) return;
    if (message.author.bot) return;

    const content = message.content || "";
    if (content.length < 50) {
        await message.delete().catch(() => { });
        try {
            const warnEmbed = new EmbedBuilder()
                .setAuthor({ name: "Partner Metni Yetersiz", iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setDescription("Partnerlik mesajınız çok kısa! Partner sayılması için en az **50 karakterden** oluşması gerekmektedir.")
                .setColor("Red");
            return message.author.send({ embeds: [warnEmbed] }).catch(() => { });
        } catch (err) { }
        return;
    }

    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/([a-zA-Z0-9-]+)/;
    const match = content.match(inviteRegex);

    if (!match) {
        await message.delete().catch(() => { });
        return;
    }

    const inviteCode = match[1];

    try {
        const invite = await client.fetchInvite(inviteCode).catch(() => null);

        if (!invite || !invite.guild || invite.guild.id === message.guild.id) {
            await message.delete().catch(() => { });
            return;
        }

        const gid = invite.guild.id;
        const uid = message.author.id;

        const isBanned = await GuildPartner.findOne({ guildID: gid, banned: true });
        if (isBanned) {
            await message.delete().catch(() => { });
            try {
                const dmEmbed = new EmbedBuilder()
                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`${ConfigManager.get("Emojis.toji_iptal") || "✨"} **${invite.guild.name}** sunucusu partnerlikten **yasaklıdır**.`)
                    .setColor("Red");
                await message.author.send({ embeds: [dmEmbed] }).catch(() => { });
            } catch { }
            return;
        }

        const isOwner = ConfigManager.isOwner(message.member);
        const partnerManagerRole = ConfigManager.get("Roles.Responsibilities.PartnerManager");
        const isPartnerManager = Array.isArray(partnerManagerRole)
            ? partnerManagerRole.some(r => message.member.roles.cache.has(r))
            : message.member.roles.cache.has(partnerManagerRole);

        if (!isOwner && !isPartnerManager) {
            const lastGuildPartner = await GuildPartner.findOne({ guildID: gid }).sort({ lastPartnerAt: -1 });
            const now = Date.now();
            if (lastGuildPartner && lastGuildPartner.lastPartnerAt && (now - lastGuildPartner.lastPartnerAt.getTime()) < COOLDOWN) {
                const remaining = COOLDOWN - (now - lastGuildPartner.lastPartnerAt.getTime());
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

                await message.delete().catch(() => { });
                try {
                    const cooldownEmbed = new EmbedBuilder()
                        .setAuthor({ name: "Partnerlik Bekleme Süresinde", iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setDescription(`**${invite.guild.name}** sunucusu ile tekrar partnerlik yapabilmek için **${hours} saat ${minutes} dakika** daha beklemeniz gerekmektedir.`)
                        .setColor("Orange");
                    await message.author.send({ embeds: [cooldownEmbed] }).catch(() => { });
                } catch { }
                return;
            }
        }

        const now = Date.now();

        await GuildPartner.findOneAndUpdate(
            { guildID: gid },
            { $set: { lastPartnerAt: new Date(), userID: uid }, $setOnInsert: { banned: false } },
            { upsert: true }
        );

        const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");
        const weekAgo = moment().tz("Europe/Istanbul").subtract(1, "weeks").format("YYYY-MM-DD");

        await StatHistory.findOneAndUpdate(
            { guildID: message.guild.id, userID: uid, date: today },
            {
                $inc: { partner: 1 },
                $push: { partnerHistory: { guildName: invite.guild.name, guildID: gid, date: new Date() } }
            },
            { upsert: true, setDefaultsOnInsert: true }
        );

        const member = message.member || await message.guild.members.fetch(uid).catch(() => null);

        await TaskManager.progressTask(message.guild, member, "PARTNER");

        const statsAgg = await StatHistory.aggregate([
            { $match: { guildID: message.guild.id, userID: uid } },
            { $group: { _id: "$userID", total: { $sum: "$partner" }, weekly: { $sum: { $cond: [{ $gte: ["$date", weekAgo] }, "$partner", 0] } } } }
        ]);
        const stats = statsAgg[0] || { total: 0, weekly: 0 };

        const rankAgg = await StatHistory.aggregate([
            { $match: { guildID: message.guild.id, date: { $gte: weekAgo } } },
            { $group: { _id: "$userID", weekly: { $sum: "$partner" } } },
            { $sort: { weekly: -1 } }
        ]);
        const weeklyRank = rankAgg.findIndex(r => r._id === uid) + 1 || "Kayıtsız";

        let partnerSettings = await PartnerSettings.findOne({ guildID: message.guild.id });
        if (!partnerSettings) partnerSettings = await PartnerSettings.create({ guildID: message.guild.id });

        if (partnerSettings.lastMessageId) {
            try {
                const lastMsg = await message.channel.messages.fetch(partnerSettings.lastMessageId).catch(() => null);
                if (lastMsg && lastMsg.embeds.length > 0) await lastMsg.delete().catch(() => { });
            } catch (err) { }
        }

        const isGlobal = message.channel.id === ConfigManager.get("Channels.PartnerGlobal");

        const defaultTRMsg = "⠀⠀⠀⠀⠀⠀⠀⠀⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n⋆. 𐙚 ̊ Partnerlik yaptığın için teşekkür ederiz ₊˚⊹ ᰔ\n✮⋆˙ Toplam partner sayın: **{topStat}**  \n✮⋆˙ Haftalık partner sayın: **{weeklyStat}**  \n✮⋆˙ Bu haftaki sıralaman: **#{weeklyRank}**";
        const defaultENMsg = "⠀⠀⠀⠀⠀⠀⠀⠀⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n⋆. 𐙚 ̊ Thank you for partnering with us! ₊˚⊹ ᰔ\n✮⋆˙ Your total partners: **{topStat}**  \n✮⋆˙ Your weekly partners: **{weeklyStat}**  \n✮⋆˙ Your rank this week: **#{weeklyRank}**";

        const rawMessage = isGlobal
            ? (ConfigManager.get("Partner.MessageGlobal") || defaultENMsg)
            : (ConfigManager.get("Partner.Message") || defaultTRMsg);

        const partnerMessageRef = rawMessage
            .replace("{topStat}", stats.total)
            .replace("{weeklyStat}", stats.weekly)
            .replace("{weeklyRank}", weeklyRank);

        const displayName = member?.displayName || message.author.displayName || message.author.username;
        const guildIcon = invite.guild.iconURL({ dynamic: true });

        const headerContent = isGlobal
            ? `### ${displayName}, thank you for your partnership!\n-# ${ConfigManager.get("Emojis.toji_partner") || "🤝"} Your partner stats have been updated.`
            : `### ${displayName}, partnerlik için teşekkürler!\n-# ${ConfigManager.get("Emojis.toji_partner") || "🤝"} Partnerlik istatistiklerin güncellendi.`;

        const { MessageFlags } = require("discord.js");
        const statsV2 = [{
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: guildIcon ? { type: 11, media: { url: guildIcon } } : undefined,
                    components: [
                        { type: 10, content: headerContent }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: partnerMessageRef },
            ]
        }];

        const sentMsg = await message.channel.send({ components: statsV2, flags: [MessageFlags.IsComponentsV2] });

        partnerSettings.lastMessageId = sentMsg.id;
        await partnerSettings.save();

    } catch (err) {
        if (message && !message.deleted) await message.delete().catch(() => { });
        console.error((ConfigManager.get("Emojis.toji_iptal") || "✨") + " PartnerCounter Error:", err);
    }
};
