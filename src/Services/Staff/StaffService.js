const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TaskSettings = require("../../Core/Database/TaskSettings");
const StaffUser = require("../../Core/Database/StaffUser");
const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
const MandatoryTaskLog = require("../../Core/Database/MandatoryTaskLog");
const MandatoryTaskConfig = require("../../Core/Database/MandatoryTaskConfig");
const MandatoryProgress = require("../../Core/Database/MandatoryProgress");
const StaffGlobalSettings = require("../../Core/Database/StaffGlobalSettings");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const TaskManager = require("../../Core/Handlers/TaskManager");
const moment = require("moment");

function formatVoice(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}s ${m}d`;
}

class StaffService {
    static async sendTaskPanel(client, ctx, targetUser, member) {
        if (!member) {
            const errorOptions = { content: "Belirtilen kullanıcı sunucuda bulunamadı.", flags: [MessageFlags.Ephemeral] };
            if (ctx.isCommand && ctx.isCommand()) {
                return (ctx.deferred || ctx.replied) ? await ctx.editReply(errorOptions) : await ctx.reply(errorOptions);
            }
            return await ctx.channel.send(errorOptions);
        }

        const guildID = member.guild.id;
        const userID = member.id;
        const allRanks = await StaffRoleSystem.find({ guildID, active: true }).sort({ requiredXP: 1 });
        const isStaff = allRanks.some(r => member.roles.cache.has(r.roleID));

        if (!isStaff) {
            const errorOptions = { content: "Bu komutu sadece yetkililer veya yetkili hedefler kullanabilir.", flags: [MessageFlags.Ephemeral] };
            if (ctx.isCommand && ctx.isCommand()) {
                return (ctx.deferred || ctx.replied) ? await ctx.editReply(errorOptions) : await ctx.reply(errorOptions);
            }
            return await ctx.channel.send(errorOptions);
        }

        await TaskManager.validateTasks(member);
        await TaskManager.assignRandomTasks(member);

        const userData = await StaffUser.findOne({ guildID, userID });
        const emojis = ConfigManager.get("Emojis") || {};

        const getProgressBar = (percentage, barLength = 8) => {
            const emptyStart = emojis.bar_empty_start || "░";
            const emptyMid = emojis.bar_empty_mid || "░";
            const emptyEnd = emojis.bar_empty_end || "░";
            const fillStart = emojis.bar_full_start || "█";
            const fillMid = emojis.bar_full_mid || "█";
            const fillEnd = emojis.bar_full_end || "█";
            const filledCount = Math.round((percentage / 100) * barLength);
            let bar = "";
            for (let i = 1; i <= barLength; i++) {
                if (i === 1) bar += (filledCount >= i ? fillStart : emptyStart);
                else if (i === barLength) bar += (filledCount >= i ? fillEnd : emptyEnd);
                else bar += (filledCount >= i ? fillMid : emptyMid);
            }
            return bar;
        };

        const currentXP = userData ? userData.totalXP : 0;
        const sortedRanks = [...allRanks].sort((a, b) => a.requiredXP - b.requiredXP);
        const currentRankObj = sortedRanks.filter(r => member.roles.cache.has(r.roleID)).pop() || sortedRanks.find(r => r.requiredXP <= currentXP);
        let nextRankObj = null;

        if (currentRankObj) {
            const idx = sortedRanks.findIndex(r => r._id.toString() === currentRankObj._id.toString());
            nextRankObj = sortedRanks[idx + 1] || null;
        } else {
            nextRankObj = sortedRanks[0];
        }

        const nextRankName = nextRankObj ? (member.guild.roles.cache.get(nextRankObj.roleID)?.name || "Son Rütbe") : "Son Rütbe";
        const maxXP = nextRankObj ? nextRankObj.requiredXP : (currentRankObj ? currentRankObj.requiredXP : currentXP);

        const categoryEmojis = {
            "MESSAGE": emojis.toji_chat || "💬", "VOICE": emojis.toji_voice || "🔊", "PUBLIC_VOICE": emojis.toji_voice || "🔊",
            "INVITE": emojis.toji_invite || "📩", "TICKET": emojis.toji_ticket || "🎫",
            "SORUN": emojis.toji_info || "🛠️",
            "EVENT_MANAGE": emojis.toji_sign || "📅", "EVENT_PARTICIPATE": emojis.confetti || "🎉",
            "PARTNER": emojis.toji_partner || "🤝",
            "BUMP": emojis.pr_community || "🚀", "VOTE": emojis.toji_sparkly || "🗳️",
            "REVIEW": emojis.toji_gengar || "⭐", "STREAM": "🎬"
        };

        const formatTaskBar = (emoji, label, current, total, percentage, xpText = "") => {
            const bar = getProgressBar(percentage, 6);
            const truncLabel = (label.length > 14 ? label.slice(0, 13) + "…" : label).padEnd(14);
            const hakStr = `${current}/${total}`.padStart(7);
            if (xpText) { return `${emoji} ${bar} \`${truncLabel}\` \`${hakStr}\` \`${xpText.padStart(9)}\``; }
            return `${emoji} ${bar} \`${truncLabel}\` \`${hakStr}\``;
        };

        const taskDefs = await TaskSettings.find({ _id: { $in: userData?.activeTasks?.map(t => t.taskID) || [] } });
        let taskLines = [];
        if (userData?.activeTasks) {
            for (const activeTask of userData.activeTasks) {
                const taskDef = taskDefs.find(t => t._id.equals(activeTask.taskID));
                if (!taskDef) continue;
                let taskLimit = taskDef.limitCount || 0;
                let stretchLimit = 0;
                if (taskDef.roleLimits) {
                    for (const rl of taskDef.roleLimits) {
                        if (member.roles.cache.has(String(rl.roleID))) {
                            if (rl.limitCount > taskLimit || (rl.limitCount === taskLimit && rl.stretchLimit > stretchLimit)) {
                                taskLimit = rl.limitCount;
                                stretchLimit = rl.stretchLimit || 0;
                            }
                        }
                    }
                }
                const catStat = (userData.categoryStats || []).find(s => s.category === taskDef.taskCategory);
                const count = catStat ? catStat.count : 0;

                let earnedXP = 0;
                if (taskLimit > 0) {
                    const fullXpCount = Math.min(count, taskLimit);
                    earnedXP += fullXpCount * taskDef.rewardXP;

                    if (count > taskLimit) {
                        const remainingCount = count - taskLimit;
                        if (stretchLimit > 0) {
                            const halfXpCount = Math.min(remainingCount, stretchLimit - taskLimit);
                            earnedXP += halfXpCount * (taskDef.rewardXP / 2);
                        } else {
                            earnedXP += remainingCount * (taskDef.rewardXP / 2);
                        }
                    }
                } else if (taskLimit === 0 && stretchLimit > 0) {
                    const halfXpCount = Math.min(count, stretchLimit);
                    earnedXP += halfXpCount * (taskDef.rewardXP / 2);
                } else {
                    earnedXP = count * taskDef.rewardXP;
                }

                const isOver = taskLimit > 0 && count > taskLimit;
                const isOverStretch = stretchLimit > 0 && count > stretchLimit;
                const effectiveMax = stretchLimit > 0 ? stretchLimit : taskLimit;
                const dispLimit = effectiveMax > 0 ? effectiveMax : "∞";
                const pct = effectiveMax > 0 ? Math.round((count / effectiveMax) * 100) : 0;
                let xpTag = `+${earnedXP.toFixed(1)}`;
                if (isOverStretch) xpTag += " (x0)";
                else if (isOver) xpTag += " (x0.5)";
                taskLines.push(formatTaskBar(categoryEmojis[taskDef.taskCategory] || "📌", taskDef.taskName, count, dispLimit, pct, xpTag));
            }
        }

        const mdtConfig = currentRankObj ? await MandatoryTaskConfig.findOne({ guildID, rankRoleID: currentRankObj.roleID }) : null;
        const globalSettings = await StaffGlobalSettings.findOne({ guildID });
        const progress = await MandatoryProgress.findOne({ guildID, userID: member.id });

        let voiceGoal = mdtConfig?.voiceGoal || 0;
        let pubVoiceGoal = mdtConfig?.publicVoiceGoal || 0;
        let msgGoal = mdtConfig?.messageGoal || 0;
        let inviteGoal = mdtConfig?.inviteGoal || 0;

        let totalStretch = mdtConfig?.stretchPercentage || 0;
        if (globalSettings?.stretchPlans?.length > 0 && mdtConfig?.planModifiers?.length > 0) {
            for (const plan of globalSettings.stretchPlans) {
                if (member.roles.cache.has(plan.roleID) || (plan.roleIDs && plan.roleIDs.some(rid => member.roles.cache.has(rid)))) {
                    const planMod = mdtConfig.planModifiers.find(pm => pm.planName === plan.name);
                    if (planMod) totalStretch += planMod.percentage;
                }
            }
        }

        const factor = 1 + (totalStretch / 100);
        voiceGoal = Math.max(0, Math.round(voiceGoal * factor));
        pubVoiceGoal = Math.max(0, Math.round(pubVoiceGoal * factor));
        msgGoal = Math.max(0, Math.round(msgGoal * factor));
        inviteGoal = Math.max(0, Math.round(inviteGoal * factor));

        if (mdtConfig?.roleModifiers) {
            for (const mod of mdtConfig.roleModifiers) {
                if (member.roles.cache.has(mod.roleID)) {
                    if (mod.modifierType === "PERCENT") {
                        const f = 1 + (mod.modifierValue / 100);
                        voiceGoal = Math.round(voiceGoal * f);
                        pubVoiceGoal = Math.round(pubVoiceGoal * f);
                        msgGoal = Math.round(msgGoal * f);
                        inviteGoal = Math.round(inviteGoal * f);
                    }
                    else {
                        voiceGoal += mod.modifierValue;
                        pubVoiceGoal += mod.modifierValue;
                        msgGoal += mod.modifierValue;
                        inviteGoal += mod.modifierValue;
                    }
                }
            }
        }

        const cVoice = Math.floor((progress?.voiceMs || 0) / 60000);
        const cPubVoice = Math.floor((progress?.publicVoiceMs || 0) / 60000);
        const cMsg = progress?.messageCount || 0;
        const cInvite = progress?.inviteCount || 0;

        const ovVoice = Math.floor((progress?.overflowVoiceMs || 0) / 60000);
        const ovPubVoice = Math.floor((progress?.overflowPublicVoiceMs || 0) / 60000);
        const ovMsg = progress?.overflowMessageCount || 0;
        const ovInvite = progress?.overflowInviteCount || 0;
        const ovXP = userData?.overflowXP || 0;

        const vPct = voiceGoal > 0 ? Math.round((cVoice / voiceGoal) * 100) : 100;
        const pvPct = pubVoiceGoal > 0 ? Math.round((cPubVoice / pubVoiceGoal) * 100) : 100;
        const mPct = msgGoal > 0 ? Math.round((cMsg / msgGoal) * 100) : 100;
        const iPct = inviteGoal > 0 ? Math.round((cInvite / inviteGoal) * 100) : 100;

        const vPctCapped = Math.min(100, vPct);
        const pvPctCapped = Math.min(100, pvPct);
        const mPctCapped = Math.min(100, mPct);
        const iPctCapped = Math.min(100, iPct);
        
        let goalCount = 0;
        let totalPct = 0;
        if (voiceGoal > 0) { goalCount++; totalPct += vPctCapped; }
        if (pubVoiceGoal > 0) { goalCount++; totalPct += pvPctCapped; }
        if (msgGoal > 0) { goalCount++; totalPct += mPctCapped; }
        if (inviteGoal > 0) { goalCount++; totalPct += iPctCapped; }
        const weeklyTaskAvg = goalCount > 0 ? totalPct / goalCount : 100;

        const xpProgressPercentage = maxXP > 0 ? Math.max(0, Math.round((currentXP / maxXP) * 100)) : 100;

        const overallPercentage = Math.round((xpProgressPercentage * 0.70) + (weeklyTaskAvg * 0.30));

        const combinedTopText = `>>> ### ${emojis.toji_staff || "👤"} <@${member.id}> Profil Kartı\n` +
            `**Hedef Rütbe:** \`${nextRankName}\`${nextRankObj?.autoPromotion ? " (Otomatik)" : ""}\n` +
            `**Haftalık Görev İlerlemesi:** ${getProgressBar(overallPercentage, 6)} \`%${overallPercentage}\``;

        const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 256 });

        const voiceBar = getProgressBar(vPct, 6);
        const pubVoiceBar = getProgressBar(pvPct, 6);
        const msgBar = getProgressBar(mPct, 6);
        const inviteBar = getProgressBar(iPct, 6);

        const ovVoicePct = voiceGoal > 0 ? (ovVoice / voiceGoal) * 100 : 0;
        const ovPubVoicePct = pubVoiceGoal > 0 ? (ovPubVoice / pubVoiceGoal) * 100 : 0;
        const ovMsgPct = msgGoal > 0 ? (ovMsg / msgGoal) * 100 : 0;
        const ovInvitePct = inviteGoal > 0 ? (ovInvite / inviteGoal) * 100 : 0;

        const mandatoryText =
            `> ${categoryEmojis["VOICE"]} ${voiceBar} **Genel Ses:** \`${formatVoice(cVoice)} / ${formatVoice(voiceGoal)}\` \`%${Math.round(vPct)}${ovVoice > 0 ? ` (+%${Math.round(ovVoicePct)})` : ""}\`\n` +
            `> ${categoryEmojis["VOICE"]} ${pubVoiceBar} **Public Ses:** \`${formatVoice(cPubVoice)} / ${formatVoice(pubVoiceGoal)}\` \`%${Math.round(pvPct)}${ovPubVoice > 0 ? ` (+%${Math.round(ovPubVoicePct)})` : ""}\`\n` +
            `> ${categoryEmojis["MESSAGE"]} ${msgBar} **Mesaj:** \`${cMsg} / ${msgGoal} adet\` \`%${Math.round(mPct)}${ovMsg > 0 ? ` (+%${Math.round(ovMsgPct)})` : ""}\`\n` +
            `> ${categoryEmojis["INVITE"] || "📩"} ${inviteBar} **Davet:** \`${cInvite} / ${inviteGoal} adet\` \`%${Math.round(iPct)}${ovInvite > 0 ? ` (+%${Math.round(ovInvitePct)})` : ""}\``;

        let multiplierText = "";
        let multiplier = 1.0;
        let reasons = [];
        let totalBonus = 0;
        let totalPenalty = 0;

        if (currentRankObj) {
            if (currentRankObj.xpMultiplierRoles && currentRankObj.xpMultiplierRoles.length > 0) {
                for (const mr of currentRankObj.xpMultiplierRoles) {
                    if (member.roles.cache.has(mr.roleID)) {
                        const bonus = (mr.multiplier - 1.0);
                        multiplier += bonus;
                        totalBonus += bonus;
                        reasons.push(`${emojis.toji_nokta || "•"} <@&${mr.roleID}> → **x${mr.multiplier}**`);
                    }
                }
            }
        }

        if (globalSettings) {
            const globalMults = globalSettings.xpMultipliers || [];
            for (const gm of globalMults) {
                if (member.roles.cache.has(gm.roleID)) {
                    const bonus = (gm.multiplier - 1.0);
                    multiplier += bonus;
                    totalBonus += bonus;
                    reasons.push(`${emojis.toji_nokta || "•"} <@&${gm.roleID}> → **x${gm.multiplier}**`);
                }
            }
            const globalRespRoles = globalSettings.responsibilityRoles || [];
            if (currentRankObj && globalRespRoles.length > 0 && currentRankObj.responsibilityLimit > 0) {
                const respCount = globalRespRoles.filter(rID => member.roles.cache.has(rID)).length;
                const excess = Math.max(0, respCount - currentRankObj.responsibilityLimit);
                if (excess > 0 && currentRankObj.responsibilityPenalty > 0) {
                    const penalty = excess * currentRankObj.responsibilityPenalty;
                    multiplier = Math.max(0.1, multiplier - penalty);
                    totalPenalty += penalty;
                    reasons.push(`${emojis.toji_info || ""} **${excess}** fazla sorumluluk → **-${penalty.toFixed(1)}x**`.trim());
                }
            }
        }

        if (member.roles.cache.some(r => r.name === "Forum Sorumlusu")) {
            multiplier += 0.1;
            totalBonus += 0.1;
            reasons.push(`${emojis.toji_nokta || "•"} Forum Sorumlusu → **x1.1**`);
        }
        if (member.roles.cache.some(r => r.name === "Forum Lideri")) {
            multiplier += 0.3;
            totalBonus += 0.3;
            reasons.push(`${emojis.toji_nokta || "•"} Forum Lideri → **x1.3**`);
        }

        if (reasons.length > 4) {
            const extraCount = reasons.length - 4;
            reasons = reasons.slice(0, 4);
            reasons.push(`+ ${extraCount} rol daha...`);
        }
        if (reasons.length > 0) {
            multiplierText = `-# **${emojis.toji_sparkly || ""} XP Çarpanı: x${multiplier.toFixed(1)}** (Bonus: \`+${totalBonus.toFixed(1)}x\` | Ceza: \`-${totalPenalty.toFixed(1)}x\`)`.trim() + '\n' +
                reasons.map(r => `-# ${r}`).join("\n");
        } else {
            multiplierText = `-# **${emojis.toji_sparkly || ""} XP Çarpanı: x1.0**`.trim();
        }

        const completedWeeksCount = await MandatoryTaskLog.countDocuments({ guildID, userID: member.id, status: "COMPLETED" });
        const weekReqForAvg = nextRankObj ? (nextRankObj.mandatoryWeeks || 2) : 0;
        const weekInfo = (nextRankObj?.autoPromotion) ? "" : `-# **Atlama Şartı: ${completedWeeksCount} / ${weekReqForAvg > 1 && nextRankObj?.autoPromotion ? 1 : weekReqForAvg} hafta tamamlandı**`.trim();

        const splitText = (text, maxLength = 1500) => {
            if (!text) return [];
            const chunks = [];
            if (text.length <= maxLength) return [{ type: 10, content: text }];
            let current = text;
            while (current.length > 0) {
                if (current.length <= maxLength) { chunks.push({ type: 10, content: current }); break; }
                let slice = current.slice(0, maxLength);
                let lastNewline = slice.lastIndexOf("\n");
                if (lastNewline > maxLength * 0.5) { chunks.push({ type: 10, content: current.slice(0, lastNewline) }); current = current.slice(lastNewline + 1); }
                else { chunks.push({ type: 10, content: current.slice(0, maxLength) }); current = current.slice(maxLength); }
            }
            return chunks;
        };

        const serverOpXp = userData ? (userData.serverOperationXP || 0) : 0;
        const maxSrvXp = currentRankObj ? (currentRankObj.maxServerXP || 0) : 0;
        const srvPct = maxSrvXp > 0 ? Math.min(100, Math.round((serverOpXp / maxSrvXp) * 100)) : 0;
        const srvXpLines = `\n\n### 💻 Sunucu İşleri\n${getProgressBar(srvPct, 12)} \`%${srvPct}\`\n**Sunucu İşi XP:** \`${serverOpXp.toFixed(1)} / ${maxSrvXp} XP\``;

        let weeklyTagGain = 0;
        let weeklyTagLoss = 0;
        if (userData?.history) {
            const startOfLastMonday = moment().startOf('isoWeek');
            const weeklyTagHistory = userData.history.filter(h =>
                (h.reason === "DAILY_TAG_XP" || h.reason === "DAILY_TAG_PENALTY") &&
                moment(h.date).isSameOrAfter(startOfLastMonday)
            );
            weeklyTagHistory.forEach(h => {
                if (h.amountXP > 0) weeklyTagGain += h.amountXP;
                else weeklyTagLoss += Math.abs(h.amountXP);
            });
        }
        const tagXpText = `### ${emojis.toji_sparkly || "🏷️"} Tag XP Bilgisi (Bu Hafta)\n` +
            `> **Kazanılan:** \`+${weeklyTagGain.toFixed(1)} XP\` | **Kaybedilen:** \`-${weeklyTagLoss.toFixed(1)} XP\`\n` +
            `> **Toplam Etki:** \`${(weeklyTagGain - weeklyTagLoss).toFixed(1)} XP\``;

        const taskBarHeader = { type: 10, content: formatTaskBar("📋", "Görev", "Limit", "", 0, "XP") };
        const taskListContent = splitText(taskLines.join("\n"), 1000);
        const ovXpPct = maxXP > 0 ? (ovXP / maxXP) * 100 : 0;
        const xpProgressBarLine = `${getProgressBar(xpProgressPercentage, 12)} \`%${xpProgressPercentage.toFixed(1)}${ovXP > 0 ? ` (Aktarılan: %${ovXpPct.toFixed(1)})` : ""}\``;
        const xpInfoLine = `**Toplam Deneyim:** \`${currentXP.toFixed(1)} / ${maxXP} XP\` (Hedef: \`${(maxXP - currentXP).toFixed(1)}\` XP)${ovXP > 0 ? ` (Aktarılan: \`${ovXP.toFixed(1)}\` XP)` : ""}${srvXpLines}`;

        const sections = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: avatarURL } },
                        components: [{ type: 10, content: combinedTopText }]
                    }
                ]
            },
            {
                type: 17,
                components: [
                    { type: 10, content: `### ${emojis.toji_sign || ""} Zorunlu Haftalık Görevler (\`${moment().isoWeekYear()}-W${String(moment().isoWeek()).padStart(2, "0")}\`)` },
                    { type: 10, content: mandatoryText }
                ]
            },
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `### ${emojis.toji_sparkly || ""} Deneyim Bilgisi\n${xpProgressBarLine}\n${xpInfoLine}`
                    }
                ]
            },
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: tagXpText
                    }
                ]
            }
        ];

        const combinedInitialSection = {
            type: 17,
            components: sections.map(s => s.components).flat().reduce((acc, curr, idx, arr) => {
                acc.push(curr);
                if (idx < arr.length - 1 && arr[idx + 1].type !== 14 && curr.type !== 14) {
                    acc.push({ type: 14, divider: true, spacing: 1 });
                }
                return acc;
            }, [])
        };

        const taskSections = [];
        let currentTaskBatch = [taskBarHeader];
        let currentBatchChars = 0;
        for (const taskLineComp of taskListContent) {
            const lineLen = taskLineComp.content.length;
            if (currentBatchChars + lineLen > 2500) {
                taskSections.push({ type: 17, components: currentTaskBatch });
                currentTaskBatch = [];
                currentBatchChars = 0;
            }
            currentTaskBatch.push(taskLineComp);
            currentBatchChars += lineLen;
        }
        if (currentTaskBatch.length > 0) taskSections.push({ type: 17, components: currentTaskBatch });

        const footerSection = {
            type: 17,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            label: "Limit Sistemi Nedir?",
                            custom_id: "tasks_system_rules_btn"
                        },
                        {
                            type: 2,
                            style: 2,
                            label: "Güncel Limitlerim",
                            custom_id: `tasks_current_limits_btn_${userID}`
                        }
                    ]
                },
                { type: 10, content: `${multiplierText}\n${weekInfo}` }
            ]
        };

        const messageChunks = [
            [combinedInitialSection],
            ...taskSections.map(ts => [ts]),
            [footerSection]
        ];

        let isFirst = true;
        for (const comps of messageChunks) {
            const payload = {
                flags: [MessageFlags.IsComponentsV2],
                components: comps,
                allowedMentions: { parse: [] }
            };

            if (isFirst && ctx.isCommand && ctx.isCommand()) {
                if (ctx.deferred || ctx.replied) {
                    await ctx.editReply(payload);
                } else {
                    await ctx.reply(payload);
                }
            } else if (ctx.channel) {
                await ctx.channel.send(payload);
            }
            isFirst = false;
        }
    }
}

module.exports = StaffService;
