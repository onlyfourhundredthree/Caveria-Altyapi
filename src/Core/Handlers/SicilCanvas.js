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
    const roboto = path.join(fontsDir, "Roboto.ttf");
    if (fs.existsSync(roboto)) GlobalFonts.registerFromPath(roboto, "Roboto");
} catch (e) {}

// ── Drawing Helpers ──
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

function getTypeColor(typeStr) {
    if (!typeStr) return '#7289da';
    const t = typeStr.toLowerCase();
    if (t.includes('ban') || t.includes('yasak') || t.includes('karantina')) return '#ff4d6a';
    if (t.includes('mute') || t.includes('sustur')) return '#ffd764';
    if (t.includes('jail') || t.includes('hapis') || t.includes('cezal')) return '#e879f9';
    if (t.includes('uyar') || t.includes('warn')) return '#fb923c';
    if (t.includes('kick') || t.includes('at')) return '#f87171';
    return '#818cf8';
}

function getTypeIcon(typeStr) {
    if (!typeStr) return '';
    const t = typeStr.toLowerCase();
    if (t.includes('ban') || t.includes('yasak')) return '';
    if (t.includes('mute') || t.includes('sustur')) return '';
    if (t.includes('jail') || t.includes('hapis') || t.includes('cezal')) return '';
    if (t.includes('uyar') || t.includes('warn')) return '';
    if (t.includes('kick') || t.includes('at')) return '';
    return '';
}

async function renderSicilCanvas(punishments, page, totalPages, totalCount, memberData) {
    const W = 1000;
    const pad = 36;
    const headerH = 220;
    const rowH = 72;

    // Calculate dynamic height
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
            const reasonLines = getLines(dummyCtx, p.Reason || '', 320).length;
            const extra = Math.max(reasonLines - 1, 0);
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
    // BACKGROUND - Deep dark gradient
    // ══════════════════════════════════════════
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0c0e16');
    bgGrad.addColorStop(0.5, '#111525');
    bgGrad.addColorStop(1, '#0a0c14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow effects
    drawGlow(ctx, 100, 120, 300, "rgba(88, 101, 242, 0.04)");
    drawGlow(ctx, W - 150, H - 200, 350, "rgba(237, 66, 69, 0.03)");

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.012)";
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let i = 0; i < H; i += 60) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
    }

    // Outer card border
    roundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // ══════════════════════════════════════════
    // HEADER SECTION - Profile Card
    // ══════════════════════════════════════════
    const hx = pad;
    const hy = pad;
    const hw = W - pad * 2;

    // Header card background with glass effect
    roundRect(ctx, hx, hy, hw, headerH, 16);
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fill();
    roundRect(ctx, hx, hy, hw, headerH, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top accent line
    ctx.save();
    roundRect(ctx, hx, hy, hw, 4, 0);
    ctx.clip();
    const accentGrad = ctx.createLinearGradient(hx, 0, hx + hw, 0);
    accentGrad.addColorStop(0, '#5865F2');
    accentGrad.addColorStop(0.5, '#eb459e');
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
        // Avatar glow
        drawGlow(ctx, avX + avSize / 2, avY + avSize / 2, avSize * 0.8, "rgba(88, 101, 242, 0.12)");

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarImage, avX, avY, avSize, avSize);
        ctx.restore();

        // Avatar ring
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 3, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        const ringGrad = ctx.createLinearGradient(avX, avY, avX + avSize, avY + avSize);
        ringGrad.addColorStop(0, '#5865F2');
        ringGrad.addColorStop(1, '#eb459e');
        ctx.strokeStyle = ringGrad;
        ctx.stroke();
    } catch (e) {
        ctx.fillStyle = "#1e2030";
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // User info
    const textX = avX + avSize + 36;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Username
    ctx.font = "bold 28px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(memberData.tag || "Bilinmeyen Kullanıcı", textX, avY + 8);

    // ID badge
    ctx.font = "15px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(`ID: ${memberData.id}`, textX, avY + 44);

    // ── Stat Pills ──
    const pillY = avY + 78;
    const pills = [
        { label: "Ceza Puanı", value: `${memberData.cezaPuani}`, color: "#ff4d6a", bg: "rgba(255,77,106,0.1)" },
        { label: "İşlem", value: `${totalCount}`, color: "#818cf8", bg: "rgba(129,140,248,0.1)" },
        { label: "Hf. Saygınlık", value: `${memberData.resWeekly}`, color: "#34d399", bg: "rgba(52,211,153,0.1)" },
        { label: "Top. Saygınlık", value: `${memberData.resTotal}`, color: "#34d399", bg: "rgba(52,211,153,0.1)" }
    ];

    let pillX = textX;
    ctx.textBaseline = "middle";
    for (const pill of pills) {
        ctx.font = "bold 13px Manrope";
        const labelW = ctx.measureText(pill.label + ": " + pill.value).width + 24;
        roundRect(ctx, pillX, pillY, labelW, 32, 8);
        ctx.fillStyle = pill.bg;
        ctx.fill();
        roundRect(ctx, pillX, pillY, labelW, 32, 8);
        ctx.strokeStyle = pill.color + "30";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = pill.color;
        ctx.fillText(`${pill.label}: ${pill.value}`, pillX + 12, pillY + 16);
        pillX += labelW + 10;
    }

    // ══════════════════════════════════════════
    // TABLE SECTION
    // ══════════════════════════════════════════
    const tableY = hy + headerH + 24;

    // Section title
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "bold 20px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("📋 Ceza Sicil Kayıtları", pad + 4, tableY + 14);

    // Column headers
    const colHeaderY = tableY + 40;
    roundRect(ctx, pad, colHeaderY, W - pad * 2, 36, 8);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();

    ctx.font = "bold 12px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textBaseline = "middle";

    const cols = [
        { x: pad + 20, label: "NO", align: "left" },
        { x: pad + 80, label: "TARİH", align: "left" },
        { x: pad + 280, label: "TÜR", align: "left" },
        { x: pad + 500, label: "SEBEP", align: "left" },
        { x: W - pad - 60, label: "DURUM", align: "center" }
    ];
    for (const c of cols) {
        ctx.textAlign = c.align;
        ctx.fillText(c.label, c.x, colHeaderY + 18);
    }

    // ── Rows ──
    let currentY = colHeaderY + 42;

    if (punishments.length === 0) {
        roundRect(ctx, pad, currentY, W - pad * 2, 70, 10);
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.font = "16px Manrope";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText("✨ Bu kullanıcının sicili tertemiz!", W / 2, currentY + 35);
        currentY += 70;
    } else {
        for (let i = 0; i < punishments.length; i++) {
            const p = punishments[i];
            const rh = rowHeights[i];

            // Row card
            roundRect(ctx, pad, currentY, W - pad * 2, rh, 10);
            ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.008)";
            ctx.fill();

            // Left accent bar
            const typeColor = getTypeColor(p.Type || '');
            roundRect(ctx, pad, currentY, 4, rh, 0);
            ctx.fillStyle = typeColor;
            ctx.fill();

            const cy = currentY + rh / 2;
            ctx.textBaseline = "middle";

            // NO
            ctx.textAlign = "left";
            ctx.font = "bold 14px Manrope";
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillText(`#${p.No}`, pad + 20, cy);

            // DATE
            ctx.font = "14px Manrope";
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            const dateStr = moment(p.Date).format("DD.MM.YYYY HH:mm");
            ctx.fillText(dateStr, pad + 80, cy);

            // TYPE
            ctx.font = "bold 14px Manrope";
            ctx.fillStyle = typeColor;
            const typeText = `${p.Type || 'Bilinmiyor'}`;
            const typeLines = getLines(ctx, typeText, 200);
            let ty = cy - ((typeLines.length - 1) * 18) / 2;
            for (const line of typeLines) {
                ctx.fillText(line, pad + 280, ty);
                ty += 18;
            }

            // REASON
            ctx.font = "14px Manrope";
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            const reasonLines = getLines(ctx, p.Reason || 'Belirtilmemiş', 320);
            let ry = cy - ((reasonLines.length - 1) * 18) / 2;
            for (const line of reasonLines) {
                ctx.fillText(line, pad + 500, ry);
                ry += 18;
            }

            // STATUS badge
            ctx.textAlign = "center";
            const statusW = 64;
            const statusH = 24;
            const statusX = W - pad - 60 - statusW / 2;
            const statusY = cy - statusH / 2;
            const isActive = p.Active;
            const badgeColor = isActive ? "#34d399" : "#f87171";
            const badgeBg = isActive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)";

            roundRect(ctx, statusX, statusY, statusW, statusH, 6);
            ctx.fillStyle = badgeBg;
            ctx.fill();
            roundRect(ctx, statusX, statusY, statusW, statusH, 6);
            ctx.strokeStyle = badgeColor + "40";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.font = "bold 11px Manrope";
            ctx.fillStyle = badgeColor;
            ctx.fillText(isActive ? "AKTİF" : "BİTTİ", statusX + statusW / 2, cy);

            currentY += rh;
        }
    }

    // ══════════════════════════════════════════
    // FOOTER
    // ══════════════════════════════════════════
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
    ctx.fillText(`Sayfa ${page + 1} / ${totalPages}  ·  Toplam ${totalCount} kayıt`, W / 2, footerY + 28);

    return canvas.toBuffer('image/png');
}

module.exports = { renderSicilCanvas };
