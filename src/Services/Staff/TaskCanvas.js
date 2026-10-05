const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');
const moment = require('moment');
require("moment-duration-format");
moment.locale("tr");

const StaffUser = require("../../Core/Database/StaffUser");
const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
const TaskSettings = require("../../Core/Database/TaskSettings");
const MandatoryTaskConfig = require("../../Core/Database/MandatoryTaskConfig");
const StaffGlobalSettings = require("../../Core/Database/StaffGlobalSettings");
const MandatoryProgress = require("../../Core/Database/MandatoryProgress");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const TaskManager = require("../../Core/Handlers/TaskManager");

try {
    const fontsDir = fs.existsSync(path.join(__dirname, "..", "..", "Assets", "Fonts"))
        ? path.join(__dirname, "..", "..", "Assets", "Fonts")
        : path.join(__dirname, "..", "Assets", "Fonts");
    const boldFont = path.join(fontsDir, "Manrope-Bold.ttf");
    if (fs.existsSync(boldFont)) GlobalFonts.registerFromPath(boldFont, "Manrope");
} catch (e) {}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
    if (!text) return "";
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) t = t.slice(0, -1);
    return t + '...';
}

function formatDur(ms) {
    if (!ms || ms <= 0) return "0s 0dk";
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}s ${mins}dk`;
    return `${mins}dk`;
}

function drawGlow(ctx, x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawProgressBar(ctx, x, y, w, h, progress, color) {
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    const fillW = Math.max(h, w * Math.min(progress, 1));
    if (fillW > h) {
        roundRect(ctx, x, y, fillW, h, h / 2);
        const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + "99");
        ctx.fillStyle = grad;
        ctx.fill();
    }
}

module.exports.renderTaskCanvas = async function(client, targetUser, member) {
    if (!member) return null;

    const guildID = member.guild.id;
    const userID = member.id;
    const allRanks = await StaffRoleSystem.find({ guildID, active: true }).sort({ requiredXP: 1 });
    const isStaff = allRanks.some(r => member.roles.cache.has(r.roleID));

    if (!isStaff) return null;

    await TaskManager.validateTasks(member);
    await TaskManager.assignRandomTasks(member);

    const userData = await StaffUser.findOne({ guildID, userID });
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
    const maxXP = nextRankObj ? nextRankObj.requiredXP : (currentRankObj ? currentRankObj.requiredXP : currentXP);
    
    // FETCH TASKS
    const taskDefs = await TaskSettings.find({ _id: { $in: userData?.activeTasks?.map(t => t.taskID) || [] } });
    let tasksInfo = [];
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
            
            const effectiveMax = stretchLimit > 0 ? stretchLimit : taskLimit;
            const pct = effectiveMax > 0 ? (count / effectiveMax) : 0;
            
            tasksInfo.push({
                name: taskDef.taskName,
                count,
                limit: effectiveMax,
                pct,
                xp: earnedXP,
                isOver: taskLimit > 0 && count > taskLimit,
                isOverStretch: stretchLimit > 0 && count > stretchLimit
            });
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
                } else {
                    voiceGoal += mod.modifierValue;
                    pubVoiceGoal += mod.modifierValue;
                    msgGoal += mod.modifierValue;
                    inviteGoal += mod.modifierValue;
                }
            }
        }
    }

    let multiplier = 1.0;
    let reasons = [];
    let totalBonus = 0;
    let totalPenalty = 0;

    if (currentRankObj && currentRankObj.xpMultiplierRoles && currentRankObj.xpMultiplierRoles.length > 0) {
        for (const mr of currentRankObj.xpMultiplierRoles) {
            if (member.roles.cache.has(mr.roleID)) {
                const bonus = (mr.multiplier - 1.0);
                multiplier += bonus;
                totalBonus += bonus;
                const rName = member.guild.roles.cache.get(mr.roleID)?.name || "Bilinmeyen Rol";
                reasons.push(`• ${rName} → x${mr.multiplier}`);
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
                const rName = member.guild.roles.cache.get(gm.roleID)?.name || "Bilinmeyen Rol";
                reasons.push(`• ${rName} → x${gm.multiplier}`);
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
                reasons.push(`• ${excess} fazla sorumluluk → -${penalty.toFixed(1)}x`);
            }
        }
    }

    if (member.roles.cache.some(r => r.name === "Forum Sorumlusu")) {
        multiplier += 0.1;
        totalBonus += 0.1;
        reasons.push(`• Forum Sorumlusu → x1.1`);
    }
    if (member.roles.cache.some(r => r.name === "Forum Lideri")) {
        multiplier += 0.3;
        totalBonus += 0.3;
        reasons.push(`• Forum Lideri → x1.3`);
    }

    if (reasons.length > 4) {
        const extraCount = reasons.length - 4;
        reasons = reasons.slice(0, 4);
        reasons.push(`+ ${extraCount} rol daha...`);
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

    const serverOpXp = userData ? (userData.serverOperationXP || 0) : 0;
    const maxSrvXp = currentRankObj ? (currentRankObj.maxServerXP || 0) : 0;
    const srvPct = maxSrvXp > 0 ? (serverOpXp / maxSrvXp) : 0;

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

    const vPct = voiceGoal > 0 ? Math.min(100, Math.round((cVoice / voiceGoal) * 100)) : 100;
    const pvPct = pubVoiceGoal > 0 ? Math.min(100, Math.round((cPubVoice / pubVoiceGoal) * 100)) : 100;
    const mPct = msgGoal > 0 ? Math.min(100, Math.round((cMsg / msgGoal) * 100)) : 100;
    const iPct = inviteGoal > 0 ? Math.min(100, Math.round((cInvite / inviteGoal) * 100)) : 100;
    
    let goalCount = 0;
    let totalPct = 0;
    if (voiceGoal > 0) { goalCount++; totalPct += vPct; }
    if (pubVoiceGoal > 0) { goalCount++; totalPct += pvPct; }
    if (msgGoal > 0) { goalCount++; totalPct += mPct; }
    if (inviteGoal > 0) { goalCount++; totalPct += iPct; }
    const weeklyTaskAvg = goalCount > 0 ? totalPct / goalCount : 100;
    const xpProgressPercentage = maxXP > 0 ? Math.max(0, Math.round((currentXP / maxXP) * 100)) : 100;
    const overallPercentage = Math.round((xpProgressPercentage * 0.70) + (weeklyTaskAvg * 0.30));

    const W = 1000;
    
    // --- HELPER FUNCTION FOR DRAWING PANELS ---
    function drawPanel(ctx, x, y, w, h, title) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        roundRect(ctx, x, y, w, h, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (title) {
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.font = "bold 22px Manrope, sans-serif";
            ctx.fillText(title, x + 25, y + 40);
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(x + 20, y + 55, w - 40, 2);
        }
    }

    function initCanvas(w, h) {
        const c = createCanvas(w, h);
        const ctx = c.getContext('2d');
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0c0e14');
        bgGrad.addColorStop(1, '#05070a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
        drawGlow(ctx, w/2, h/3, 500, "rgba(88, 101, 242, 0.05)");
        
        roundRect(ctx, 2, 2, w - 4, h - 4, 15);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 4;
        ctx.stroke();
        return { c, ctx };
    }

    // ==========================================
    // IMAGE 1: Header, Ranks, Multipliers
    // ==========================================
    const H1 = 350;
    const { c: c1, ctx: ctx1 } = initCanvas(W, H1);

    // HEADER
    drawPanel(ctx1, 30, 30, W - 60, 160, null);

    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
    try {
        const avatarImage = await loadImage(avatarURL);
        ctx1.save();
        ctx1.beginPath();
        ctx1.arc(105, 110, 55, 0, Math.PI * 2);
        ctx1.clip();
        ctx1.drawImage(avatarImage, 50, 55, 110, 110);
        ctx1.restore();
        
        ctx1.beginPath();
        ctx1.arc(105, 110, 55, 0, Math.PI * 2);
        ctx1.strokeStyle = "rgba(88, 101, 242, 0.5)";
        ctx1.lineWidth = 4;
        ctx1.stroke();
    } catch(e) {}

    ctx1.fillStyle = "#ffffff";
    ctx1.font = "bold 34px Manrope, sans-serif";
    ctx1.fillText(truncateText(ctx1, targetUser.globalName || targetUser.username, 350), 180, 85);
    
    ctx1.fillStyle = "rgba(255,255,255,0.6)";
    ctx1.font = "20px Manrope, sans-serif";
    const weekStr = String(moment().isoWeek()).padStart(2,"0");
    ctx1.fillText(`${weekStr}. Hafta Yetkili Görev Paneli`, 180, 115);

    // Ranks (Role Info)
    let currentRole = currentRankObj ? member.guild.roles.cache.get(currentRankObj.roleID) : null;
    let nextRole = nextRankObj ? member.guild.roles.cache.get(nextRankObj.roleID) : null;

    let rX = 180;
    let rY = 135;
    
    function stripEmojis(str) {
        if (!str) return "";
        return str.replace(/[^\w\s\-çğıöşüÇĞİÖŞÜ]/gi, '').trim();
    }

    async function drawRoleIconAndText(ctx, roleObj, defaultText, defColor, x, y) {
        let drawX = x;
        let color = defColor;
        let name = defaultText;
        let iconUrl = null;
        
        if (roleObj) {
            color = roleObj.hexColor && roleObj.hexColor !== "#000000" ? roleObj.hexColor : defColor;
            name = stripEmojis(roleObj.name) || defaultText;
            iconUrl = roleObj.iconURL({ extension: 'png', size: 32 });
        }
        
        if (iconUrl) {
            try {
                const iImg = await loadImage(iconUrl);
                ctx.drawImage(iImg, drawX, y, 20, 20);
                drawX += 28;
            } catch(e) {
                // Fallback to circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(drawX + 10, y + 10, 8, 0, Math.PI * 2);
                ctx.fill();
                drawX += 24;
            }
        } else {
            // Circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(drawX + 10, y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            drawX += 24;
        }

        ctx.fillStyle = color;
        ctx.font = "bold 15px Manrope, sans-serif";
        ctx.fillText(truncateText(ctx, name, 130), drawX, y + 15);
        return drawX + ctx.measureText(truncateText(ctx, name, 130)).width + 10;
    }

    const curWidth = await drawRoleIconAndText(ctx1, currentRole, "Yok", "#5865F2", rX, rY);
    ctx1.fillStyle = "rgba(255,255,255,0.5)";
    ctx1.fillText(">", curWidth + 5, rY + 15);
    await drawRoleIconAndText(ctx1, nextRole, "Maksimum", "#57F287", curWidth + 25, rY);

    // Overall Progress
    const ovPW = 320;
    const ovPX = W - ovPW - 50;
    const ovPY = 90;
    
    ctx1.fillStyle = "rgba(255,255,255,0.9)";
    ctx1.font = "bold 24px Manrope, sans-serif";
    ctx1.fillText("Genel Haftalık İlerleme", ovPX - 30, ovPY - 5);
    
    ctx1.fillStyle = "#57F287";
    ctx1.font = "bold 30px Manrope, sans-serif";
    ctx1.textAlign = "right";
    ctx1.fillText(`%${overallPercentage}`, ovPX + ovPW, ovPY - 5);
    ctx1.textAlign = "left";
    
    drawProgressBar(ctx1, ovPX - 30, ovPY + 15, ovPW + 30, 22, overallPercentage / 100, "#57F287");

    // EXTRAS & MULTIPLIERS PANEL
    let pY1 = 210;
    drawPanel(ctx1, 30, pY1, W - 60, 110, "Ekstralar ve XP Çarpanları");
    ctx1.fillStyle = "#ffffff";
    ctx1.font = "bold 16px Manrope, sans-serif";
    ctx1.fillText(`Mevcut Çarpan: x${multiplier.toFixed(1)} (Bonus: +${totalBonus.toFixed(1)}x | Ceza: -${totalPenalty.toFixed(1)}x)`, 60, pY1 + 80);
    
    ctx1.fillStyle = "rgba(255,255,255,0.6)";
    ctx1.font = "14px Manrope, sans-serif";
    ctx1.fillText(reasons.join("   |   "), 60, pY1 + 105);

    // ==========================================
    // IMAGE 1A: Mandatory, Server Ops
    // ==========================================
    const H1A = 390;
    const { c: c1a, ctx: ctx1a } = initCanvas(W, H1A);
    let pY1A = 30;

    // MANDATORY TASKS PANEL
    drawPanel(ctx1a, 30, pY1A, W - 60, 180, "Zorunlu Haftalık Görevler");

    const mY1 = pY1A + 80;
    const mCols = 2;
    const mW = ((W - 60) - 60) / mCols;
    const items = [
        { label: "Genel Ses", count: cVoice, goal: voiceGoal, isDur: true, ovCount: ovVoice, ovPct: (voiceGoal>0? (ovVoice/voiceGoal)*100 : 0) },
        { label: "Public Ses", count: cPubVoice, goal: pubVoiceGoal, isDur: true, ovCount: ovPubVoice, ovPct: (pubVoiceGoal>0? (ovPubVoice/pubVoiceGoal)*100 : 0) },
        { label: "Mesaj", count: cMsg, goal: msgGoal, isDur: false, ovCount: ovMsg, ovPct: (msgGoal>0? (ovMsg/msgGoal)*100 : 0) },
        { label: "Davet", count: cInvite, goal: inviteGoal, isDur: false, ovCount: ovInvite, ovPct: (inviteGoal>0? (ovInvite/inviteGoal)*100 : 0) }
    ];

    for (let i=0; i<items.length; i++) {
        const item = items[i];
        const row = Math.floor(i / mCols);
        const col = i % mCols;
        const ix = 60 + (col * mW) + (col * 30);
        const iy = mY1 + (row * 60);

        ctx1a.fillStyle = "rgba(255,255,255,0.9)";
        ctx1a.font = "bold 16px Manrope, sans-serif";
        ctx1a.fillText(item.label, ix, iy);
        
        ctx1a.fillStyle = "rgba(255,255,255,0.6)";
        ctx1a.font = "14px Manrope, sans-serif";
        ctx1a.textAlign = "right";
        const cStr = item.isDur ? formatDur(item.count * 60000) : item.count;
        const gStr = item.isDur ? formatDur(item.goal * 60000) : item.goal;
        const ovText = item.ovCount > 0 ? ` (+%${Math.round(item.ovPct)})` : "";
        ctx1a.fillText(`${cStr} / ${gStr}${ovText}`, ix + mW - 10, iy);
        ctx1a.textAlign = "left";

        const pct = item.goal > 0 ? (item.count / item.goal) : 0;
        drawProgressBar(ctx1a, ix, iy + 15, mW - 10, 12, pct, item.count >= item.goal ? "#57F287" : "#FEE75C");
    }

    // SERVER OPS & TAG PANEL
    pY1A += 200;
    drawPanel(ctx1a, 30, pY1A, W - 60, 130, "Sunucu İşleri & Etkileşim");

    const stY1 = pY1A + 80;
    ctx1a.fillStyle = "rgba(255,255,255,0.9)";
    ctx1a.font = "bold 16px Manrope, sans-serif";
    ctx1a.fillText("Sunucu İşi XP İlerlemesi", 60, stY1);
    
    ctx1a.fillStyle = "rgba(255,255,255,0.6)";
    ctx1a.font = "14px Manrope, sans-serif";
    ctx1a.textAlign = "right";
    ctx1a.fillText(`${serverOpXp.toFixed(1)} / ${maxSrvXp} XP`, 60 + mW - 10, stY1);
    ctx1a.textAlign = "left";
    drawProgressBar(ctx1a, 60, stY1 + 15, mW - 10, 12, srvPct, srvPct >= 1 ? "#57F287" : "#5865F2");

    ctx1a.fillStyle = "rgba(255,255,255,0.9)";
    ctx1a.font = "bold 16px Manrope, sans-serif";
    ctx1a.fillText("Haftalık Tag Etkileşimi (XP)", 60 + mW + 30, stY1);
    
    ctx1a.fillStyle = "rgba(87, 242, 135, 0.1)";
    roundRect(ctx1a, 60 + mW + 30, stY1 + 10, (mW/2)-20, 26, 6);
    ctx1a.fill();
    ctx1a.fillStyle = "#57F287";
    ctx1a.font = "bold 13px Manrope, sans-serif";
    ctx1a.fillText(`+${weeklyTagGain.toFixed(1)} XP (Kazanım)`, 60 + mW + 40, stY1 + 28);
    
    ctx1a.fillStyle = "rgba(237, 66, 69, 0.1)";
    roundRect(ctx1a, 60 + mW + 30 + (mW/2), stY1 + 10, (mW/2)-20, 26, 6);
    ctx1a.fill();
    ctx1a.fillStyle = "#ED4245";
    ctx1a.fillText(`-${weeklyTagLoss.toFixed(1)} XP (Kayıp)`, 60 + mW + 40 + (mW/2), stY1 + 28);


    // ==========================================
    // IMAGE 2: XP Progress and General Tasks
    // ==========================================
    let extraHeight = Math.max(0, tasksInfo.length * 40);
    const H2 = 200 + extraHeight;
    const { c: c2, ctx: ctx2 } = initCanvas(W, H2);

    drawPanel(ctx2, 30, 30, W - 60, H2 - 60, "Deneyim Puanı & Genel Görevler");
    const gY = 110;
    
    ctx2.fillStyle = "rgba(255,255,255,0.9)";
    ctx2.font = "bold 16px Manrope, sans-serif";
    ctx2.fillText("Deneyim (XP) İlerlemesi", 60, gY);
    
    ctx2.fillStyle = "rgba(255,255,255,0.6)";
    ctx2.font = "14px Manrope, sans-serif";
    ctx2.textAlign = "right";
    const ovXpText = ovXP > 0 ? ` (+${ovXP} Taşan)` : "";
    ctx2.fillText(`${currentXP.toFixed(1)} / ${maxXP} XP${ovXpText}`, W - 70, gY);
    ctx2.textAlign = "left";
    
    const xpPct = maxXP > 0 ? (currentXP / maxXP) : 0;
    drawProgressBar(ctx2, 60, gY + 15, W - 130, 16, xpPct, "#5865F2");

    ctx2.fillStyle = "rgba(255,255,255,0.05)";
    ctx2.fillRect(60, gY + 50, W - 130, 1);

    const taskStartY = gY + 75;
    if (tasksInfo.length === 0) {
        ctx2.fillStyle = "rgba(255,255,255,0.5)";
        ctx2.font = "16px Manrope, sans-serif";
        ctx2.fillText("Şu an aktif bir genel görevin bulunmuyor.", 60, taskStartY);
    } else {
        for (let i=0; i<tasksInfo.length; i++) {
            const task = tasksInfo[i];
            const ty = taskStartY + (i * 40);
            
            ctx2.fillStyle = "rgba(255,255,255,0.9)";
            ctx2.font = "bold 15px Manrope, sans-serif";
            ctx2.fillText(truncateText(ctx2, task.name, 250), 60, ty);

            drawProgressBar(ctx2, 320, ty - 12, 400, 12, task.pct, task.isOver ? "#57F287" : "#5865F2");

            ctx2.fillStyle = "rgba(255,255,255,0.7)";
            ctx2.font = "14px Manrope, sans-serif";
            const limStr = task.limit > 0 ? task.limit : "∞";
            ctx2.fillText(`${task.count} / ${limStr}`, 740, ty);

            ctx2.fillStyle = task.isOver ? "#57F287" : "#FEE75C";
            ctx2.textAlign = "right";
            ctx2.fillText(`+${task.xp.toFixed(1)} XP`, W - 70, ty);
            ctx2.textAlign = "left";
        }
    }


    // ==========================================
    // IMAGE 3: Rules and Limits Footer
    // ==========================================
    const H3 = 200;
    const { c: c3, ctx: ctx3 } = initCanvas(W, H3);

    ctx3.fillStyle = "rgba(255,255,255,0.02)";
    roundRect(ctx3, 30, 20, W - 60, 160, 12);
    ctx3.fill();
    
    ctx3.fillStyle = "rgba(255,255,255,0.8)";
    ctx3.font = "bold 15px Manrope, sans-serif";
    ctx3.fillText("📌 Görev Limit Sistemi ve Kurallar", 50, 45);
    
    ctx3.fillStyle = "rgba(255,255,255,0.5)";
    ctx3.font = "13px Manrope, sans-serif";
    ctx3.fillText("• Normal Limit: Ana limite kadar yapılan tamamlamalar size Tam XP (x1.0) kazandırır.", 50, 68);
    ctx3.fillText("• Esnetme Limiti (Taşan): Ana limit aşıldığında, esnetme limitine kadar olan tamamlamalar Yarı XP (x0.5) kazandırır.", 50, 88);
    ctx3.fillText("• Limit Aşımı: Esnetme limiti de dolduğunda, o kategoride daha fazla görev yapsanız bile XP kazanamazsınız (x0.0).", 50, 108);
    ctx3.fillText("• Public Ses Kuralı: Ses görevlerinde vaktinizin %40'ından fazlasını public odalar dışında geçirirseniz, o görevden kazanılan XP yarıya düşer.", 50, 128);
    ctx3.fillText("• Sunucu içi tag etkileşim puanları ve cezaları günlük olarak hesaplanır. Görevler her Pazartesi (00:00) sıfırlanır.", 50, 158);

    // RETURN ALL BUFFERS
    return [
        c1.toBuffer('image/png'),
        c1a.toBuffer('image/png'),
        c2.toBuffer('image/png'),
        c3.toBuffer('image/png')
    ];
};
