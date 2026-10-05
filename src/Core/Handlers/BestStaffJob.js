const { CronJob } = require("cron");
const moment = require("moment-timezone");
const ConfigManager = require("./ConfigManager");
const StaffUser = require("../Database/StaffUser");
const XPManager = require("./XPManager");
const { MessageFlags } = require("discord.js");

module.exports = (client) => {
    const job = new CronJob("0 * * * 1", async () => {
        try {
            const now = moment().tz("Europe/Istanbul");
            
            const configHour = ConfigManager.get("BestStaff.Hour") || "20:00";
            const currentHour = now.format("HH:00");
            
            if (configHour !== currentHour) return;

            const startDate = moment.tz("2026-07-20", "Europe/Istanbul");
            const weeksPassed = now.diff(startDate, 'weeks');

            if (weeksPassed % 2 !== 0) return;

            const lockKey = `BestStaff_${now.format("YYYY_MM_DD")}`;
            const SystemSettings = require("../Database/SystemSettings");
            const lock = await SystemSettings.findOneAndUpdate(
                { key: lockKey },
                { $setOnInsert: { value: true, updatedAt: new Date() } },
                { upsert: true, new: false }
            );

            if (lock) return;

            console.log("[BEST-STAFF] İki haftalık en iyi yetkili seçimi başlatıldı!");

            const allStaff = await StaffUser.find({});
            if (!allStaff || allStaff.length === 0) return;

            const twoWeeksAgo = now.clone().subtract(14, 'days').toDate();
            let bestStaffId = null;
            let bestStaffGuildId = null;
            let maxXP = -1;

            const excludedTokens = ["1174171687915368521", "1294350192253861940", "1294346993300144152", "1294353603582099572", "1294345192341639372"];
            const leaderboard = [];

            for (const staff of allStaff) {
                if (excludedTokens.includes(staff.userID)) continue;
                const history = staff.history || [];
                let total14DaysXP = 0;
                for (const h of history) {
                    if (h.date >= twoWeeksAgo && h.action === "ADD_XP") {
                        total14DaysXP += (h.amountXP || 0);
                    }
                }
                
                if (total14DaysXP > 0) {
                    leaderboard.push({
                        userID: staff.userID,
                        guildID: staff.guildID,
                        xp: total14DaysXP
                    });
                }
            }

            if (leaderboard.length === 0) {
                console.log("[BEST-STAFF] Son 14 günde XP kazanan yetkili bulunamadı.");
                return;
            }

            leaderboard.sort((a, b) => b.xp - a.xp);

            const StaffRoleSystem = require("../Database/StaffRoleSystem");
            let member = null;
            let guild = null;

            for (const candidate of leaderboard) {
                const tempGuild = client.guilds.cache.get(candidate.guildID);
                if (!tempGuild) continue;

                const tempMember = await tempGuild.members.fetch(candidate.userID).catch(() => null);
                if (!tempMember) continue;

                const activeRanks = await StaffRoleSystem.find({ guildID: tempGuild.id, active: true });
                const isCurrentlyStaff = activeRanks.some(r => tempMember.roles.cache.has(r.roleID));

                if (isCurrentlyStaff) {
                    bestStaffId = candidate.userID;
                    bestStaffGuildId = candidate.guildID;
                    maxXP = candidate.xp;
                    member = tempMember;
                    guild = tempGuild;
                    break;
                }
            }

            if (!member) {
                console.log("[BEST-STAFF] Geçerli bir (hâlâ yetkili olan) birinci bulunamadı.");
                return;
            }

            const previousWinnerID = ConfigManager.get("BestStaff.CurrentWinnerID");
            const rewardRoleID = ConfigManager.get("BestStaff.RewardRole");
            const rewardXP = parseInt(ConfigManager.get("BestStaff.RewardXP")) || 0;
            const rewardCoin = parseInt(ConfigManager.get("BestStaff.RewardCoin")) || 0;
            const multiplier = parseFloat(ConfigManager.get("BestStaff.Multiplier")) || 1.0;

            await ConfigManager.updateNested("BestStaff", "CurrentWinnerID", bestStaffId, "SYSTEM");

            if (rewardRoleID) {
                const role = guild.roles.cache.get(rewardRoleID);
                if (role) {
                    if (previousWinnerID && previousWinnerID !== bestStaffId) {
                        const prevMember = await guild.members.fetch(previousWinnerID).catch(() => null);
                        if (prevMember && prevMember.roles.cache.has(rewardRoleID)) {
                            await prevMember.roles.remove(rewardRoleID).catch(() => {});
                        }
                    }
                    if (!member.roles.cache.has(rewardRoleID)) {
                        await member.roles.add(rewardRoleID).catch(() => {});
                    }
                }
            }

            if (rewardXP > 0) {
                await XPManager.addXP(guild, member, rewardXP, "BEST_STAFF_REWARD");
            }

            if (rewardCoin > 0) {
                await StaffUser.findOneAndUpdate(
                    { guildID: guild.id, userID: member.id },
                    { $inc: { coin: rewardCoin } }
                );
            }

            const channelID = ConfigManager.get("BestStaff.Channel");
            if (channelID) {
                const channel = guild.channels.cache.get(channelID);
                if (channel) {
                    const emojis = ConfigManager.get("Emojis") || {};
                    const coinEmoji = ConfigManager.get("Economy.CurrencyEmoji") || "🪙";
                    const componentsV2 = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: {
                                        type: 11,
                                        media: { url: member.user.displayAvatarURL({ dynamic: true, size: 256 }) || guild.iconURL({ dynamic: true }) }
                                    },
                                    components: [
                                        {
                                            type: 10,
                                            content: `## ${emojis.toji_sparkly || "✨"} İki Haftanın En İyi Yetkilisi!`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `🎉 Tebrikler <@${bestStaffId}>! Son 14 gün boyunca gösterdiğin üstün çaba ve kazandığın **${maxXP.toFixed(1)} XP** ile en iyi yetkili seçildin!`
                                },
                                { type: 14, spacing: 1 },
                                {
                                    type: 10,
                                    content: `### 🎁 Kazanılan Ödüller\n` +
                                        (rewardXP > 0 ? `${emojis.toji_nokta || "•"} **${rewardXP}** Direkt XP Ödülü\n` : "") +
                                        (multiplier > 1.0 ? `${emojis.toji_nokta || "•"} **x${multiplier}** XP Çarpanı (2 Hafta Boyunca)\n` : "") +
                                        (rewardCoin > 0 ? `${emojis.toji_nokta || "•"} **${rewardCoin}** ${coinEmoji}\n` : "") +
                                        (rewardRoleID ? `${emojis.toji_nokta || "•"} <@&${rewardRoleID}> Şampiyonluk Rolü` : "")
                                }
                            ]
                        }
                    ];
                    await channel.send({ components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
                }
            }

        } catch (err) {
            console.error("[BEST-STAFF] Görev sırasında hata oluştu:", err);
        }
    }, null, true, "Europe/Istanbul");

    job.start();
};
