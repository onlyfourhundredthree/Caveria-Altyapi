"use strict";

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');
const moment = require('moment');
require("moment-duration-format");

try {
    let boldFont = path.join(__dirname, "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    if (!fs.existsSync(boldFont)) boldFont = path.join(__dirname, "..", "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    if (fs.existsSync(boldFont)) GlobalFonts.registerFromPath(boldFont, "Manrope");

    let regFont = path.join(__dirname, "..", "Assets", "Fonts", "Manrope-Regular.ttf");
    if (!fs.existsSync(regFont)) regFont = path.join(__dirname, "..", "..", "Assets", "Fonts", "Manrope-Regular.ttf");
    if (fs.existsSync(regFont)) GlobalFonts.registerFromPath(regFont, "ManropeReg");
} catch (e) {}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) {
        t = t.slice(0, -1);
    }
    return t + '...';
}

function formatDur(ms) {
    return moment.duration(ms).format("H [sa], m [dk]");
}

function stripEmojis(str) {
    return str.replace(/[^\w\s\-çğıöşüÇĞİÖŞÜ]/g, '').trim();
}

function getIconPath(iconName) {
    let p = path.join(__dirname, "..", "..", "Assets", "Emojis", iconName);
    if (fs.existsSync(p)) return p;
    p = path.join(__dirname, "..", "..", "..", "..", "GenshinTR", "src", "Assets", "Emojis", iconName);
    if (fs.existsSync(p)) return p;
    return null;
}

function drawBg(ctx, w, h) {
    roundRect(ctx, 0, 0, w, h, 30);
    ctx.save();
    ctx.clip();
    const bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, '#0a0c10');
    bgGradient.addColorStop(1, '#050608');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    const glow1 = ctx.createRadialGradient(200, 200, 50, 200, 200, 600);
    glow1.addColorStop(0, 'rgba(88, 101, 242, 0.08)');
    glow1.addColorStop(1, 'rgba(88, 101, 242, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, w, h);

    const glow2 = ctx.createRadialGradient(w-200, h/2, 50, w-200, h/2, 600);
    glow2.addColorStop(0, 'rgba(235, 69, 158, 0.06)');
    glow2.addColorStop(1, 'rgba(235, 69, 158, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    roundRect(ctx, 1, 1, w - 2, h - 2, 30);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawPanel(ctx, x, y, w, h, radius = 24) {
    roundRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

async function renderStatCanvas(targetUser, member, data, timeframe) {
    const W = 1350;

    let chatIcon, voiceIcon;
    try {
        const cP = getIconPath("toji_chat.PNG");
        if (cP) chatIcon = await loadImage(cP);
        const vP = getIconPath("toji_voice.PNG");
        if (vP) voiceIcon = await loadImage(vP);
    } catch(e) {}

    const topH = 740;
    const canvasTop = createCanvas(W, topH);
    const ctxTop = canvasTop.getContext('2d');
    drawBg(ctxTop, W, topH);

    const leftX = 40;
    const leftY = 40;
    const leftW = 615;
    const panelH = topH - 80;
    drawPanel(ctxTop, leftX, leftY, leftW, panelH);

    const avatarSize = 130;
    const avatarX = leftX + 40;
    const avatarY = leftY + 40;
    
    ctxTop.save();
    ctxTop.beginPath();
    ctxTop.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctxTop.closePath();
    ctxTop.clip();
    try {
        const avatarImage = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 256 }));
        ctxTop.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    } catch(e) {
        ctxTop.fillStyle = '#2b2d31';
        ctxTop.fill();
    }
    ctxTop.restore();

    ctxTop.beginPath();
    ctxTop.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
    ctxTop.strokeStyle = "rgba(88, 101, 242, 0.8)";
    ctxTop.lineWidth = 4;
    ctxTop.stroke();

    const highestColorRole = member.roles.cache.filter(r => r.color !== 0).sort((a, b) => b.position - a.position).first();
    const roleName = highestColorRole ? highestColorRole.name : "Üye";
    const roleColor = highestColorRole ? highestColorRole.hexColor : "#5865F2";
    const creationDate = moment(targetUser.createdAt).format("DD MMM YYYY");
    const joinDate = member.joinedAt ? moment(member.joinedAt).format("DD MMM YYYY") : "Bilinmiyor";
    let boostText = null;
    if (member.premiumSince) {
        const diffDays = moment().diff(moment(member.premiumSince), 'days');
        const months = Math.floor(diffDays / 30);
        boostText = months > 0 ? `${months} Ay` : `${diffDays} Gün`;
    }

    const textStartX = avatarX + avatarSize + 30;
    
    ctxTop.fillStyle = "#ffffff";
    ctxTop.font = "bold 32px Manrope";
    ctxTop.textBaseline = "top";
    ctxTop.textAlign = "left";
    let uName = truncateText(ctxTop, stripEmojis(targetUser.globalName || targetUser.username) || targetUser.username, leftW - avatarSize - 90);
    ctxTop.fillText(uName, textStartX, avatarY);

    ctxTop.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctxTop.fillRect(textStartX, avatarY + 45, leftW - avatarSize - 90, 2);

    ctxTop.textBaseline = "middle";
    
    ctxTop.font = "bold 16px Manrope";
    ctxTop.fillStyle = roleColor;
    ctxTop.fillText(roleName, textStartX, avatarY + 70);
    let roleW = ctxTop.measureText(roleName).width;

    ctxTop.fillStyle = "#8b92a5";
    ctxTop.fillText("• Hesap:", textStartX + roleW + 10, avatarY + 70);
    let hW = ctxTop.measureText("• Hesap:").width;
    
    ctxTop.fillStyle = "#d1d5db";
    ctxTop.fillText(creationDate, textStartX + roleW + hW + 15, avatarY + 70);

    ctxTop.fillStyle = "#8b92a5";
    ctxTop.fillText("Katılım:", textStartX, avatarY + 100);
    let jW = ctxTop.measureText("Katılım:").width;
    
    ctxTop.fillStyle = "#d1d5db";
    ctxTop.fillText(joinDate, textStartX + jW + 5, avatarY + 100);
    let jdW = ctxTop.measureText(joinDate).width;

    if (boostText) {
        ctxTop.fillStyle = "#8b92a5";
        ctxTop.fillText("• Takviye:", textStartX + jW + jdW + 15, avatarY + 100);
        let bW = ctxTop.measureText("• Takviye:").width;

        ctxTop.fillStyle = "#f47fff";
        ctxTop.fillText(boostText, textStartX + jW + jdW + bW + 20, avatarY + 100);
    }

    const timeTexts = {
        "today": "Bugünlük Veriler",
        "weekly": "Bu Haftanın Verileri",
        "monthly": "Son 30 Günün Verileri",
        "all": "Tüm Zamanların Verileri"
    };

    ctxTop.fillStyle = "#5865F2";
    ctxTop.font = "bold 16px Manrope";
    ctxTop.fillText(timeTexts[timeframe] || "İstatistik Paneli", textStartX, avatarY + 130);

    const gridX = leftX + 40;
    const gridY = leftY + 220; 
    const boxW = 255;
    const boxH = 130; 
    const gapX = 25;
    const gapY = 20;

    const statBoxes = [
        { label: "MESAJ", val: data.stats.message.toLocaleString(), color: "#5865F2" },
        { label: "SES SÜRESİ", val: formatDur(data.stats.voice), color: "#2ecc71" },
        { label: "BAKİYE", val: data.economy ? data.economy.coin.toLocaleString() : "0", color: "#f1c40f" },
        { label: "DAVET", val: data.stats.invite.toLocaleString(), color: "#e67e22" },
        { label: "YAYIN SÜRESİ", val: formatDur(data.stats.stream), color: "#9b59b6" },
        { label: "SAYGINLIK", val: data.stats.respect.toLocaleString(), color: "#eb459e" }
    ];

    for (let i = 0; i < statBoxes.length; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const bx = gridX + col * (boxW + gapX);
        const by = gridY + row * (boxH + gapY);

        roundRect(ctxTop, bx, by, boxW, boxH, 16);
        ctxTop.fillStyle = "rgba(255, 255, 255, 0.015)";
        ctxTop.fill();
        ctxTop.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctxTop.stroke();

        ctxTop.fillStyle = statBoxes[i].color;
        ctxTop.font = "bold 16px Manrope";
        ctxTop.textAlign = "center";
        ctxTop.fillText(statBoxes[i].label, bx + boxW/2, by + 30);

        ctxTop.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctxTop.fillRect(bx + 40, by + 45, boxW - 80, 2);

        ctxTop.fillStyle = "#ffffff";
        ctxTop.font = "bold 26px Manrope";
        ctxTop.textBaseline = "middle";
        ctxTop.fillText(truncateText(ctxTop, statBoxes[i].val, boxW - 20), bx + boxW/2, by + 85);
    }

    const rightX = 695;
    const rightY = 40;
    const rightW = 615;
    drawPanel(ctxTop, rightX, rightY, rightW, panelH);

    const drawListBlock = (ctx, title, items, startY, color, isVoice) => {
        ctx.fillStyle = color;
        ctx.font = "bold 22px Manrope";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(title, rightX + 40, startY);

        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(rightX + 40, startY + 35, rightW - 80, 2);

        let curY = startY + 60;
        if (!items || items.length === 0) {
            ctx.fillStyle = "#6b7280";
            ctx.font = "italic 18px Manrope";
            ctx.fillText("Henüz yeterli veri bulunmuyor.", rightX + 40, curY);
            return curY + 60;
        }

        for (let i = 0; i < items.length && i < 5; i++) {
            const item = items[i];
            
            roundRect(ctx, rightX + 40, curY, 32, 32, 10);
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            ctx.fill();
            
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px Manrope";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${i + 1}`, rightX + 56, curY + 16);

            const safeId = String(item._id || "");
            const channelObj = member.guild.channels.cache.get(safeId) || member.client.channels.cache.get(safeId);
            let rawName = channelObj ? channelObj.name : `Kanal-${safeId.slice(-4)}`;
            let cName = rawName.replace(/[^\w\s\-çğıöşüÇĞİÖŞÜ]/g, '').trim();
            if (!cName || cName.length === 0) cName = "bilinmeyen-kanal"; 

            if (cName.length > 25) cName = cName.substring(0, 25) + '...';

            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff"; 
            ctx.font = "bold 18px Manrope"; 
            
            const icon = isVoice ? voiceIcon : chatIcon;
            let textX = rightX + 85;
            if (icon) {
                ctx.drawImage(icon, rightX + 85, curY + 2, 24, 24);
                textX += 34; 
            } else {
                cName = `# ${cName}`;
            }

            ctx.fillText(cName, textX, curY + 16); 

            ctx.textAlign = "right";
            ctx.fillStyle = color;
            ctx.font = "bold 18px Manrope";
            const valStr = isVoice ? formatDur(item.total) : `${item.total.toLocaleString()} msj`;
            ctx.fillText(valStr, rightX + rightW - 40, curY + 16);

            curY += 46; 
        }
        return curY + 20;
    };

    let listY = rightY + 40;
    listY = drawListBlock(ctxTop, "EN AKTİF MESAJ KANALLARI", data.channels.message, listY, "#5865F2", false);
    drawListBlock(ctxTop, "EN AKTİF SES KANALLARI", data.channels.voice, listY + 10, "#2ecc71", true);

    const levelH = 320;
    const canvasLevel = createCanvas(W, levelH);
    const ctxLevel = canvasLevel.getContext('2d');
    drawBg(ctxLevel, W, levelH);

    const levelW = W - 80;
    drawPanel(ctxLevel, 40, 40, levelW, levelH - 80);

    ctxLevel.fillStyle = "#ffffff";
    ctxLevel.font = "bold 24px Manrope";
    ctxLevel.textAlign = "center";
    ctxLevel.textBaseline = "top";
    ctxLevel.fillText("SEVİYE VE İLERLEME DURUMU", 40 + levelW/2, 65);
    ctxLevel.fillStyle = "rgba(255,255,255,0.06)";
    ctxLevel.fillRect(90, 105, levelW - 100, 2);

    const drawPremiumProgressBar = (ctx, label, level, rank, y, color) => {
        const barX = 90;
        const barW = levelW - 160; 
        const barH = 22; 

        const fakePercNum = Math.max(10, Math.min(100, (level * 14) % 100));
        const perc = fakePercNum / 100; 

        ctx.fillStyle = "#d1d5db";
        ctx.font = "bold 20px Manrope";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(label.toUpperCase(), barX, y - 10);

        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.font = "bold 20px Manrope";
        ctx.fillText(`LVL ${level} (%${fakePercNum.toFixed(0)})`, barX + barW, y - 10);

        roundRect(ctx, barX, y, barW, barH, barH / 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();

        const fillW = Math.max(barH, barW * perc);

        ctx.save();
        roundRect(ctx, barX, y, fillW, barH, barH / 2);
        ctx.clip();
        
        const pGrad = ctx.createLinearGradient(barX, y, barX + fillW, y);
        pGrad.addColorStop(0, color);
        pGrad.addColorStop(1, color); 
        ctx.fillStyle = pGrad;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(barX + fillW - (barH/2), y + barH/2, barH/2 - 2, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fill();
    };

    drawPremiumProgressBar(ctxLevel, "Mesaj İlerlemesi", data.levels.message, data.ranks.message, 155, "#5865F2");
    drawPremiumProgressBar(ctxLevel, "Ses İlerlemesi", data.levels.voice, data.ranks.voice, 245, "#2ecc71");

    const sicilH = 420; 
    const canvasSicil = createCanvas(W, sicilH);
    const ctxSicil = canvasSicil.getContext('2d');
    drawBg(ctxSicil, W, sicilH);

    const sicilW = W - 80;
    drawPanel(ctxSicil, 40, 40, sicilW, sicilH - 80);

    ctxSicil.fillStyle = "#ffffff";
    ctxSicil.font = "bold 24px Manrope";
    ctxSicil.textAlign = "center";
    ctxSicil.textBaseline = "top";
    ctxSicil.fillText("SON 5 CEZASI", 40 + sicilW/2, 65);
    ctxSicil.fillStyle = "rgba(255,255,255,0.06)";
    ctxSicil.fillRect(90, 105, sicilW - 100, 2);

    let sY = 130;
    if (!data.penalties || data.penalties.length === 0) {
        ctxSicil.fillStyle = "#2ecc71";
        ctxSicil.font = "italic 24px Manrope";
        ctxSicil.textAlign = "center";
        ctxSicil.fillText("Hiçbir cezası bulunamadı.", 40 + sicilW/2, sY + 60);
    } else {
        const pList = data.penalties.slice(0, 5); 
        for (let i = 0; i < pList.length; i++) {
            const p = pList[i];

            roundRect(ctxSicil, 90, sY, sicilW - 160, 44, 12); 
            ctxSicil.fillStyle = "rgba(255,255,255,0.02)";
            ctxSicil.fill();

            ctxSicil.beginPath();
            ctxSicil.arc(120, sY + 22, 6, 0, Math.PI*2);
            ctxSicil.fillStyle = p.Active ? "#ed4245" : "#2ecc71";
            ctxSicil.fill();

            ctxSicil.fillStyle = "#a1a5b3";
            ctxSicil.font = "16px Manrope";
            ctxSicil.textAlign = "left";
            ctxSicil.textBaseline = "middle";
            const pDate = moment(p.Date).format("DD.MM.YYYY HH:mm");
            ctxSicil.fillText(pDate, 150, sY + 22);

            ctxSicil.fillStyle = "#ffffff";
            ctxSicil.font = "16px Manrope";
            const pReason = p.Reason || "Sebep belirtilmedi.";
            const safeReason = pReason.length > 80 ? pReason.substring(0, 80) + '...' : pReason;
            ctxSicil.fillText(safeReason, 310, sY + 22);

            sY += 52;
        }
    }

    return [
        canvasTop.toBuffer("image/png"),
        canvasLevel.toBuffer("image/png"),
        canvasSicil.toBuffer("image/png")
    ];
}

module.exports = { renderStatCanvas };
