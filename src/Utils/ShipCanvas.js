"use strict";

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require("path");
const fs = require('fs');

try {
    let boldFont = path.join(__dirname, "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    if (!fs.existsSync(boldFont)) boldFont = path.join(__dirname, "..", "..", "Assets", "Fonts", "Manrope-Bold.ttf");
    if (fs.existsSync(boldFont)) GlobalFonts.registerFromPath(boldFont, "ManropeBold");
} catch (e) { }

module.exports = class ShipCanvas {
    constructor() {
        this.avatar1 = null;
        this.avatar2 = null;
        this.name1 = "User 1";
        this.name2 = "User 2";
        this.percentage = 0;
        this.text = "";
        this.bgImage = null;
        this.heartImage = null;
    }

    setAvatar1(url) { this.avatar1 = url; return this; }
    setAvatar2(url) { this.avatar2 = url; return this; }
    setName1(name) { this.name1 = name; return this; }
    setName2(name) { this.name2 = name; return this; }
    setPercentage(perc) { this.percentage = perc; return this; }
    setText(text) { this.text = text; return this; }
    setBackground(imgPath) { this.bgImage = imgPath; return this; }
    setHeartImage(imgPath) { this.heartImage = imgPath; return this; }

    getColorByPercentage(p) {
        if (p < 20) return "#ff3b30";
        if (p < 40) return "#ff9500";
        if (p < 60) return "#ffcc00";
        if (p < 80) return "#4cd964";
        return "#ff2d55"; // Hot pink for high love
    }

    drawRoundRect(ctx, x, y, w, h, r) {
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

    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let t = text;
        while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) {
            t = t.slice(0, -1);
        }
        return t + '...';
    }

    async build() {
        const width = 800;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Arka Plan
        this.drawRoundRect(ctx, 0, 0, width, height, 30);
        ctx.save();
        ctx.clip();

        // Varsayılan koyu arka plan
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#1a1a24');
        bgGrad.addColorStop(1, '#0f0f15');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        if (this.bgImage) {
            try {
                const bg = await loadImage(this.bgImage);
                const ratio = Math.max(width / bg.width, height / bg.height);
                const nw = bg.width * ratio;
                const nh = bg.height * ratio;
                
                ctx.globalAlpha = 0.4; // Koyu overlay
                ctx.drawImage(bg, (width - nw) / 2, (height - nh) / 2, nw, nh);
                ctx.globalAlpha = 1.0;
            } catch (e) {}
        }
        ctx.restore();

        // Kenarlık
        this.drawRoundRect(ctx, 1, 1, width - 2, height - 2, 30);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();

        const color = this.getColorByPercentage(this.percentage);

        // Arka Planda Glow (Parlama) efekti
        const glow = ctx.createRadialGradient(width/2, height/2, 50, width/2, height/2, 400);
        glow.addColorStop(0, color + '33'); // 20% opacity
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const avatarSize = 160;
        const avatarY = 90;
        const leftX = 100;
        const rightX = width - 100 - avatarSize;

        const drawAvatar = async (x, imgUrl, name) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.closePath();
            
            // Avatar Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.stroke();

            ctx.clip();
            try {
                const img = await loadImage(imgUrl);
                ctx.drawImage(img, x, avatarY, avatarSize, avatarSize);
            } catch (e) {
                ctx.fillStyle = "#2b2d31";
                ctx.fill();
            }
            ctx.restore();

            // İsim etiketi
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 24px ManropeBold";
            ctx.textAlign = "center";
            ctx.fillText(this.truncateText(ctx, name, 250), x + avatarSize/2, avatarY + avatarSize + 40);
        };

        await drawAvatar(leftX, this.avatar1, this.name1);
        await drawAvatar(rightX, this.avatar2, this.name2);

        const centerX = width / 2;
        const centerY = avatarY + avatarSize/2;

        // Yüzde Yazısı (En üstte)
        ctx.fillStyle = color;
        ctx.font = "bold 56px ManropeBold";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(`%${this.percentage}`, centerX, centerY - 65);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Progress Bar (Avatarları birleştiren)
        const barW = rightX - (leftX + avatarSize);
        const barH = 24;
        const barX = leftX + avatarSize;
        const barY = centerY - barH/2;

        this.drawRoundRect(ctx, barX, barY, barW, barH, barH/2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fill();

        const pW = (this.percentage / 100) * barW;
        if (pW > 0) {
            ctx.save();
            this.drawRoundRect(ctx, barX, barY, pW, barH, barH/2);
            ctx.clip();
            const pGrad = ctx.createLinearGradient(barX, barY, barX + pW, barY);
            pGrad.addColorStop(0, color);
            pGrad.addColorStop(1, this.getColorByPercentage(Math.min(100, this.percentage + 20)));
            ctx.fillStyle = pGrad;
            ctx.fill();
            ctx.restore();
            
            ctx.beginPath();
            ctx.arc(barX + pW - (barH/2), barY + barH/2, barH/2 - 2, 0, Math.PI*2);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fill();
        }

        // Emoji (Barın tam ortasında)
        if (this.heartImage) {
            try {
                const hImg = await loadImage(this.heartImage);
                ctx.drawImage(hImg, centerX - 35, centerY - 35, 70, 70);
            } catch(e) {}
        }

        // Alt taraftaki yorum yazısı
        ctx.fillStyle = "#ffffff";
        ctx.font = "italic 28px ManropeBold";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`"${this.text}"`, centerX, height - 40);

        return canvas.toBuffer('image/png');
    }
}
