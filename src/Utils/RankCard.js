"use strict";

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require("path");

const boldFont = path.join(__dirname, "..", "Assets", "Fonts", "Manrope-Bold.ttf");
try {
    GlobalFonts.registerFromPath(boldFont, "ManropeBold");
} catch (e) {
    console.error("RankCard: Font loading failed, falling back to system fonts.");
}

module.exports = class Rank {
    constructor() {
        this.avatar = "https://cdn.discordapp.com/embed/avatars/0.png";
        this.username = "Unknown";
        this.rolename = "Member";
        this.status = "offline";
        this.background = { type: "color", value: "transparent" };
        this.overlay_opacity = 0.5;
        this.barColor = "#5865f2";

        this.chat = { level: 1, current: 0, required: 100, rank: 0, color: "#5865f2" };
        this.voice = { level: 1, current: 0, required: 100, rank: 0, color: "#3ba55c" };

        this.border = null;
    }

    setAvatar(url) { this.avatar = url; return this; }
    setUsername(name) { this.username = name; return this; }
    setRoleName(name) { this.rolename = name; return this; }
    setStatus(status) { this.status = status; return this; }
    setBackground(type, value) { this.background = { type, value }; return this; }
    setOverlayOpacity(opacity) { this.overlay_opacity = opacity; return this; }
    setBorder(color) { this.border = color; return this; }

    setChatData(level, current, required, rank, color) {
        this.chat = { level, current, required, rank, color: color || this.chat.color };
        return this;
    }

    setVoiceData(level, current, required, rank, color) {
        this.voice = { level, current, required, rank, color: color || this.voice.color };
        return this;
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

    async build() {
        const width = 900;
        const height = 300;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        if (this.background.value !== "transparent") {
            if (this.background.type === "color") {
                ctx.fillStyle = this.background.value;
                ctx.fillRect(0, 0, width, height);
            } else {
                try {
                    const bg = await loadImage(this.background.value);
                    const ratio = Math.max(width / bg.width, height / bg.height);
                    const nw = bg.width * ratio;
                    const nh = bg.height * ratio;
                    ctx.drawImage(bg, (width - nw) / 2, (height - nh) / 2, nw, nh);
                } catch { }
            }
        }

        ctx.save();
        ctx.globalAlpha = this.overlay_opacity;
        ctx.fillStyle = "#000000";
        this.drawRoundRect(ctx, 20, 20, width - 40, height - 40, 35);
        ctx.fill();
        ctx.restore();

        if (this.border) {
            ctx.strokeStyle = this.border;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            this.drawRoundRect(ctx, 20, 20, width - 40, height - 40, 35);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        const avatarSize = 170;
        const avatarX = 55;
        const avatarY = (height - avatarSize) / 2;

        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.border || this.chat.color;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        try {
            const avatarImg = await loadImage(this.avatar);
            ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        } catch { }
        ctx.restore();

        const statusColors = { online: "#43b581", idle: "#faa61a", dnd: "#f04747", offline: "#747f8e", stream: "#593695" };
        const sColor = statusColors[this.status] || statusColors.offline;
        ctx.fillStyle = sColor;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize - 25, avatarY + avatarSize - 25, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const contentX = avatarX + avatarSize + 45;

        ctx.font = "40px ManropeBold";
        ctx.fillStyle = "#FFFFFF";
        const displayUsername = this.username.length > 14 ? this.username.slice(0, 14) + "..." : this.username;
        ctx.fillText(displayUsername, contentX, 85);

        ctx.font = "20px ManropeBold";
        ctx.fillStyle = this.border || "#FFFFFF";
        ctx.globalAlpha = 0.6;
        ctx.fillText(this.rolename, contentX, 115);
        ctx.globalAlpha = 1.0;

        const drawStat = (y, data, label) => {
            const barWidth = 500;
            const barHeight = 22;

            ctx.font = "16px ManropeBold";
            ctx.fillStyle = "#FFFFFF";
            ctx.globalAlpha = 0.7;
            ctx.fillText(label.toUpperCase(), contentX, y - 5);

            ctx.textAlign = "right";
            ctx.font = "18px ManropeBold";
            ctx.fillStyle = data.color;
            ctx.globalAlpha = 1.0;
            ctx.fillText(`LVL ${data.level}  |  #${data.rank || "0"}`, contentX + barWidth, y - 5);
            ctx.textAlign = "left";

            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            this.drawRoundRect(ctx, contentX, y + 5, barWidth, barHeight, 11);
            ctx.fill();

            const progress = Math.min(data.current / (data.required || 1), 1);
            if (progress > 0) {
                const grad = ctx.createLinearGradient(contentX, 0, contentX + barWidth, 0);
                grad.addColorStop(0, data.color);
                grad.addColorStop(1, this.lighten(data.color, 30));
                ctx.fillStyle = grad;
                this.drawRoundRect(ctx, contentX, y + 5, barWidth * progress, barHeight, 11);
                ctx.fill();
            }

            ctx.font = "12px ManropeBold";
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "center";
            ctx.fillText(`${data.current?.toLocaleString()} / ${data.required?.toLocaleString()} XP`, contentX + barWidth / 2, y + 21);
            ctx.textAlign = "left";
        };

        drawStat(160, this.chat, "Mesaj Seviyesi");
        drawStat(235, this.voice, "Ses Seviyesi");

        return canvas.toBuffer('image/png');
    }

    lighten(color, percent) {
        const num = parseInt(color.replace("#", ""), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) + amt,
            B = (num >> 8 & 0x00FF) + amt,
            G = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255)).toString(16).slice(1);
    }
};

