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
const MandatoryTaskLog = require("../../Core/Database/MandatoryTaskLog");

try {
    const fontsDir = fs.existsSync(path.join(__dirname, "..", "..", "Assets", "Fonts"))
        ? path.join(__dirname, "..", "..", "Assets", "Fonts")
        : path.join(__dirname, "..", "Assets", "Fonts");
    const boldFont = path.join(fontsDir, "Manrope-Bold.ttf");
    if (fs.existsSync(boldFont)) GlobalFonts.registerFromPath(boldFont, "Manrope");
} catch (e) {}

function getWeekKey(m = moment()) {
    return `${m.isoWeekYear()}-W${String(m.isoWeek()).padStart(2, "0")}`;
}

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

module.exports.renderDenetimCanvas = async function(client, targetUser, member) {
    if (!member) return null;

    const guildID = member.guild.id;
    const userID = member.id;
    
    const allRanks = await StaffRoleSystem.find({ guildID, active: true }).sort({ requiredXP: 1 });
    const isStaff = allRanks.some(r => member.roles.cache.has(r.roleID));
    if (!isStaff) return null;

    const userData = await StaffUser.findOne({ guildID, userID });
    const currentXP = userData ? userData.totalXP : 0;
    
    const sortedRanks = [...allRanks].sort((a, b) => a.requiredXP - b.requiredXP);
    const currentRankObj = sortedRanks.filter(r => member.roles.cache.has(r.roleID)).pop() || sortedRanks.find(r => r.requiredXP <= currentXP);
    
    let nextRankObj = null;
    if (currentRankObj) {
        const idx = sortedRanks.findIndex(r => r._id.toString() === currentRankObj._id.toString());
        nextRankObj = sortedRanks[idx + 1] || null;
    }

    const maxXP = nextRankObj ? nextRankObj.requiredXP : (currentRankObj ? currentRankObj.requiredXP : currentXP);

    const mdtConfig = currentRankObj ? await MandatoryTaskConfig.findOne({ guildID, rankRoleID: currentRankObj.roleID }) : null;
    const globalSettings = await StaffGlobalSettings.findOne({ guildID });
    const progress = await MandatoryProgress.findOne({ guildID, userID });

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

    const cVoice = Math.floor((progress?.voiceMs || 0) / 60000);
    const cPubVoice = Math.floor((progress?.publicVoiceMs || 0) / 60000);
    const cMsg = progress?.messageCount || 0;
    const cInvite = progress?.inviteCount || 0;

    const taskDefs = await TaskSettings.find({ _id: { $in: userData?.activeTasks?.map(t => t.taskID) || [] } });
    let tasksInfo = [];
    let completedTasks = 0;
    if (userData?.activeTasks) {
        for (const activeTask of userData.activeTasks) {
            const taskDef = taskDefs.find(t => t._id.equals(activeTask.taskID));
            if (!taskDef) continue;
            let taskLimit = taskDef.limitCount || 0;
            if (taskDef.roleLimits) {
                for (const rl of taskDef.roleLimits) {
                    if (member.roles.cache.has(String(rl.roleID)) && rl.limitCount > taskLimit) {
                        taskLimit = rl.limitCount;
                    }
                }
            }
            const catStat = (userData.categoryStats || []).find(s => s.category === taskDef.taskCategory);
            const count = catStat ? catStat.count : 0;
            const pct = taskLimit > 0 ? (count / taskLimit) : 0;
            if (pct >= 1) completedTasks++;
            
            tasksInfo.push({
                name: taskDef.taskName,
                count,
                limit: taskLimit,
                pct,
                isOver: taskLimit > 0 && count >= taskLimit
            });
        }
    }

    const taskGoal = userData?.activeTasks?.length || 0;
    
    const vPct = voiceGoal > 0 ? Math.min(1, cVoice / voiceGoal) : 1;
    const pvPct = pubVoiceGoal > 0 ? Math.min(1, cPubVoice / pubVoiceGoal) : 1;
    const mPct = msgGoal > 0 ? Math.min(1, cMsg / msgGoal) : 1;
    const iPct = inviteGoal > 0 ? Math.min(1, cInvite / inviteGoal) : 1;
    const tPct = taskGoal > 0 ? Math.min(1, completedTasks / taskGoal) : 1;

    let goalCount = 0;
    let totalPct = 0;
    if (voiceGoal > 0) { goalCount++; totalPct += vPct * 100; }
    if (pubVoiceGoal > 0) { goalCount++; totalPct += pvPct * 100; }
    if (msgGoal > 0) { goalCount++; totalPct += mPct * 100; }
    if (inviteGoal > 0) { goalCount++; totalPct += iPct * 100; }
    if (taskGoal > 0) { goalCount++; totalPct += tPct * 100; }
    
    const weeklyTaskAvg = goalCount > 0 ? Math.round(totalPct / goalCount) : 100;
    const xpProgressPercentage = maxXP > 0 ? Math.max(0, Math.round((currentXP / maxXP) * 100)) : 100;
    const overallPercentage = Math.round((xpProgressPercentage * 0.70) + (weeklyTaskAvg * 0.30));

    let isCompleted = false;
    if (!currentRankObj || !currentRankObj.mandatoryWeeks) {
        isCompleted = true; 
    } else {
        isCompleted = (vPct >= 1) && (pvPct >= 1) && (mPct >= 1) && (iPct >= 1) && (tPct >= 1);
    }

    // =====================================
    // IMAGE 1: Rank and Current Week Goals (Sleek Grid Design)
    // =====================================
    const W = 1000;
    const H1 = 450;
    const { c: c1, ctx: ctx1 } = initCanvas(W, H1);

    // HEADER PANEL
    drawPanel(ctx1, 30, 30, W - 60, 160, null);

    ctx1.save();
    ctx1.beginPath();
    ctx1.arc(105, 110, 55, 0, Math.PI * 2);
    ctx1.closePath();
    ctx1.clip();
    try {
        const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const img = await loadImage(avatarUrl);
        ctx1.drawImage(img, 50, 55, 110, 110);
    } catch(e) {}
    ctx1.restore();

    ctx1.strokeStyle = "rgba(88, 101, 242, 0.5)";
    ctx1.lineWidth = 4;
    ctx1.beginPath();
    ctx1.arc(105, 110, 55, 0, Math.PI * 2);
    ctx1.stroke();

    ctx1.fillStyle = "#ffffff";
    ctx1.font = "bold 34px Manrope, sans-serif";
    ctx1.textBaseline = "alphabetic";
    ctx1.fillText(truncateText(ctx1, targetUser.globalName || targetUser.username, 350), 180, 85);
    
    ctx1.fillStyle = "rgba(255,255,255,0.6)";
    ctx1.font = "20px Manrope, sans-serif";
    const weekStr = String(moment().isoWeek()).padStart(2,"0");
    ctx1.fillText(`${weekStr}. Hafta Denetim Paneli`, 180, 115);

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
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(drawX + 10, y + 10, 8, 0, Math.PI * 2);
                ctx.fill();
                drawX += 24;
            }
        } else {
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

    // CURRENT WEEK GOALS PANEL (Grid Layout like Görev)
    let pY1A = 210;
    drawPanel(ctx1, 30, pY1A, W - 60, 210, "Mevcut Hafta Denetim Hedefleri");

    const mY1 = pY1A + 80;
    const mCols = 2;
    const mW = ((W - 60) - 60) / mCols;
    const items = [
        { label: "Genel Ses", count: cVoice, goal: voiceGoal, isDur: true, color: "#5865F2" },
        { label: "Public Ses", count: cPubVoice, goal: pubVoiceGoal, isDur: true, color: "#2ecc71" },
        { label: "Mesaj", count: cMsg, goal: msgGoal, isDur: false, color: "#f1c40f" },
        { label: "Davet", count: cInvite, goal: inviteGoal, isDur: false, color: "#e67e22" },
        { label: "Genel Görevler", count: completedTasks, goal: taskGoal, isDur: false, color: "#9b59b6" }
    ];

    for (let i=0; i<items.length; i++) {
        const item = items[i];
        const row = Math.floor(i / mCols);
        const col = i % mCols;
        const ix = 60 + (col * mW) + (col * 30);
        const iy = mY1 + (row * 50); // tighter spacing

        ctx1.fillStyle = "rgba(255,255,255,0.9)";
        ctx1.font = "bold 16px Manrope, sans-serif";
        ctx1.fillText(item.label, ix, iy);
        
        ctx1.fillStyle = "rgba(255,255,255,0.6)";
        ctx1.font = "14px Manrope, sans-serif";
        ctx1.textAlign = "right";
        const cStr = item.isDur ? formatDur(item.count * 60000) : item.count;
        const gStr = item.goal > 0 ? (item.isDur ? formatDur(item.goal * 60000) : item.goal) : "Hedef Yok";
        ctx1.fillText(`${cStr} / ${gStr}`, ix + mW - 10, iy);
        ctx1.textAlign = "left";

        const pct = item.goal > 0 ? (item.count / item.goal) : (item.count > 0 ? 1 : 0);
        drawProgressBar(ctx1, ix, iy + 10, mW - 10, 12, pct, item.goal > 0 && pct >= 1 ? "#57F287" : item.color);
    }

    const buffer1 = c1.toBuffer('image/png');


    // =====================================
    // IMAGE 2: Past 10 Weeks History
    // =====================================
    const weeksToShow = [];
    for (let i = 0; i < 10; i++) {
        weeksToShow.push(getWeekKey(moment().subtract(i, "weeks")));
    }
    
    const mandatoryLogs = await MandatoryTaskLog.find({ guildID, userID, weekKey: { $in: weeksToShow } });
    
    const H2 = 180 + (10 * 65); // 10 weeks, 65px per row
    const { c: c2, ctx: ctx2 } = initCanvas(W, H2);

    drawPanel(ctx2, 30, 30, W - 60, H2 - 60, "Son 10 Haftalık Denetim Geçmişi");
    
    let hY = 110;
    for (let i = 0; i < 10; i++) {
        const wKey = weeksToShow[i];
        const log = mandatoryLogs.find(l => l.weekKey === wKey);
        
        const weekStart = moment().subtract(i, "weeks").startOf("isoWeek").format("DD MMM YYYY");
        const weekEnd = moment().subtract(i, "weeks").endOf("isoWeek").format("DD MMM YYYY");
        const dateStr = `${weekStart} - ${weekEnd}`;

        ctx2.fillStyle = "rgba(255,255,255,0.8)";
        ctx2.font = "bold 16px Manrope, sans-serif";
        ctx2.fillText(`${wKey.split('W')[1]}. Hafta İncelemesi`, 60, hY + 15);
        
        ctx2.fillStyle = "rgba(255,255,255,0.4)";
        ctx2.font = "14px Manrope, sans-serif";
        ctx2.fillText(dateStr, 60, hY + 35);

        let logText = "";
        let logColor = "";
        let logBg = "";

        if (log) {
            if (log.note && log.note.trim() !== "") {
                logText = log.note;
                logColor = log.status === "COMPLETED" ? "#2ecc71" : (log.status === "FAILED" ? "#e74c3c" : "#f1c40f");
                logBg = log.status === "COMPLETED" ? "rgba(46, 204, 113, 0.1)" : (log.status === "FAILED" ? "rgba(231, 76, 60, 0.1)" : "rgba(241, 196, 15, 0.1)");
            } else {
                if (log.reviewAction === "PROMOTE") {
                    logText = "Görevini Tamamladı ve Yükseltildi";
                    logColor = "#2ecc71";
                    logBg = "rgba(46, 204, 113, 0.1)";
                } else if (log.reviewAction === "DEMOTE") {
                    logText = "Başarısız Oldu ve Düşürüldü";
                    logColor = "#e74c3c";
                    logBg = "rgba(231, 76, 60, 0.1)";
                } else if (log.reviewAction === "HOLD" || log.status === "HOLD") {
                    logText = "Mevcut Yetkisinde Sabit Kaldı";
                    logColor = "#f1c40f";
                    logBg = "rgba(241, 196, 15, 0.1)";
                } else if (log.reviewAction === "COMPLETE" || log.status === "COMPLETED") {
                    logText = "Görevini Başarıyla Tamamladı";
                    logColor = "#3498db";
                    logBg = "rgba(52, 152, 219, 0.1)";
                } else if (log.status === "FAILED") {
                    logText = "Görevini Tamamlayamadı (Başarısız)";
                    logColor = "#e74c3c";
                    logBg = "rgba(231, 76, 60, 0.1)";
                } else {
                    logText = "Denetim Bekleniyor (Pending)";
                    logColor = "#95a5a6";
                    logBg = "rgba(149, 165, 166, 0.1)";
                }
            }
        } else {
            logText = "Bu Hafta Kayıt Bulunamadı";
            logColor = "rgba(255, 255, 255, 0.4)";
            logBg = "rgba(255, 255, 255, 0.05)";
        }

        ctx2.font = "bold 15px Manrope, sans-serif";
        const tw = ctx2.measureText(logText).width + 30;
        
        // Right align the boxes
        const boxX = W - 60 - tw;
        
        ctx2.fillStyle = logBg;
        roundRect(ctx2, boxX, hY, tw, 34, 8);
        ctx2.fill();
        
        ctx2.fillStyle = logColor;
        ctx2.fillText(logText, boxX + 15, hY + 22);

        ctx2.fillStyle = "rgba(255,255,255,0.05)";
        ctx2.fillRect(60, hY + 55, W - 120, 1);
        
        hY += 65;
    }

    const buffer2 = c2.toBuffer('image/png');

    return [buffer1, buffer2];
};
