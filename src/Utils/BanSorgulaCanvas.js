"use strict";

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');
const moment = require('moment');

// Font Registration
try {
    const fontsDir = fs.existsSync(path.join(__dirname, "..", "Assets", "Fonts"))
        ? path.join(__dirname, "..", "Assets", "Fonts")
        : path.join(__dirname, "..", "..", "Assets", "Fonts");
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

function getLines(ctx, text, maxWidth) {
    if (!text) return [""];
    const words = text.split(" ");
    const lines = [];
    let cur = words[0] || "";
    for (let i = 1; i < words.length; i++) {
        if (ctx.measureText(cur + " " + words[i]).width < maxWidth) {
            cur += " " + words[i];
        } else {
            lines.push(cur);
            cur = words[i];
        }
    }
    lines.push(cur);
    return lines;
}

function drawGlow(ctx, x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

async function renderBanCanvas(punishments, page, totalPages, totalCount, memberData) {
    const W = 1000;
    const pad = 36;
    const headerH = 220;
    const rowH = 72;

    const dummyCanvas = createCanvas(1, 1);
    const dummyCtx = dummyCanvas.getContext('2d');
    dummyCtx.font = "14px Manrope";

    let totalRowsHeight = 0;
    const rowHeights = [];
    if (punishments.length === 0) {
        totalRowsHeight = 80;
        rowHeights.push(80);
    } else {
        for (const p of punishments) {
            const statusText = p.Active ? (p.Reason || "Sebep belirtilmemiş.") : (p.RemoveReason || p.Reason || "Sistem / Manuel Onarım");
            const lines = getLines(dummyCtx, statusText, 300).length;
            const extra = Math.max(lines - 1, 0);
            const h = rowH + (extra * 18);
            rowHeights.push(h);
            totalRowsHeight += h;
        }
    }

    const tableHeaderH = 50;
    const footerH = 60;
    const H = headerH + tableHeaderH + totalRowsHeight + footerH + pad * 2 + 30;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ══════════════════════════════════════════
    // BACKGROUND
    // ══════════════════════════════════════════
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#12080e');
    bgGrad.addColorStop(0.5, '#1a0f18');
    bgGrad.addColorStop(1, '#0e0810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Red ambient glow
    drawGlow(ctx, 150, 100, 350, "rgba(237, 66, 69, 0.05)");
    drawGlow(ctx, W - 100, H * 0.6, 300, "rgba(237, 66, 69, 0.03)");

    // Grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.012)";
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let i = 0; i < H; i += 60) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
    }

    // Outer border
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.strokeStyle = "rgba(237,66,69,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ══════════════════════════════════════════
    // HEADER - Profile Card
    // ══════════════════════════════════════════
    const hx = pad;
    const hy = pad;
    const hw = W - pad * 2;

    roundRect(ctx, hx, hy, hw, headerH, 16);
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fill();
    roundRect(ctx, hx, hy, hw, headerH, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Red accent line
    ctx.save();
    roundRect(ctx, hx, hy, hw, 4, 0);
    ctx.clip();
    const accentGrad = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    accentGrad.addColorStop(0, '#ed4245');
    accentGrad.addColorStop(0.5, '#ff6b6b');
    accentGrad.addColorStop(1, '#ed4245');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(hx, hy, hw, 4);
    ctx.restore();

    // Avatar
    const avSize = 120;
    const avX = hx + 36;
    const avY = hy + (headerH - avSize) / 2 + 5;

    try {
        const avatarImage = await loadImage(memberData.avatarUrl);
        drawGlow(ctx, avX + avSize / 2, avY + avSize / 2, avSize * 0.8, "rgba(237, 66, 69, 0.15)");

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImage, avX, avY, avSize, avSize);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 3, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ed4245';
        ctx.stroke();
    } catch (e) {
        ctx.fillStyle = "#1e2030";
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // User Info
    const textX = avX + avSize + 36;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    ctx.font = "bold 28px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(memberData.tag || "Bilinmeyen Kullanıcı", textX, avY + 8);

    ctx.font = "15px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(`ID: ${memberData.id}`, textX, avY + 44);

    // Stat pills
    const pillY = avY + 78;
    ctx.textBaseline = "middle";

    const totalBanText = `Toplam Ban: ${memberData.totalBans}`;
    ctx.font = "bold 14px Manrope";
    const banPillW = ctx.measureText(totalBanText).width + 32;
    roundRect(ctx, textX, pillY, banPillW, 36, 10);
    ctx.fillStyle = "rgba(237,66,69,0.12)";
    ctx.fill();
    roundRect(ctx, textX, pillY, banPillW, 36, 10);
    ctx.strokeStyle = "rgba(237,66,69,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ff6b6b";
    ctx.fillText(totalBanText, textX + 16, pillY + 18);

    // Active bans pill
    const activeBans = punishments.filter(p => p.Active).length;
    const activeText = activeBans > 0 ? `Aktif: ${activeBans}` : "Aktif Ban Yok";
    const activePillW = ctx.measureText(activeText).width + 32;
    roundRect(ctx, textX + banPillW + 12, pillY, activePillW, 36, 10);
    ctx.fillStyle = activeBans > 0 ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)";
    ctx.fill();
    ctx.fillStyle = activeBans > 0 ? "#f87171" : "#34d399";
    ctx.fillText(activeText, textX + banPillW + 28, pillY + 18);

    // ══════════════════════════════════════════
    // TABLE
    // ══════════════════════════════════════════
    const tableY = hy + headerH + 24;

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "bold 20px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("🔨 Ban & Yasaklama Kayıtları", pad + 4, tableY + 14);

    // Column headers
    const colHeaderY = tableY + 40;
    roundRect(ctx, pad, colHeaderY, W - pad * 2, 36, 8);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();

    ctx.font = "bold 12px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.35)";

    const colDefs = [
        { x: pad + 20, label: "NO", align: "left" },
        { x: pad + 80, label: "TARİH", align: "left" },
        { x: pad + 280, label: "TÜR", align: "left" },
        { x: pad + 480, label: "SEBEP / ONARIM", align: "left" },
        { x: W - pad - 60, label: "DURUM", align: "center" }
    ];
    for (const c of colDefs) {
        ctx.textAlign = c.align;
        ctx.fillText(c.label, c.x, colHeaderY + 18);
    }

    // Rows
    let currentY = colHeaderY + 42;

    if (punishments.length === 0) {
        roundRect(ctx, pad, currentY, W - pad * 2, 70, 10);
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.font = "16px Manrope";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText("✨ Bu kullanıcıya ait yasaklama kaydı bulunamadı.", W / 2, currentY + 35);
        currentY += 70;
    } else {
        for (let i = 0; i < punishments.length; i++) {
            const p = punishments[i];
            const rh = rowHeights[i];

            roundRect(ctx, pad, currentY, W - pad * 2, rh, 10);
            ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.008)";
            ctx.fill();

            // Left accent
            const isActive = p.Active;
            roundRect(ctx, pad, currentY, 4, rh, 0);
            ctx.fillStyle = isActive ? "#34d399" : "#f87171";
            ctx.fill();

            const cy = currentY + rh / 2;
            ctx.textBaseline = "middle";

            // NO
            ctx.textAlign = "left";
            ctx.font = "bold 14px Manrope";
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillText(`#${p.No || '-'}`, pad + 20, cy);

            // DATE
            ctx.font = "14px Manrope";
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.fillText(p.Date ? moment(p.Date).format("DD.MM.YYYY HH:mm") : "Bilinmiyor", pad + 80, cy);

            // TYPE
            ctx.font = "bold 14px Manrope";
            ctx.fillStyle = "#ff6b6b";
            const typeLines = getLines(ctx, p.Type || 'Discord Yasaklaması', 180);
            let ty = cy - ((typeLines.length - 1) * 18) / 2;
            for (const line of typeLines) {
                ctx.fillText(line, pad + 280, ty);
                ty += 18;
            }

            // REASON / STATUS
            ctx.font = "14px Manrope";
            let statusText;
            if (isActive) {
                ctx.fillStyle = "rgba(255,255,255,0.6)";
                statusText = p.Reason || "Sebep belirtilmemiş.";
            } else {
                ctx.fillStyle = "rgba(248,113,113,0.7)";
                statusText = p.RemoveReason || p.Reason || "Sistem / Manuel Onarım";
            }
            const statusLines = getLines(ctx, statusText, 300);
            let sy = cy - ((statusLines.length - 1) * 18) / 2;
            for (const line of statusLines) {
                ctx.fillText(line, pad + 480, sy);
                sy += 18;
            }

            // STATUS badge
            ctx.textAlign = "center";
            const badgeW = 64;
            const badgeH = 24;
            const badgeX = W - pad - 60 - badgeW / 2;
            const badgeY = cy - badgeH / 2;
            const badgeColor = isActive ? "#34d399" : "#f87171";
            const badgeBg = isActive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)";

            roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
            ctx.fillStyle = badgeBg;
            ctx.fill();
            ctx.font = "bold 11px Manrope";
            ctx.fillStyle = badgeColor;
            ctx.fillText(isActive ? "AKTİF" : "KALKTI", badgeX + badgeW / 2, cy);

            currentY += rh;
        }
    }

    // Footer
    const footerY = currentY + 16;
    ctx.beginPath();
    ctx.moveTo(pad, footerY);
    ctx.lineTo(W - pad, footerY);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "14px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(`Sayfa ${page + 1} / ${totalPages}  ·  Toplam ${totalCount} yasaklama kaydı`, W / 2, footerY + 28);

    return canvas.toBuffer('image/png');
}

module.exports = { renderBanCanvas };
