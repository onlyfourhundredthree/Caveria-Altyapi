const VoiceJoined = require("../Database/Voice.JoinedAt");
const StatHistory = require("../Database/StatHistory");
const Economy = require("../Database/Economy");
const LevelUtils = require("../../Services/Stats/LevelUtils");
const XPManager = require("./XPManager");
const TaskManager = require("./TaskManager");
const ConfigManager = require("./ConfigManager");
const Settings = require("../../../Settings.json");
const moment = require("moment-timezone");
const GiveawayStats = require("../Database/GiveawayStats");

class VoiceManager {
    static async getLiveTime(userID, persistentTime = 0) {
        const session = await VoiceJoined.findOne({ userID });
        if (session && session.date) {
            const liveDiff = Date.now() - session.date;
            return persistentTime + Math.max(0, liveDiff);
        }
        return persistentTime;
    }

    static async saveCheckpoint(member, channel) {
        const now = Date.now();
        const session = await VoiceJoined.findOne({ userID: member.id });
        if (!session || !session.date) return;

        const diff = now - session.date;
        if (diff < 30000) return; 

        await this.saveVoiceData(member, channel, diff);

        await VoiceJoined.updateOne(
            { _id: session._id },
            { $set: { date: now } }
        ).catch(() => { });
    }

    static async saveGiveawayVoiceData(userID, diff) {
        const client = global.bot;
        if (!client || !client.giveawayManager) return;
        const activeGiveaways = client.giveawayManager.giveaways.filter(gw => !gw.ended && gw.extraData?.minVoiceTime);

        for (const gw of activeGiveaways) {
            await GiveawayStats.findOneAndUpdate(
                { giveawayId: gw.messageId, userId: userID },
                { $inc: { voiceTime: diff } },
                { upsert: true }
            );
        }
    }

    static async saveVoiceData(member, channel, diff, isDeafened = false) {
        if (!member || !channel || !channel.id || diff <= 0) return;

        const MAX_DIFF = 12 * 3600000;
        if (diff > MAX_DIFF) {
            console.warn(`[VOICE-CAP] User ${member.id} had a diff of ${diff}ms, capping to 12h.`);
            diff = MAX_DIFF;
        }

        const userID = member.id;
        const channelID = channel.id;
        const todayDate = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");

        const statDiff = isDeafened ? (diff / 2) : diff;

        await StatHistory.findOneAndUpdate(
            { guildID: Settings.Main.GuildID, userID: userID, date: todayDate },
            {
                $inc: {
                    "voice.total": statDiff,
                    [`voice.channels.${channelID}`]: statDiff
                }
            },
            { upsert: true }
        );

        await this.saveGiveawayVoiceData(userID, statDiff);

        const diffMinutes = Math.floor(diff / 60000);
        if (diffMinutes > 0) {
            const allowedChannels = ConfigManager.get("Channels.PublicVoices") || [];
            const isOther = allowedChannels.length > 0 && !allowedChannels.includes(channel.id);
            const isPublic = !isOther;

            let voiceTaskMinutes = diffMinutes;
            if (isDeafened) voiceTaskMinutes = Math.floor(voiceTaskMinutes / 2); 
            if (voiceTaskMinutes > 0) {
                await TaskManager.progressTask(channel.guild, member, "VOICE", voiceTaskMinutes, null, isOther);
            }

            let publicTaskMinutes = 0;
            if (isPublic && !isDeafened) { 
                publicTaskMinutes = diffMinutes;
                if (channel.userLimit > 0) { 
                    publicTaskMinutes = 0;
                }
                if (publicTaskMinutes > 0) {
                    await TaskManager.progressTask(channel.guild, member, "PUBLIC_VOICE", publicTaskMinutes, null, false);
                }
            }

            let mandatoryGenDiff = diff;
            let mandatoryPubDiff = isPublic ? diff : 0;

            if (isDeafened) {
                mandatoryGenDiff = Math.floor(mandatoryGenDiff / 2);
                mandatoryPubDiff = 0; 
            } else if (isPublic && channel.userLimit > 0) {
                mandatoryPubDiff = Math.floor(mandatoryPubDiff / 2);
            }

            if (mandatoryGenDiff > 0) {
                await TaskManager.progressMandatory(channel.guild, member, "VOICE", mandatoryGenDiff, mandatoryPubDiff);
            }
        }

        if (diffMinutes > 0 && !isDeafened) {
            await XPManager.processPassive(channel.guild, member, "VOICE");
        }

        const coinPerHour = ConfigManager.get("Economy.VoiceCoinPerHour") || 0.1;
        const publicVoices = ConfigManager.get("Channels.PublicVoices") || [];

        if (publicVoices.length > 0 && publicVoices.includes(channel.id)) {
            const ecoData = await Economy.findOne({ guildID: Settings.Main.GuildID, userID: userID }) ||
                await Economy.create({ guildID: Settings.Main.GuildID, userID: userID });

            const coinDiff = isDeafened ? (diff / 2) : diff;
            let waitMs = (ecoData.voiceWaitMs || 0) + coinDiff;
            const hourMs = 3600000;
            let rewardsToGive = 0;

            while (waitMs >= hourMs) {
                rewardsToGive++;
                waitMs -= hourMs;
            }

            if (rewardsToGive > 0 || waitMs !== ecoData.voiceWaitMs) {
                await Economy.updateOne(
                    { guildID: Settings.Main.GuildID, userID: userID },
                    {
                        $inc: { coin: rewardsToGive * coinPerHour },
                        $set: { voiceWaitMs: waitMs }
                    }
                );
            }
        }

        const stats = await StatHistory.aggregate([
            { $match: { guildID: Settings.Main.GuildID, userID: userID } },
            { $group: { _id: "$userID", total: { $sum: "$voice.total" } } }
        ]);

        const currentXP = stats[0] ? stats[0].total : 0;
        const previousXP = currentXP - diff;

        const currentLevel = LevelUtils.calculateVoiceLevel(currentXP);
        const previousLevel = LevelUtils.calculateVoiceLevel(previousXP);

        if (currentLevel > previousLevel) {
            let rewardRoleName = null;
            let targetRank = null;

            const voiceRanks = ConfigManager.get("Roles.VoiceRanks") || [];
            if (voiceRanks.length > 0) {
                targetRank = voiceRanks
                    .filter(rank => currentLevel >= rank.Level)
                    .sort((a, b) => b.Level - a.Level)[0];

                if (targetRank) {
                    if (!member.roles.cache.has(targetRank.Role)) {
                        await member.roles.add(targetRank.Role).catch(() => { });
                        const roleObj = channel.guild?.roles.cache.get(targetRank.Role);
                        if (roleObj) rewardRoleName = roleObj.name;
                    }

                    for (const rank of voiceRanks) {
                        if (rank.Role !== targetRank.Role && member.roles.cache.has(rank.Role)) {
                            await member.roles.remove(rank.Role).catch(() => { });
                        }
                    }
                }
            }

            // Seviye Atlama Coin Ödülü
            const levelCoinRate = ConfigManager.get("Economy.LevelCoin") ?? 100;
            const coinBonus = currentLevel * levelCoinRate;
            const Economy = require("../Database/Economy");
            await Economy.updateOne({ guildID: channel.guild?.id || member.guild.id, userID: member.id }, { $inc: { coin: coinBonus } }, { upsert: true }).catch(() => {});

            // Görsel Seviye Kartı ve Duyuru Mesajı
            const levelLogChannelId = ConfigManager.get("Channels.VoiceLevelLog");
            const levelLogChannel = channel.guild?.channels.cache.get(levelLogChannelId);

            if (levelLogChannel) {
                const { AttachmentBuilder } = require("discord.js");
                const { renderLevelUpCard } = require("../../Utils/LevelUpCanvas");

                try {
                    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
                    const cardBuffer = await renderLevelUpCard({
                        username: member.user.username,
                        avatarUrl,
                        oldLevel: previousLevel,
                        newLevel: currentLevel,
                        type: "voice",
                        rewardRoleName,
                        coinReward: coinBonus
                    });

                    const files = [new AttachmentBuilder(cardBuffer, { name: "levelup.png" })];

                    levelLogChannel.send({
                        content: `${member.toString()}`,
                        files,
                        allowedMentions: { users: [member.id], roles: [] }
                    }).catch(() => { });
                } catch (e) {
                    console.error("[VoiceLevelUp] Canvas send error:", e);
                }
            }
        }
    }
}

module.exports = VoiceManager;
