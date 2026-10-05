const StaffRoleSystem = require("../Database/StaffRoleSystem");
const StaffUser = require("../Database/StaffUser");
const StaffManager = require("./StaffManager");
const ConfigManager = require("./ConfigManager");
const moment = require("moment");

class XPManager {

    static async processPassive(guild, member, type) {
        return;
    }


    static async addXP(guild, member, amount, reason, userDataInput = null) {
        if (!member || member.user.bot) return;

        if (userDataInput) {
            return await this._executeAddXP(guild, member, amount, reason, userDataInput);
        } else {
            const { withLock } = require("./Lock");
            return await withLock(member.id, async () => {
                const userData = await StaffUser.findOne({ guildID: guild.id, userID: member.id });
                let finalUserData = userData;
                if (!finalUserData) {
                    finalUserData = await StaffUser.create({
                        guildID: guild.id,
                        userID: member.id,
                        dailyPassiveXP: { message: 0, voice: 0, date: moment().format("YYYY-MM-DD") }
                    });
                }
                return await this._executeAddXP(guild, member, amount, reason, finalUserData);
            });
        }
    }

    static async _executeAddXP(guild, member, amount, reason, userData) {
        const today = moment().format("YYYY-MM-DD");
        let finalAmount = amount;
        if (isNaN(finalAmount)) finalAmount = 0;

        if (reason === "CHAT" || reason === "VOICE") return 0;

        const isPenaltyReason = reason === "DAILY_TAG_PENALTY";

        if (!isPenaltyReason) {
            const roles = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
            const currentRank = [...roles].reverse().find(r => member.roles.cache.has(r.roleID));

            if (currentRank) {
                let multiplier = 1.0;

                if (member.roles.cache.some(r => r.name === "Forum Sorumlusu")) {
                    multiplier += 0.1;
                }
                if (member.roles.cache.some(r => r.name === "Forum Lideri")) {
                    multiplier += 0.3;
                }

                if (currentRank.xpMultiplierRoles && currentRank.xpMultiplierRoles.length > 0) {
                    for (const mr of currentRank.xpMultiplierRoles) {
                        if (member.roles.cache.has(mr.roleID)) {
                            multiplier += (mr.multiplier - 1.0); 
                        }
                    }
                }

                const bestStaffWinner = ConfigManager.get("BestStaff.CurrentWinnerID");
                if (bestStaffWinner && member.id === bestStaffWinner) {
                    const bsMult = parseFloat(ConfigManager.get("BestStaff.Multiplier")) || 1.0;
                    if (bsMult > 1.0) {
                        multiplier += (bsMult - 1.0);
                    }
                }

                const StaffGlobalSettings = require("../Database/StaffGlobalSettings");
                const globalSettings = await StaffGlobalSettings.findOne({ guildID: guild.id });
                const globalRespRoles = globalSettings?.responsibilityRoles || [];

                if (globalRespRoles.length > 0 && currentRank.responsibilityLimit > 0) {
                    const userResponsibilityCount = globalRespRoles.filter(rID => member.roles.cache.has(rID)).length;
                    const excess = Math.max(0, userResponsibilityCount - currentRank.responsibilityLimit);
                    if (excess > 0 && currentRank.responsibilityPenalty > 0) {
                        multiplier = Math.max(0.1, multiplier - (excess * currentRank.responsibilityPenalty));
                    }
                }

                finalAmount = finalAmount * multiplier;
            }
        }

        const previousXP = userData.totalXP || 0;

        userData.totalXP = Math.max(0, (userData.totalXP || 0) + finalAmount);
        userData.weeklyXP += finalAmount;
        userData.history.push({
            action: "ADD_XP",
            amountXP: finalAmount,
            reason: reason,
            date: new Date()
        });

        await userData.save();

        await this.checkRoleUpdates(guild, member, userData.totalXP, previousXP, userData);

        return finalAmount;
    }

    static async checkRoleUpdates(guild, member, currentXP, previousXP = null, userDataInput = null) {
        const { EmbedBuilder, MessageFlags } = require("discord.js");
        const StaffGlobalSettings = require("../Database/StaffGlobalSettings");
        const MandatoryTaskConfig = require("../Database/MandatoryTaskConfig");
        const roles = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
        if (!roles.length) return;

        const currentRank = [...roles].reverse().find(r => member.roles.cache.has(r.roleID));

        if (!currentRank) return;

        let targetRole = null;
        for (const role of roles) {
            if (currentXP >= (Number(role.requiredXP) || 0)) {
                targetRole = role;
            }
        }

        if (!targetRole) return;

        if (targetRole.roleID === roles[0].roleID && !member.roles.cache.has(targetRole.roleID)) return;

        if (member.roles.cache.has(targetRole.roleID)) return;
        const hasHigherRank = roles.some(r => r.requiredXP > targetRole.requiredXP && member.roles.cache.has(r.roleID));
        if (hasHigherRank) return;

        if (targetRole.autoPromotion && !member.roles.cache.has(targetRole.roleID)) {
            const MandatoryTaskLog = require("../Database/MandatoryTaskLog");
            let requiredWeeks = targetRole.mandatoryWeeks || 2;

            if (targetRole.autoPromotion && requiredWeeks > 1) {
                requiredWeeks = 1;
            }

            const completedPastWeeks = await MandatoryTaskLog.countDocuments({
                guildID: guild.id,
                userID: member.id,
                status: "COMPLETED"
            });

            const currentWeekCompleted = await StaffManager.checkMandatoryCompletion(member, currentRank);
            const totalCompletedWeeks = completedPastWeeks + (currentWeekCompleted ? 1 : 0);

            if (previousXP !== null && previousXP >= targetRole.requiredXP && completedPastWeeks >= requiredWeeks) {
                return;
            }

            const hasHigherRank = roles.some(r => r.requiredXP > targetRole.requiredXP && member.roles.cache.has(r.roleID));
            if (hasHigherRank) return;

            if (requiredWeeks > 0 && totalCompletedWeeks < requiredWeeks) {
                return;
            }

            await member.roles.add(targetRole.roleID).catch(() => { });

            await StaffManager.applyAllMilestoneRoles(member, targetRole);

            const lowerRoles = roles.filter(r => r.requiredXP < targetRole.requiredXP);
            let prevRank = null;
            for (const r of lowerRoles) {
                if (member.roles.cache.has(r.roleID)) {
                    prevRank = r;
                    await member.roles.remove(r.roleID).catch(() => { });
                }
            }

            await StaffManager.resetStats(member, targetRole.requiredXP);

            const promoLogID = ConfigManager.get("Channels.PromotionLog");
            const promoLog = guild.channels.cache.get(promoLogID);
            if (promoLog) {
                const emojis = ConfigManager.get("Emojis") || {};
                const promoV2 = [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: `## ${emojis.toji_sparkly || "✨"} Otomatik Rütbe Atlama` },
                            { type: 14, spacing: 1 },
                            {
                                type: 9,
                                components: [
                                    { type: 10, content: `**@${member.user.username}** kullanıcısı gereken XP'ye (\`${targetRole.requiredXP}\`) ulaştığı için otomatik olarak **${targetRole.rankName}** rütbesine yükseltildi.` }
                                ],
                                accessory: { type: 11, media: { url: member.user.displayAvatarURL({ extension: "png", size: 256 }) } }
                            }
                        ]
                    }
                ];
                promoLog.send({ components: promoV2, flags: [MessageFlags.IsComponentsV2] });
            }
        }
        else if (!targetRole.autoPromotion && !member.roles.cache.has(targetRole.roleID)) {
            const hasHigherRank = roles.some(r => r.requiredXP > targetRole.requiredXP && member.roles.cache.has(r.roleID));
            if (hasHigherRank) return;

            if (currentRank && targetRole.requiredXP <= currentRank.requiredXP) return;

            if (previousXP !== null && previousXP >= targetRole.requiredXP) return;

            const MandatoryTaskLog2 = require("../Database/MandatoryTaskLog");
            const requiredWeeks2 = targetRole.mandatoryWeeks || 2;

            const completionLogID = ConfigManager.get("Channels.CompletionLog");
            const completionLog = guild.channels.cache.get(completionLogID);

            if (completionLog) {
                const emojis = ConfigManager.get("Emojis") || {};
                const userData = await StaffUser.findOne({ guildID: guild.id, userID: member.id });
                const completedWeeks = await MandatoryTaskLog2.countDocuments({
                    guildID: guild.id, userID: member.id, status: "COMPLETED"
                });
                const mandatoryMet = requiredWeeks2 <= 0 || completedWeeks >= requiredWeeks2;

                const lastTasks = (userData?.history || []).filter(h => h.reason && h.reason.startsWith("TASK_COMPLETED")).slice(-5).reverse();
                const taskStr = lastTasks.length > 0
                    ? lastTasks.map(t => `${emojis.toji_nokta || "•"} ${t.reason.replace("TASK_COMPLETED: ", "")} (<t:${Math.floor(new Date(t.date).getTime() / 1000)}:R>)`).join("\n")
                    : "-# Son görev bulunamadı.";

                const targetXP = targetRole.requiredXP;
                const progressPercent = targetXP > 0
                    ? Math.max(0, Math.min(100, Math.round((currentXP / targetXP) * 100)))
                    : 0;

                const emptyStart = emojis.bar_empty_start || "░";
                const emptyMid = emojis.bar_empty_mid || "░";
                const emptyEnd = emojis.bar_empty_end || "░";
                const fillStart = emojis.bar_full_start || "█";
                const fillMid = emojis.bar_full_mid || "█";
                const fillEnd = emojis.bar_full_end || "█";
                const barLen = 10;
                const filledCount = Math.round((progressPercent / 100) * barLen);
                let progressBar = "";
                for (let i = 1; i <= barLen; i++) {
                    if (i === 1) progressBar += (filledCount >= i ? fillStart : emptyStart);
                    else if (i === barLen) progressBar += (filledCount >= i ? fillEnd : emptyEnd);
                    else progressBar += (filledCount >= i ? fillMid : emptyMid);
                }

                const statusIcon = mandatoryMet ? (emojis.toji_onay || "✅") : (emojis.toji_iptal || "❌");
                const mandatoryStatus = mandatoryMet ? "Karşılandı" : `Karşılanmadı (${completedWeeks}/${requiredWeeks2} hafta)`;
                const currentRankName = currentRank ? currentRank.rankName : "Başlangıç";

                const v2Components = [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: `## ${emojis.toji_sparkly || "✨"} Rütbe Atlama Gereksinimi Karşılandı` },
                            { type: 14, spacing: 1 },
                            {
                                type: 9,
                                components: [
                                    { type: 10, content: `**@${member.user.username}** kullanıcısı **${targetRole.rankName}** rütbesi için gereken XP'ye ulaştı.` }
                                ],
                                accessory: { type: 11, media: { url: member.user.displayAvatarURL({ extension: "png", size: 256 }) } }
                            },
                            { type: 14, spacing: 1 },
                            { type: 10, content: `### Mevcut Rütbe ve Hedef Rütbe\n**${currentRankName}** -> **${targetRole.rankName}**` },
                            { type: 14, spacing: 1 },
                            { type: 10, content: `### Rütbe İlerlemesi\n${progressBar} \`%${progressPercent}\`\n\`${currentXP.toFixed(1)} / ${targetXP} XP\`` },
                            { type: 14, spacing: 1 },
                            { type: 10, content: `### Zorunlu Görev Durumu\n${statusIcon} \`${completedWeeks} / ${requiredWeeks2}\` hafta (${mandatoryStatus})` },
                            { type: 14, spacing: 1 },
                            { type: 10, content: `-# Manuel yükseltme için ${requiredWeeks2} hafta zorunlu görev tamamlama gereklidir.` },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 2,
                                        custom_id: `manual_promo_${member.id}_${targetRole._id}`,
                                        label: "Yetkiyi Yükselt",
                                        style: mandatoryMet ? 3 : 2,
                                        disabled: !mandatoryMet
                                    }
                                ]
                            }
                        ]
                    }
                ];

                completionLog.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
            }
        }
    }
}

module.exports = XPManager;
