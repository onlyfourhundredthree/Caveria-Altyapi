"use strict";

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');

// Font Registration
try {
    let boldFont = path.join(__dirname, "..", "..", "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    if (!fs.existsSync(boldFont)) {
        boldFont = path.join(__dirname, "..", "Assets", "Fonts", "Manrope-Bold.ttf");
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

function getLines(ctx, text, maxWidth) {
    if (!text) return [""];
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

module.exports = async function generateBirthdayCard(memberData) {
    const W = 1000;
    const H = 450;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background Gradient (Biraz daha mora dönük)
    const bgGradient = ctx.createLinearGradient(0, 0, W, H);
    bgGradient.addColorStop(0, '#b06ab3'); // Purple/Magenta
    bgGradient.addColorStop(0.5, '#e992b4'); // Soft pinkish purple
    bgGradient.addColorStop(1, '#b06ab3');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Draw some simple confetti (Pastel, Purple, Gold tones)
    const colors = ['#ffffff', '#ffb3c6', '#d695ff', '#f1c40f', '#ffcbf2'];
    for (let i = 0; i < 60; i++) {
        ctx.save();
        ctx.translate(Math.random() * W, Math.random() * H);
        ctx.rotate(Math.random() * Math.PI * 2);
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.globalAlpha = Math.random() * 0.5 + 0.2;
        if (Math.random() > 0.5) {
            ctx.fillRect(0, 0, Math.random() * 15 + 5, Math.random() * 15 + 5);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, Math.random() * 8 + 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Outer Border (Beyazımsı ince çerçeve)
    roundRect(ctx, 4, 4, W - 8, H - 8, 24);
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; 
    ctx.lineWidth = 4;
    ctx.stroke();

    // Box inside for content (Glassmorphism effect)
    const pad = 40;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(ctx, pad, pad, W - (pad * 2), H - (pad * 2), 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Custom Photo (Eğer varsa, sağa polaroid gibi çiz)
    let polaroidW = 0;
    if (memberData.customPhotoUrl) {
        try {
            const customImg = await loadImage(memberData.customPhotoUrl);
            ctx.save();
            // Sağ tarafa yerleştir
            ctx.translate(W - pad - 120, pad + (H - (pad * 2)) / 2);
            ctx.rotate(10 * Math.PI / 180); // Hafif döndür (10 derece)
            
            // Beyaz polaroid çerçevesi
            const pw = 220;
            const ph = 260;
            ctx.fillStyle = "#ffffff";
            
            // Gölge efekti simülasyonu (çizerek)
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            
            roundRect(ctx, -pw/2, -ph/2, pw, ph, 8);
            ctx.fill();
            
            ctx.shadowColor = "transparent"; // Reset shadow
            
            // Resmi içine çiz
            const iw = 190;
            const ih = 190;
            ctx.drawImage(customImg, -iw/2, -ph/2 + 15, iw, ih);
            ctx.restore();
            
            polaroidW = pw + 20; // Metin genişliğini kısıtlamak için
        } catch (e) {
            console.error("Custom photo yuklenemedi", e);
        }
    }

    // Draw Avatar
    const avatarSize = 160;
    const avatarX = pad + 40;
    const avatarY = pad + ((H - (pad * 2)) / 2) - (avatarSize / 2);
    
    try {
        const avatarImage = await loadImage(memberData.avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        
        // Avatar Border (Soft Pinkish White)
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
    } catch (e) {
        // Fallback
        ctx.fillStyle = "#2c2f33";
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Text Setup
    const textStartX = avatarX + avatarSize + 50;
    const maxTextWidth = W - textStartX - 50 - polaroidW; // Fotoğraf varsa yazıyı daralt
    
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    
    // "İyi ki Doğdun" header
    ctx.font = "bold 42px Manrope";
    ctx.fillStyle = "#5f2c82"; // Koyu mor
    ctx.fillText("İyi ki Doğdun,", textStartX, avatarY + 10);
    
    // Username
    ctx.font = "bold 56px Manrope";
    ctx.fillStyle = "#4b1b54"; // Dark plum/purple
    const userText = memberData.username;
    // measure text, maybe scale down if too long
    let nameFont = 56;
    while (ctx.measureText(userText).width > maxTextWidth && nameFont > 24) {
        nameFont -= 2;
        ctx.font = `bold ${nameFont}px Manrope`;
    }
    ctx.fillText(userText, textStartX, avatarY + 60);

    // Note Section
    const note = memberData.note || "Yeni yaşında her şey gönlünce olsun! 🎂🎉";
    ctx.font = "bold 24px Manrope";
    ctx.fillStyle = "rgba(75, 27, 84, 0.85)"; // Dark plum, highly visible
    
    const noteLines = getLines(ctx, note, maxTextWidth);
    
    let noteY = avatarY + 140;
    for (const line of noteLines.slice(0, 3)) { // Max 3 lines
        ctx.fillText(line, textStartX, noteY);
        noteY += 32;
    }

    return await canvas.encode('png');
};
