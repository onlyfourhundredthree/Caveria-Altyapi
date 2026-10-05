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

function formatDur(ms) {
    if (!ms || ms <= 0) return "0dk";
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
    // Background
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    // Fill
    const fillW = Math.max(h, w * Math.min(progress, 1));
    roundRect(ctx, x, y, fillW, h, h / 2);
    const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + "99");
    ctx.fillStyle = grad;
    ctx.fill();
}

module.exports.renderStaffStatCanvas = async function(data, targetUser) {
    const W = 1100;
    const H = 520;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ══════════════════════════════════════════
    // BACKGROUND
    // ══════════════════════════════════════════
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0c0e16');
    bgGrad.addColorStop(0.5, '#111525');
    bgGrad.addColorStop(1, '#0a0c14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient glows
    drawGlow(ctx, 200, 260, 400, "rgba(88, 101, 242, 0.06)");
    drawGlow(ctx, W - 200, 150, 350, "rgba(87, 242, 135, 0.04)");

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
    // STATS CALCULATION
    // ══════════════════════════════════════════
    const stats = data.stats || {};
    let regCount = 0, muteCount = 0, jailCount = 0, banCount = 0;
    if (data.staff && Array.isArray(data.staff.categoryStats)) {
        for (const stat of data.staff.categoryStats) {
            const cat = stat.category ? stat.category.toLowerCase() : "";
            if (cat.includes("kay") || cat.includes("reg")) regCount += stat.count;
            if (cat.includes("mut") || cat.includes("sus")) muteCount += stat.count;
            if (cat.includes("jai") || cat.includes("cez")) jailCount += stat.count;
            if (cat.includes("ban") || cat.includes("yas")) banCount += stat.count;
        }
    }

    if (data.staffPunitives && Array.isArray(data.staffPunitives)) {
        for (const p of data.staffPunitives) {
            const t = (p.Type || "").toLowerCase();
            if (t.includes("mute") || t.includes("sustur")) muteCount++;
            else if (t.includes("jail") || t.includes("ceza") || t.includes("hapis")) jailCount++;
            else if (t.includes("ban") || t.includes("yasak") || t.includes("yargı")) banCount++;
            else if (t.includes("uyarı") || t.includes("warn")) muteCount++; // Just add to something or create a Warn category if needed
        }
    }

    // ══════════════════════════════════════════
    // LEFT PANEL - Profile Section
    // ══════════════════════════════════════════
    const panelW = 340;
    roundRect(ctx, 0, 0, panelW, H, 20);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    ctx.fillRect(0, 0, panelW, H);

    // Panel right border
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
        drawGlow(ctx, avX + avSize / 2, avY + avSize / 2, avSize, "rgba(88, 101, 242, 0.12)");

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImage, avX, avY, avSize, avSize);
        ctx.restore();

        // Gradient ring
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 3, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        const ringGrad = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize);
        ringGrad.addColorStop(0, '#5865F2');
        ringGrad.addColorStop(1, '#57F287');
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
    const badgeW = 180;
    roundRect(ctx, (panelW - badgeW) / 2, badgeY, badgeW, 28, 8);
    ctx.fillStyle = "rgba(88, 101, 242, 0.15)";
    ctx.fill();
    ctx.font = "bold 13px Manrope";
    ctx.fillStyle = "#818cf8";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡ Yetkili İstatistikleri", panelW / 2, badgeY + 14);

    // Total Actions - Big counter
    const totalActions = regCount + muteCount + jailCount + banCount;
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
    counterAccent.addColorStop(0, '#5865F2');
    counterAccent.addColorStop(1, '#57F287');
    ctx.fillStyle = counterAccent;
    ctx.fillRect(24, counterY, panelW - 48, 3);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 12px Manrope";
    ctx.fillText("TOPLAM İŞLEM", panelW / 2, counterY + 30);

    // Big number with gradient
    ctx.font = "bold 56px Manrope";
    const numGrad = ctx.createLinearGradient(panelW / 2 - 60, counterY + 50, panelW / 2 + 60, counterY + 100);
    numGrad.addColorStop(0, '#5865F2');
    numGrad.addColorStop(1, '#57F287');
    ctx.fillStyle = numGrad;
    ctx.fillText(`${totalActions.toLocaleString()}`, panelW / 2, counterY + 82);

    // Sub-label
    ctx.font = "13px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("moderatör komutu kullanımı", panelW / 2, counterY + 115);

    // ══════════════════════════════════════════
    // RIGHT PANEL - Stats Grid
    // ══════════════════════════════════════════
    const gridX = panelW + 30;
    const gridY = 30;
    const gridW = W - panelW - 60;

    // Section title
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 20px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("📊 Performans Verileri", gridX, gridY + 10);

    // Divider
    ctx.beginPath();
    ctx.moveTo(gridX, gridY + 30);
    ctx.lineTo(gridX + gridW, gridY + 30);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Stats cards
    const cardsData = [
        { icon: "🎙️", title: "Ses Süresi", val: formatDur(stats.voice), color: "#34d399", max: 100 },
        { icon: "💬", title: "Mesaj", val: (stats.message || 0).toLocaleString(), color: "#60a5fa", max: 100 },
        { icon: "📨", title: "Davet", val: (stats.invite || 0).toLocaleString(), color: "#fbbf24", max: 100 },
        { icon: "📝", title: "Kayıt", val: regCount.toLocaleString(), color: "#f472b6", max: 100 },
        { icon: "🔇", title: "Mute", val: muteCount.toLocaleString(), color: "#fcd34d", max: 100 },
        { icon: "⛓️", title: "Jail", val: jailCount.toLocaleString(), color: "#c084fc", max: 100 },
        { icon: "🔨", title: "Ban", val: banCount.toLocaleString(), color: "#f87171", max: 100 },
        { icon: "⭐", title: "Rating", val: data.ratings?.avg ? `${parseFloat(data.ratings.avg).toFixed(1)}/5` : "0/5", color: "#fbbf24", max: 5 }
    ];

    const cols = 2;
    const cardW2 = (gridW - 16) / cols;
    const cardH2 = 80;
    const gapX = 16;
    const gapY = 14;
    const startY = gridY + 48;

    for (let i = 0; i < cardsData.length; i++) {
        const cd = cardsData[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gridX + col * (cardW2 + gapX);
        const cy = startY + row * (cardH2 + gapY);

        // Card bg
        roundRect(ctx, cx, cy, cardW2, cardH2, 14);
        ctx.fillStyle = "rgba(255,255,255,0.025)";
        ctx.fill();
        roundRect(ctx, cx, cy, cardW2, cardH2, 14);
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Left color indicator
        roundRect(ctx, cx, cy, 4, cardH2, 0);
        ctx.fillStyle = cd.color;
        ctx.fill();

        // Icon + Title
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "16px Manrope";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${cd.icon}`, cx + 18, cy + 24);
        ctx.font = "bold 14px Manrope";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillText(cd.title, cx + 42, cy + 24);

        // Value
        ctx.textAlign = "right";
        ctx.font = "bold 22px Manrope";
        ctx.fillStyle = cd.color;
        ctx.fillText(cd.val, cx + cardW2 - 18, cy + 24);

        // Progress bar
        const numVal = parseFloat(String(cd.val).replace(/[^\d.]/g, '')) || 0;
        const progress = Math.min(numVal / cd.max, 1);
        drawProgressBar(ctx, cx + 18, cy + 50, cardW2 - 36, 8, progress, cd.color);
    }

    return await canvas.encode('png');
};
