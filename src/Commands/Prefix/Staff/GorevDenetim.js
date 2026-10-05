const { PermissionsBitField, MessageFlags } = require("discord.js");
const StaffUser = require("../../../Core/Database/StaffUser");
const StaffRoleSystem = require("../../../Core/Database/StaffRoleSystem");
const MandatoryTaskConfig = require("../../../Core/Database/MandatoryTaskConfig");
const MandatoryTaskLog = require("../../../Core/Database/MandatoryTaskLog");
const MandatoryProgress = require("../../../Core/Database/MandatoryProgress");
const StaffManager = require("../../../Core/Handlers/StaffManager");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const moment = require("moment");
require("moment-duration-format");
moment.locale("tr");

function getWeekKey(m = moment()) {
    return `${m.isoWeekYear()}-W${String(m.isoWeek()).padStart(2, "0")}`;
}

function formatVoice(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}s ${m}d`;
}

module.exports = {
    conf: {
        description: "Görevdenetim komutunu yönetmenizi sağlar.",
        aliases: ["görevdenetim", "gorevdenetim", "görev-denetim", "gdenetim", "denetim"],
        name: "görevdenetim",
        help: "görevdenetim <@kullanıcı/ID> veya <@rol/ID>",
        category: "Staff"
    },

    run: async (client, message, args) => {
        const allowedRoles = ConfigManager.get("Roles.Responsibilities.TaskStaff") || [];
        const hasPermission = ConfigManager.isOwner(message.member) || allowedRoles.some(r => message.member.roles.cache.has(r));
        if (!hasPermission) return;

        if (!args[0]) return message.reply("Lütfen denetlenecek bir kullanıcı veya rol belirtin.");

        const roleOpt = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        const userOpt = !roleOpt ? (message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null)) : null;

        if (!userOpt && !roleOpt) {
            return message.reply("Lütfen geçerli bir kullanıcı veya rol belirtin.");
        }

        const guildID = message.guild.id;
        const emojis = ConfigManager.get("Emojis") || {};
        const { toji_sparkly, toji_nokta } = emojis;
        const dot = toji_nokta || "•";

        const allRanks = await StaffRoleSystem.find({ guildID, active: true }).sort({ requiredXP: 1 });
        const staffIDs = allRanks.map(r => r.roleID);

        let targetMembers = [];

        if (roleOpt) {
            targetMembers = Array.from(roleOpt.members.values()).filter(m => !m.user.bot && staffIDs.some(rid => m.roles.cache.has(rid)));
            if (targetMembers.length === 0) {
                return message.reply("Seçilen rolde aktif yetkili bulunamadı.");
            }
        } else {
            const isStaff = staffIDs.some(roleID => userOpt.roles.cache.has(roleID));
            if (!isStaff) return message.reply("Belirtilen kullanıcının yetkili rolü bulunmuyor.");
            targetMembers = [userOpt];
        }

        let currentIndex = 0;

        const buildPanel = async (member, index, total) => {
            const currentRank = [...allRanks].reverse().find(r => member.roles.cache.has(r.roleID));
            const nextRank = currentRank ? allRanks[allRanks.indexOf(allRanks.find(r => r._id.toString() === currentRank._id.toString())) + 1] : allRanks[0];
            const prevRank = currentRank ? allRanks[allRanks.indexOf(allRanks.find(r => r._id.toString() === currentRank._id.toString())) - 1] : null;

            let requiredWeeks = currentRank?.mandatoryWeeks || 2;
            if (currentRank?.autoPromotion && requiredWeeks > 1) {
                requiredWeeks = 1;
            }

            const weeksToShow = [];
            for (let i = Math.min(requiredWeeks, 10); i >= 0; i--) {
                weeksToShow.push(getWeekKey(moment().subtract(i, "weeks")));
            }

            const StaffGlobalSettings = require("../../../Core/Database/StaffGlobalSettings");

            const [userData, mandatoryConfig, progress, globalSettings, mandatoryLogs] = await Promise.all([
                StaffUser.findOne({ guildID, userID: member.id }),
                currentRank ? MandatoryTaskConfig.findOne({ guildID, rankRoleID: currentRank.roleID }) : Promise.resolve(null),
                MandatoryProgress.findOne({ guildID, userID: member.id }),
                StaffGlobalSettings.findOne({ guildID }),
                MandatoryTaskLog.find({ guildID, userID: member.id, weekKey: { $in: weeksToShow } })
            ]);

            const currentWeekVoice = Math.floor((progress?.voiceMs || 0) / 60000);
            const currentWeekPublicVoice = Math.floor((progress?.publicVoiceMs || 0) / 60000);
            const currentWeekMessages = progress?.messageCount || 0;
            const currentWeekInvite = progress?.inviteCount || 0;

            const getProgressBar = (current, goal) => {
                const emptyStart = emojis.bar_empty_start || "░";
                const emptyMid = emojis.bar_empty_mid || "░";
                const emptyEnd = emojis.bar_empty_end || "░";
                const fillStart = emojis.bar_full_start || "█";
                const fillMid = emojis.bar_full_mid || "█";
                const fillEnd = emojis.bar_full_end || "█";
                const barLength = 6;

                if (goal <= 0) {
                    let noBar = "";
                    for (let i = 1; i <= barLength; i++) {
                        if (i === 1) noBar += emptyStart;
                        else if (i === barLength) noBar += emptyEnd;
                        else noBar += emptyMid;
                    }
                    return { bar: `${noBar} \`Ayarlanmamış\``, pct: 0 };
                }

                const pct = Math.round((current / goal) * 100);
                const filledCount = Math.round((pct / 100) * barLength);
                let bar = "";
                for (let i = 1; i <= barLength; i++) {
                    if (i === 1) bar += (filledCount >= i ? fillStart : emptyStart);
                    else if (i === barLength) bar += (filledCount >= i ? fillEnd : emptyEnd);
                    else bar += (filledCount >= i ? fillMid : emptyMid);
                }
                return { bar: `${bar} \`${pct}%\``, pct };
            };

            let totalStretch = mandatoryConfig?.stretchPercentage || 0;
            if (globalSettings?.stretchPlans?.length > 0 && mandatoryConfig?.planModifiers?.length > 0) {
                for (const plan of globalSettings.stretchPlans) {
                    if (member.roles.cache.has(plan.roleID) || (plan.roleIDs && plan.roleIDs.some(rid => member.roles.cache.has(rid)))) {
                        const planMod = mandatoryConfig.planModifiers.find(pm => pm.planName === plan.name);
                        if (planMod) totalStretch += planMod.percentage;
                    }
                }
            }

            let voiceGoal = Math.max(0, Math.floor((mandatoryConfig?.voiceGoal || 0) * (1 + (totalStretch / 100))));
            let pubVoiceGoal = Math.max(0, Math.floor((mandatoryConfig?.publicVoiceGoal || 0) * (1 + (totalStretch / 100))));
            let msgGoal = Math.max(0, Math.floor((mandatoryConfig?.messageGoal || 0) * (1 + (totalStretch / 100))));
            let inviteGoal = Math.max(0, Math.floor((mandatoryConfig?.inviteGoal || 0) * (1 + (totalStretch / 100))));

            if (mandatoryConfig?.roleModifiers && mandatoryConfig.roleModifiers.length > 0) {
                for (const mod of mandatoryConfig.roleModifiers) {
                    if (member.roles.cache.has(mod.roleID)) {
                        if (mod.modifierType === "PERCENT") {
                            const f = 1 + (mod.modifierValue / 100);
                            voiceGoal = Math.round(voiceGoal * f);
                            pubVoiceGoal = Math.round(pubVoiceGoal * f);
                            msgGoal = Math.round(msgGoal * f);
                            inviteGoal = Math.round(inviteGoal * f);
                        } else {
                            voiceGoal += mod.modifierValue;
                            pubVoiceGoal += mod.modifierValue;
                            msgGoal += mod.modifierValue;
                            inviteGoal += mod.modifierValue;
                        }
                    }
                }
            }

            const vpb = getProgressBar(currentWeekVoice, voiceGoal);
            const ppb = getProgressBar(currentWeekPublicVoice, pubVoiceGoal);
            const mpb = getProgressBar(currentWeekMessages, msgGoal);
            const ipb = getProgressBar(currentWeekInvite, inviteGoal);

            const statusMap = { "COMPLETED": `${emojis.toji_onay || ""} Tamamlandı`.trim(), "FAILED": `${emojis.toji_iptal || ""} Tamamlanamadı`.trim(), "HOLD": `${emojis.toji_time || ""} Sabit Kaldı`.trim(), "PENDING": `${emojis.toji_info || ""} Beklemede`.trim() };
            const actionMap = { "PROMOTE": `Yükseltildi`.trim(), "DEMOTE": `Düşürüldü`.trim(), "HOLD": `Sabit`.trim(), "COMPLETE": `Tamamladı`.trim() };

            const lastPromotion = null; // Removed StaffHistory
            let promotionWeekKey = null;
            let promotionOldRankName = null;
            let promotionNewRankName = null;
            if (lastPromotion) {
                const promoMoment = moment(lastPromotion.date);
                promotionWeekKey = getWeekKey(promoMoment);
                promotionOldRankName = lastPromotion.oldRankName || "Bilinmiyor";
                promotionNewRankName = lastPromotion.newRankName || "Bilinmiyor";
            }

            let multiplierInfo = "Yok";
            let totalMult = 1.0;
            let multParts = [];

            if (currentRank?.xpMultiplierRoles?.length > 0) {
                const active = currentRank.xpMultiplierRoles.filter(mr => member.roles.cache.has(mr.roleID));
                for (const a of active) {
                    totalMult += (a.multiplier - 1.0);
                    multParts.push(`<@&${a.roleID}> (x${a.multiplier.toFixed(1)})`);
                }
            }
            if (globalSettings?.xpMultipliers?.length > 0) {
                const activeG = globalSettings.xpMultipliers.filter(gm => member.roles.cache.has(gm.roleID));
                for (const g of activeG) {
                    totalMult += (g.multiplier - 1.0);
                    multParts.push(`<@&${g.roleID}> (Global x${g.multiplier.toFixed(1)})`);
                }
            }

            if (multParts.length > 0) {
                multiplierInfo = `**x${totalMult.toFixed(1)}** — ${multParts.join(", ")}`;
                if (multiplierInfo.length > 150) multiplierInfo = multiplierInfo.substring(0, 147) + "...";
            }

            let respInfo = "Ayarlanmamış";
            if (globalSettings && globalSettings.responsibilityRoles && currentRank?.responsibilityLimit > 0) {
                const count = globalSettings.responsibilityRoles.filter(rID => member.roles.cache.has(rID)).length;
                respInfo = `\`${count}\` / \`${currentRank.responsibilityLimit || "∞"}\` Sorumluluk`;
                if (count > currentRank.responsibilityLimit) {
                    const excess = count - currentRank.responsibilityLimit;
                    respInfo += ` ${emojis.toji_info || ""} (${excess} fazla → -${(excess * (currentRank.responsibilityPenalty || 0)).toFixed(1)}x)`.trim();
                    totalMult = Math.max(0.1, totalMult - (excess * (currentRank.responsibilityPenalty || 0)));
                }
            }

            const totalXP = userData?.totalXP?.toFixed(1) || "0";
            const weeklyXP = userData?.weeklyXP?.toFixed(1) || "0";
            const completedTasks = userData?.completedTasks || 0;
            const currentRankName = currentRank ? (message.guild.roles.cache.get(currentRank.roleID)?.name || currentRank.rankName || "Bilinmiyor") : "Bilinmiyor";
            const nextRankName = nextRank ? (message.guild.roles.cache.get(nextRank.roleID)?.name || nextRank.rankName || "Son Rütbe") : "Son Rütbe";

            const completedWeeks = mandatoryLogs.filter(l => l.status === "COMPLETED" && (!promotionWeekKey || l.weekKey > promotionWeekKey)).length;

            const weekHistoryLines = weeksToShow.map(wk => {
                if (wk === promotionWeekKey) {
                    return `> \`${wk}\` — ${emojis.toji_sparkly || "⭐"} Rütbe Atladı **${promotionOldRankName}** → **${promotionNewRankName}**`;
                }
                const log = mandatoryLogs.find(l => l.weekKey === wk);
                if (!log) return `> \`${wk}\` — ${emojis.toji_nokta || ""} Kayıt Yok`.trim();
                let line = `> \`${wk}\` — ${statusMap[log.status] || log.status}`;
                if (log.reviewAction && log.reviewAction !== log.status) line += ` | ${actionMap[log.reviewAction] || log.reviewAction}`;
                return line;
            }).join("\n");

            const xpb = getProgressBar(userData?.totalXP || 0, nextRank ? nextRank.requiredXP : (userData?.totalXP || 0));

            const vPct = voiceGoal > 0 ? Math.min(100, Math.round((currentWeekVoice / voiceGoal) * 100)) : 100;
            const pvPct = pubVoiceGoal > 0 ? Math.min(100, Math.round((currentWeekPublicVoice / pubVoiceGoal) * 100)) : 100;
            const mPct = msgGoal > 0 ? Math.min(100, Math.round((currentWeekMessages / msgGoal) * 100)) : 100;
            const iPct = inviteGoal > 0 ? Math.min(100, Math.round((currentWeekInvite / inviteGoal) * 100)) : 100;
            
            let goalCount = 0;
            let totalPct = 0;
            if (voiceGoal > 0) { goalCount++; totalPct += vPct; }
            if (pubVoiceGoal > 0) { goalCount++; totalPct += pvPct; }
            if (msgGoal > 0) { goalCount++; totalPct += mPct; }
            if (inviteGoal > 0) { goalCount++; totalPct += iPct; }
            const weeklyTaskAvg = goalCount > 0 ? totalPct / goalCount : 100;

            const statusText = weeklyTaskAvg >= 100
                ? `${emojis.toji_onay || ""} Tamamlandı`
                : weeklyTaskAvg >= 50
                    ? `${emojis.toji_time || ""} Devam Ediyor`
                    : `${emojis.toji_iptal || ""} Yetersiz`;

            const componentsArr = [
                {
                    type: 10,
                    content:
                        `> ### ${emojis.toji_sparkly || ""} ${member} Denetim Paneli \`(${index + 1}/${total})\`
` +
                        `> ${dot} **Rütbe:** \`${currentRankName}\` │ **Haftalık XP:** \`${weeklyXP}\` │ **Toplam XP:** \`${totalXP}\`
` +
                        `> ${dot} **Görev Durumu:** ${statusText} │ **Tamamlanan:** \`${completedTasks}\`
` +
                        `> ${dot} **Hafta:** \`${getWeekKey()}\` │ **Gerekli Hafta:** \`${completedWeeks} / ${requiredWeeks}\`
` +
                        `> -# ${emojis.toji_bluestar || ""} ${member.user.tag} \`(${member.id})\``.trim()
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content:
                        `> ### ${emojis.toji_bluestar || ""} Haftalık Zorunlu Görevler
` +
                        `> ${emojis.toji_voice || ""} **Ses:**
` +
                        `> ${vpb.bar} │ \`${currentWeekVoice} / ${voiceGoal}\`
` +
                        `> 
` +
                        `> ${emojis.toji_voice || ""} **Public Ses:**
` +
                        `> ${ppb.bar} │ \`${currentWeekPublicVoice} / ${pubVoiceGoal}\`
` +
                        `> 
` +
                        `> ${emojis.toji_message || ""} **Mesaj:**\n` +
                        `> ${mpb.bar} │ \`${currentWeekMessages} / ${msgGoal}\`\n` +
                        `> \n` +
                        `> ${emojis.toji_message || ""} **Davet:**\n` +
                        `> ${ipb.bar} │ \`${currentWeekInvite} / ${inviteGoal}\`\n` +
                        `> \n` +
                        `> ${emojis.toji_sparkly || ""} **XP İlerleme:**
` +
                        `> ${xpb.bar} │ \`${totalXP} / ${nextRank ? nextRank.requiredXP : "Son Rütbe"}\``
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `> ### ${emojis.toji_bluestar || ""} Geçmiş Hafta Kayıtları\n${weekHistoryLines}\n> -# Atlama Şartı: \`${completedWeeks} / ${requiredWeeks}\` hafta tamamlandı ${currentRank?.autoPromotion ? "(Otomatik)" : ""}`.trim()
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `> ### ${emojis.toji_sparkly || ""} XP Çarpanı & Sorumluluk\n> ${dot} **Aktif Çarpan:** ${multiplierInfo}\n> ${dot} **Sorumluluk:** ${respInfo}\n> ${dot} **Sonraki Rütbe:** \`${nextRankName}\``.trim()
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, custom_id: `gd_promote_${member.id}`, label: "Yükselt", style: 3, disabled: !nextRank },
                        { type: 2, custom_id: `gd_demote_${member.id}`, label: "Düşür", style: 4, disabled: !prevRank },
                        { type: 2, custom_id: `gd_hold_${member.id}`, label: "Sabit", style: 2 },
                        { type: 2, custom_id: `gd_complete_${member.id}`, label: "Görev Tamamladı", style: 1 },
                        { type: 2, custom_id: `gd_reset_${member.id}`, label: "Sıfırla", style: 4 }
                    ]
                }
            ];
            if (total > 1) {
                componentsArr.push(
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "gd_prev", label: "◀ Önceki", style: 2, disabled: index === 0 },
                            { type: 2, custom_id: "gd_next", label: "Sonraki ▶", style: 2, disabled: index === total - 1 },
                            { type: 2, custom_id: "gd_close", label: "Paneli Kapat", style: 4 }
                        ]
                    }
                );
            }

            return [{
                type: 17,
                components: componentsArr
            }];
        };

        const msg = await message.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: await buildPanel(targetMembers[currentIndex], currentIndex, targetMembers.length),
            allowedMentions: { parse: [] }
        });

        const collector = msg.createMessageComponentCollector({ time: 900000 }); 

        collector.on("collect", async (i) => {
            const allowedRoles = ConfigManager.get("Roles.Responsibilities.TaskStaff") || [];
            const hasPermission = ConfigManager.isOwner(i.member) || allowedRoles.some(r => i.member.roles.cache.has(r));
            if (!hasPermission) {
                return i.reply({ content: "Bu paneli sadece yetkililer kullanabilir.", ephemeral: true });
            }

            await i.deferUpdate().catch(() => {});

            const currentWeek = getWeekKey();
            let actionMsg = "";

            if (i.customId === "gd_prev") {
                if (currentIndex > 0) currentIndex--;
                await i.editReply({ components: await buildPanel(targetMembers[currentIndex], currentIndex, targetMembers.length) }).catch(()=>{});
                return;
            } else if (i.customId === "gd_next") {
                if (currentIndex < targetMembers.length - 1) currentIndex++;
                await i.editReply({ components: await buildPanel(targetMembers[currentIndex], currentIndex, targetMembers.length) }).catch(()=>{});
                return;
            } else if (i.customId === "gd_close") {
                await i.message.delete().catch(() => { });
                return collector.stop();
            }

            const targetID = i.customId.split("_").pop();
            const targetMember = targetMembers.find(m => m.id === targetID);
            if (!targetMember) return i.followUp({ content: "Bu işlem uygulanacak kullanıcı sayfa ile eşleşmiyor.", ephemeral: true });

            const oldPanelForLogging = await buildPanel(targetMember, currentIndex, targetMembers.length);

            const sendUpdateAndLog = async (actionMsg) => {
                let channelLogPanel = JSON.parse(JSON.stringify(oldPanelForLogging));
                if (channelLogPanel.length > 0 && channelLogPanel[0].components) {
                    channelLogPanel[0].components = channelLogPanel[0].components.filter(c => c.type !== 1);
                    while (channelLogPanel[0].components.length > 0 && channelLogPanel[0].components[channelLogPanel[0].components.length - 1].type === 14) {
                        channelLogPanel[0].components.pop();
                    }

                    let panelStr = JSON.stringify(channelLogPanel);
                    panelStr = panelStr.replace(/ — \(\d+\/\d+\)/g, "");
                    channelLogPanel = JSON.parse(panelStr);

                    channelLogPanel[0].components.push({ type: 14, divider: true, spacing: 1 }, { type: 10, content: actionMsg });
                }

                if (targetMembers.length > 1) {
                    await i.channel.send({ components: channelLogPanel, flags: [MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } }).catch(() => { });

                    const freshlyUpdatedPanel = await buildPanel(targetMember, currentIndex, targetMembers.length);
                    if (freshlyUpdatedPanel.length > 0 && freshlyUpdatedPanel[0].components) {
                        freshlyUpdatedPanel[0].components.push({ type: 14, divider: true, spacing: 1 }, { type: 10, content: actionMsg });
                    }
                    await i.editReply({ components: freshlyUpdatedPanel, allowedMentions: { parse: [] } }).catch(() => { });
                } else {
                    await i.editReply({ components: channelLogPanel, flags: [MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } }).catch(() => { });
                    collector.stop();
                }
            };

            const { withLock } = require("../../../Core/Handlers/Lock");

            await withLock(targetMember.id, async () => {
                if (i.customId.startsWith("gd_promote_")) {
                    const currentR = [...allRanks].reverse().find(r => targetMember.roles.cache.has(r.roleID));
                    const nextR = currentR ? allRanks[allRanks.indexOf(allRanks.find(r => r._id.toString() === currentR._id.toString())) + 1] : null;
                    if (!nextR) return i.followUp({ content: "Yükseltilebilecek bir rütbe yok.", ephemeral: true });

                    const primaryRankRoleIDs = allRanks.map(r => r.roleID);
                    const rolesToRemove = primaryRankRoleIDs.filter(id => targetMember.roles.cache.has(id));
                    if (rolesToRemove.length > 0) await targetMember.roles.remove(rolesToRemove).catch(() => { });

                    await targetMember.roles.add(nextR.roleID).catch(() => { });
                    await StaffManager.applyMilestoneRoles(targetMember, nextR);

                    const overflow = await StaffManager.calculateOverflow(targetMember, nextR);
                    await StaffManager.resetStats(targetMember, (nextR ? nextR.requiredXP : 0), overflow);

                    const oldRankName = currentR ? (message.guild.roles.cache.get(currentR.roleID)?.name || currentR.rankName) : "Bilinmiyor";
                    const newRankName = nextR.rankName || message.guild.roles.cache.get(nextR.roleID)?.name;
                    const actionNote = `${oldRankName} yetkisinden ${newRankName} yetkisine Yükseltildi`;

                    const progress = await MandatoryProgress.findOne({ guildID, userID: targetMember.id });
                    await MandatoryTaskLog.findOneAndUpdate(
                        { guildID, userID: targetMember.id, weekKey: currentWeek },
                        { $set: { status: "COMPLETED", reviewedBy: i.member.id, reviewAction: "PROMOTE", reviewedAt: new Date(), note: actionNote, voice: Math.floor((progress?.voiceMs || 0) / 60000), publicVoice: Math.floor((progress?.publicVoiceMs || 0) / 60000), message: progress?.messageCount || 0 }, $setOnInsert: { guildID, userID: targetMember.id, weekKey: currentWeek } },
                        { upsert: true }
                    );

                    actionMsg = `> ## ${emojis.toji_sparkly || ""} Yükseltildi\n> ${targetMember} **${oldRankName}** → **${newRankName}** rütbesine ${i.user} tarafından yükseltildi.`.trim();
                    await sendUpdateAndLog(actionMsg);

                } else if (i.customId.startsWith("gd_demote_")) {
                    const currentR = [...allRanks].reverse().find(r => targetMember.roles.cache.has(r.roleID));
                    const prevR = currentR ? allRanks[allRanks.indexOf(allRanks.find(r => r._id.toString() === currentR._id.toString())) - 1] : null;
                    if (!prevR) return i.followUp({ content: "Düşürülecek bir rütbe yok.", ephemeral: true });

                    const primaryRankRoleIDs = allRanks.map(r => r.roleID);
                    const rolesToRemove = primaryRankRoleIDs.filter(id => targetMember.roles.cache.has(id));
                    if (rolesToRemove.length > 0) await targetMember.roles.remove(rolesToRemove).catch(() => { });

                    await targetMember.roles.add(prevR.roleID).catch(() => { });
                    await StaffManager.applyMilestoneRoles(targetMember, prevR);

                    const overflow = await StaffManager.calculateOverflow(targetMember, prevR);
                    await StaffManager.resetStats(targetMember, (prevR ? prevR.requiredXP : 0), overflow);

                    const oldRankName = currentR ? (message.guild.roles.cache.get(currentR.roleID)?.name || currentR.rankName) : "Bilinmiyor";
                    const newRankName = prevR.rankName || message.guild.roles.cache.get(prevR.roleID)?.name;
                    const actionNote = `${oldRankName} yetkisinden ${newRankName} yetkisine Düşürüldü`;

                    const progress = await MandatoryProgress.findOne({ guildID, userID: targetMember.id });
                    await MandatoryTaskLog.findOneAndUpdate(
                        { guildID, userID: targetMember.id, weekKey: currentWeek },
                        { $set: { status: "FAILED", reviewedBy: i.member.id, reviewAction: "DEMOTE", reviewedAt: new Date(), note: actionNote, voice: Math.floor((progress?.voiceMs || 0) / 60000), publicVoice: Math.floor((progress?.publicVoiceMs || 0) / 60000), message: progress?.messageCount || 0 }, $setOnInsert: { guildID, userID: targetMember.id, weekKey: currentWeek } },
                        { upsert: true }
                    );

                    actionMsg = `> ## ${emojis.toji_info || ""} Düşürüldü\n> ${targetMember} **${oldRankName}** → **${newRankName}** rütbesine ${i.user} tarafından düşürüldü.`.trim();
                    await sendUpdateAndLog(actionMsg);

                } else if (i.customId.startsWith("gd_hold_")) {
                    const currentR = [...allRanks].reverse().find(r => targetMember.roles.cache.has(r.roleID));
                    const oldRankName = currentR ? (message.guild.roles.cache.get(currentR.roleID)?.name || currentR.rankName) : "Bilinmiyor";
                    const actionNote = `${oldRankName} yetkisinde Sabit Kaldı`;

                    const progress = await MandatoryProgress.findOne({ guildID, userID: targetMember.id });
                    await MandatoryTaskLog.findOneAndUpdate(
                        { guildID, userID: targetMember.id, weekKey: currentWeek },
                        { $set: { status: "HOLD", reviewedBy: i.member.id, reviewAction: "HOLD", reviewedAt: new Date(), note: actionNote, voice: Math.floor((progress?.voiceMs || 0) / 60000), publicVoice: Math.floor((progress?.publicVoiceMs || 0) / 60000), message: progress?.messageCount || 0 }, $setOnInsert: { guildID, userID: targetMember.id, weekKey: currentWeek } },
                        { upsert: true }
                    );

                    const uData = await StaffUser.findOne({ guildID, userID: targetMember.id });
                    if (uData) {
                        await StaffUser.findOneAndUpdate(
                            { guildID, userID: targetMember.id },
                            {
                                $set: {
                                    activeTasks: [],
                                    categoryStats: [],
                                    cooldowns: [],
                                    weeklyXP: 0,
                                    completedTasks: 0,
                                    currentLevel: 1
                                }
                            }
                        );
                        const TaskManager = require("../../../Core/Handlers/TaskManager");
                        await TaskManager.validateTasks(targetMember);
                        await TaskManager.assignRandomTasks(targetMember);
                    }

                    actionMsg = `> ## ${emojis.toji_time || ""} Sabit Kaldı\n> ${targetMember} bu hafta (\`${currentWeek}\`) ${i.user} tarafından **sabit** olarak işaretlendi. (Limitler sıfırlandı)`.trim();
                    await sendUpdateAndLog(actionMsg);

                } else if (i.customId.startsWith("gd_complete_")) {
                    const oldRankName = currentR ? (message.guild.roles.cache.get(currentR.roleID)?.name || currentR.rankName) : "Bilinmiyor";
                    const actionNote = `${oldRankName} yetkisinde Görevini Tamamladı (Sabit)`;

                    const progress = await MandatoryProgress.findOne({ guildID, userID: targetMember.id });
                    await MandatoryTaskLog.findOneAndUpdate(
                        { guildID, userID: targetMember.id, weekKey: currentWeek },
                        { $set: { status: "COMPLETED", reviewedBy: i.member.id, reviewAction: "COMPLETE", reviewedAt: new Date(), note: actionNote, voice: Math.floor((progress?.voiceMs || 0) / 60000), publicVoice: Math.floor((progress?.publicVoiceMs || 0) / 60000), message: progress?.messageCount || 0 }, $setOnInsert: { guildID, userID: targetMember.id, weekKey: currentWeek } },
                        { upsert: true }
                    );

                    const uData = await StaffUser.findOne({ guildID, userID: targetMember.id });
                    const currentR = [...allRanks].reverse().find(r => targetMember.roles.cache.has(r.roleID));

                    const overflow = await StaffManager.calculateOverflow(targetMember, currentR);

                    let deduction = uData ? uData.totalXP : 0;
                    if (currentR && uData && uData.totalXP >= currentR.requiredXP) {
                        deduction = currentR.requiredXP;
                    }

                    await StaffManager.resetStats(targetMember, deduction, overflow);

                    actionMsg = `> ## ${emojis.toji_onay || ""} Görev Tamamlandı\n> ${targetMember} bu hafta (\`${currentWeek}\`) zorunlu görevlerini ${i.user} tarafından **tamamladı** olarak işaretlendi. (Limitler/Görevler/XP sıfırlandı, %100+ ise devredildi)`.trim();
                    await sendUpdateAndLog(actionMsg);

                } else if (i.customId.startsWith("gd_reset_")) {
                    const uData = await StaffUser.findOne({ guildID, userID: targetMember.id });
                    if (uData) {
                        await StaffUser.findOneAndUpdate(
                            { guildID, userID: targetMember.id },
                            {
                                $set: {
                                    activeTasks: [],
                                    categoryStats: [],
                                    cooldowns: [],
                                    totalXP: 0,
                                    weeklyXP: 0,
                                    currentLevel: 1,
                                    completedTasks: 0,
                                    overflowXP: 0
                                }
                            }
                        );
                    }

                    const TaskManager = require("../../../Core/Handlers/TaskManager");
                    await TaskManager.validateTasks(targetMember);
                    await TaskManager.assignRandomTasks(targetMember);

                    await MandatoryProgress.deleteOne({ guildID, userID: targetMember.id });

                    const actionMsg = `> ## ${emojis.toji_sparkly || ""} Sıfırlandı\n> ${targetMember} kullanıcısının mevcut aktif görevleri, cooldownları ve istatistikleri ${i.user} tarafından sıfırlandı.`.trim();
                    await sendUpdateAndLog(actionMsg);
                }
            });
        });

        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                const comps = await buildPanel(targetMembers[currentIndex], currentIndex, targetMembers.length);
                const disableAll = (cmps) => {
                    for (const c of cmps) {
                        if (c.type === 2) c.disabled = true;
                        if (c.components) disableAll(c.components);
                    }
                };
                disableAll(comps);
                msg.edit({ components: comps }).catch(() => { });
            }
        });
    }
};
