"use strict";

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');
const moment = require('moment');
require("moment-duration-format");
moment.locale("tr");

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

function drawGlow(ctx, x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

module.exports.renderPartnerStatCanvas = async function(data, targetUser) {
    const W = 1100;
    const H = 520;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ══════════════════════════════════════════
    // BACKGROUND
    // ══════════════════════════════════════════
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0c1016');
    bgGrad.addColorStop(0.5, '#0f1a25');
    bgGrad.addColorStop(1, '#0a0e14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient glows
    drawGlow(ctx, 180, 260, 400, "rgba(56, 189, 248, 0.05)");
    drawGlow(ctx, W - 200, 100, 350, "rgba(168, 85, 247, 0.04)");

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.012)";
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let i = 0; i < H; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

    // Outer border
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ══════════════════════════════════════════
    // LEFT PANEL - Profile Section
    // ══════════════════════════════════════════
    const panelW = 340;
    roundRect(ctx, 0, 0, panelW, H, 20);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, panelW, H);
    ctx.beginPath();
    ctx.moveTo(panelW, 0);
    ctx.lineTo(panelW, H);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Avatar
    const avSize = 120;
    const avX = (panelW - avSize) / 2;
    const avY = 40;

    try {
        const avUrl = targetUser.displayAvatarURL ? targetUser.displayAvatarURL({ extension: 'png', size: 256 }) : targetUser.avatarURL;
        const avatarImage = await loadImage(avUrl);
        drawGlow(ctx, avX + avSize / 2, avY + avSize / 2, avSize, "rgba(56, 189, 248, 0.12)");

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImage, avX, avY, avSize, avSize);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 3, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        const ringGrad = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize);
        ringGrad.addColorStop(0, '#38bdf8');
        ringGrad.addColorStop(1, '#a855f7');
        ctx.strokeStyle = ringGrad;
        ctx.stroke();
    } catch (e) {
        ctx.fillStyle = "#1e2030";
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Username
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Manrope";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const displayName = truncateText(ctx, targetUser.globalName || targetUser.username, panelW - 40);
    ctx.fillText(displayName, panelW / 2, avY + avSize + 18);

    // Badge
    const badgeY = avY + avSize + 48;
    const badgeW = 170;
    roundRect(ctx, (panelW - badgeW) / 2, badgeY, badgeW, 28, 8);
    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    ctx.fill();
    ctx.font = "bold 13px Manrope";
    ctx.fillStyle = "#38bdf8";
    ctx.textBaseline = "middle";
    ctx.fillText("🤝 Partner Sorumlusu", panelW / 2, badgeY + 14);

    // Total Partners - Big counter
    const totalCount = data.partnerCount || 0;
    const counterY = badgeY + 54;

    roundRect(ctx, 24, counterY, panelW - 48, 130, 16);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fill();
    roundRect(ctx, 24, counterY, panelW - 48, 130, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top accent line on counter
    ctx.save();
    roundRect(ctx, 24, counterY, panelW - 48, 3, 0);
    ctx.clip();
    const counterAccent = ctx.createLinearGradient(24, 0, panelW - 24, 0);
    counterAccent.addColorStop(0, '#38bdf8');
    counterAccent.addColorStop(1, '#a855f7');
    ctx.fillStyle = counterAccent;
    ctx.fillRect(24, counterY, panelW - 48, 3);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 12px Manrope";
    ctx.textBaseline = "middle";
    ctx.fillText("TOPLAM PARTNERLİK", panelW / 2, counterY + 28);

    // Big number with gradient
    ctx.font = "bold 56px Manrope";
    const numGrad = ctx.createLinearGradient(panelW / 2 - 60, counterY + 50, panelW / 2 + 60, counterY + 100);
    numGrad.addColorStop(0, '#38bdf8');
    numGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = numGrad;
    ctx.fillText(`${totalCount}`, panelW / 2, counterY + 70);

    // Sub-label
    ctx.font = "13px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("başarılı partnerlik", panelW / 2, counterY + 112);

    // ══════════════════════════════════════════
    // RIGHT PANEL - Recent Partners
    // ══════════════════════════════════════════
    const rightX = panelW + 30;
    const rightY = 30;
    const rightW = W - panelW - 60;

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 20px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("📋 Son Partner Olunan Sunucular", rightX, rightY + 10);

    // Divider
    ctx.beginPath();
    ctx.moveTo(rightX, rightY + 30);
    ctx.lineTo(rightX + rightW, rightY + 30);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const recentList = data.recentPartners || [];

    if (recentList.length === 0) {
        const emptyY = rightY + 60;
        roundRect(ctx, rightX, emptyY, rightW, 80, 14);
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.font = "16px Manrope";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillText("Henüz kayıtlara geçmiş bir partnerlik bulunmuyor.", rightX + rightW / 2, emptyY + 40);
    } else {
        let rowY = rightY + 50;
        const maxItems = Math.min(recentList.length, 6);

        for (let i = 0; i < maxItems; i++) {
            const item = recentList[i];
            const rowH = 64;

            // Row card
            roundRect(ctx, rightX, rowY, rightW, rowH, 12);
            ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)";
            ctx.fill();
            roundRect(ctx, rightX, rowY, rightW, rowH, 12);
            ctx.strokeStyle = "rgba(255,255,255,0.03)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Left accent
            roundRect(ctx, rightX, rowY, 4, rowH, 0);
            const accentColors = ['#38bdf8', '#a855f7', '#34d399', '#fbbf24', '#f472b6', '#60a5fa'];
            ctx.fillStyle = accentColors[i % accentColors.length];
            ctx.fill();

            const cy = rowY + rowH / 2;

            // Number circle
            const circleX = rightX + 28;
            ctx.beginPath();
            ctx.arc(circleX, cy, 16, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "bold 13px Manrope";
            ctx.textAlign = "center";
            ctx.fillText(`${i + 1}`, circleX, cy);

            // Guild Name
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px Manrope";
            const gName = truncateText(ctx, item.guildName || "Bilinmeyen Sunucu", rightW - 260);
            ctx.fillText(gName, rightX + 56, cy - 8);

            // Date below name
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.font = "13px Manrope";
            const timeStr = item.lastPartnerAt ? moment(item.lastPartnerAt).format("DD MMM YYYY, HH:mm") : "Tarih bilinmiyor";
            ctx.fillText(timeStr, rightX + 56, cy + 14);

            // Time ago badge
            if (item.lastPartnerAt) {
                const ago = moment(item.lastPartnerAt).fromNow();
                ctx.textAlign = "right";
                ctx.font = "12px Manrope";
                ctx.fillStyle = "rgba(255,255,255,0.25)";
                ctx.fillText(ago, rightX + rightW - 18, cy);
            }

            rowY += rowH + 10;
        }
    }

    return await canvas.encode('png');
};
