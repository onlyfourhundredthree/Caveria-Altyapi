"use strict";

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');

// Font Registration
try {
    let boldFont = path.join(__dirname, "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    if (!fs.existsSync(boldFont)) {
        boldFont = path.join(__dirname, "..", "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    }
    if (fs.existsSync(boldFont)) {
        GlobalFonts.registerFromPath(boldFont, "Manrope");
    }
} catch (e) { /* Font zaten yüklü olabilir */ }

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

async function renderVampireProfile(memberData) {
    const W = 800;
    const H = 420;
    const pad = 32;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background Gradient (Dark Night/Vampire Theme)
    roundRect(ctx, 0, 0, W, H, 24);
    ctx.save();
    ctx.clip();
    const bgGradient = ctx.createLinearGradient(0, 0, W, H);
    bgGradient.addColorStop(0, '#0a0510');
    bgGradient.addColorStop(1, '#1a0b16');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);
    
    // Add some subtle noise/stars or red glowing effects
    const glowGradient = ctx.createRadialGradient(W, 0, 50, W, 0, 400);
    glowGradient.addColorStop(0, 'rgba(237, 66, 69, 0.15)');
    glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Outer Border
    roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 24);
    ctx.strokeStyle = "rgba(237, 66, 69, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ==========================================
    // TITLE & LIG (Right Side)
    // ==========================================
    // League Colors
    let ligColor = "#ffffff";
    let ligName = "Bronz";
    if (memberData.elo < 1000) { ligColor = "#cd7f32"; ligName = "Bronz"; }
    else if (memberData.elo < 1500) { ligColor = "#c0c0c0"; ligName = "Gümüş"; }
    else if (memberData.elo < 2000) { ligColor = "#ffd700"; ligName = "Altın"; }
    else { ligColor = "#00ffff"; ligName = "Elmas"; }

    // Title (Emoji Removed)
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.font = "28px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Vampir Köylü Kariyeri", W - pad, pad);
    
    // Elo Badge (Emoji Removed)
    const badgeW = 220;
    const badgeH = 45;
    const badgeX = W - pad - badgeW;
    const badgeY = pad + 45;

    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();
    ctx.strokeStyle = ligColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "18px Manrope";
    ctx.fillStyle = ligColor;
    ctx.fillText(`Lig: ${ligName} (${memberData.elo})`, badgeX + (badgeW / 2), badgeY + (badgeH / 2));

    // ==========================================
    // AVATAR & NAME (Left Side)
    // ==========================================
    const avatarSize = 130;
    const avatarX = pad;
    const avatarY = pad;

    try {
        const avatarImage = await loadImage(memberData.avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        
        // Avatar Border
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = ligColor;
        ctx.stroke();
    } catch (e) {
        ctx.fillStyle = "#2c2f33";
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Username
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "32px Manrope";
    ctx.fillStyle = "#ffffff";
    const nameY = avatarY + avatarSize + 25;
    
    // Auto scale name if it's too long
    const maxNameW = 340;
    let nameText = memberData.tag;
    if (ctx.measureText(nameText).width > maxNameW) {
        while(ctx.measureText(nameText + "...").width > maxNameW && nameText.length > 0) {
            nameText = nameText.substring(0, nameText.length - 1);
        }
        nameText += "...";
    }
    ctx.fillText(nameText, pad, nameY);

    // MVP Count (Emoji Removed)
    ctx.font = "20px Manrope";
    ctx.fillStyle = "#ffb84d";
    ctx.fillText(`${memberData.mvpCount} Kez Maçın Efsanesi`, pad, nameY + 45);

    // ==========================================
    // STATS SECTION (Bottom Right Panel)
    // ==========================================
    const statsX = 360; // Moved slightly left
    const statsY = badgeY + badgeH + 40;
    const statsW = W - pad - statsX;
    const statsH = H - pad - statsY;

    // Background for stats
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    roundRect(ctx, statsX, statsY, statsW, statsH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "20px Manrope"; // Reduced font size slightly
    
    const rowGap = statsH / 3;
    let currentY = statsY + (rowGap / 2);

    // Kazanma Oranı (Emojis Removed)
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Kazanma Oranı:", statsX + 25, currentY);
    ctx.fillStyle = memberData.winRate >= 50 ? "#57f287" : (memberData.winRate >= 30 ? "#fee75c" : "#ed4245");
    ctx.fillText(`%${memberData.winRate}`, statsX + 195, currentY); // Adjusted X
    ctx.font = "16px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`(${memberData.wins}G / ${memberData.losses}M)`, statsX + 250, currentY); // Adjusted X

    currentY += rowGap;
    
    // Toplam Maç
    ctx.font = "20px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Toplam Maç:", statsX + 25, currentY);
    ctx.fillStyle = "#5865F2";
    ctx.fillText(`${memberData.gamesPlayed}`, statsX + 195, currentY);

    currentY += rowGap;

    // En Çok Oynanan Rol
    ctx.font = "20px Manrope";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Favori Rol:", statsX + 25, currentY);
    
    // Role text might be long, handle safely
    let safeRoleName = memberData.roleName;
    if(ctx.measureText(safeRoleName).width > 120) {
        ctx.font = "16px Manrope"; // Auto shrink
    }
    
    ctx.fillStyle = "#eb459e";
    ctx.fillText(`${safeRoleName}`, statsX + 155, currentY);
    
    ctx.font = "16px Manrope";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(`(${memberData.maxPlays} Maç)`, statsX + 165 + ctx.measureText(safeRoleName).width, currentY);

    return canvas.toBuffer('image/png');
}

module.exports = { renderVampireProfile };
