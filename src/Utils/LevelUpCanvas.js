"use strict";

const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");

try {
    let boldFont = path.join(__dirname, "../Assets/Fonts/Manrope-Bold.ttf");
    if (!fs.existsSync(boldFont)) boldFont = path.join(__dirname, "../../Assets/Fonts/Manrope-Bold.ttf");
    if (fs.existsSync(boldFont)) GlobalFonts.registerFromPath(boldFont, "Manrope");

    let regFont = path.join(__dirname, "../Assets/Fonts/Manrope-Regular.ttf");
    if (!fs.existsSync(regFont)) regFont = path.join(__dirname, "../../Assets/Fonts/Manrope-Regular.ttf");
    if (fs.existsSync(regFont)) GlobalFonts.registerFromPath(regFont, "ManropeReg");
} catch (e) {}

const ASSETS_DIR = path.join(__dirname, "../Assets/Leveling");
const assetCache = new Map();

async function getAsset(name) {
    if (assetCache.has(name)) return assetCache.get(name);
    const p = path.join(ASSETS_DIR, `${name}.png`);
    if (fs.existsSync(p)) {
        try {
            const img = await loadImage(p);
            assetCache.set(name, img);
            return img;
        } catch (e) {}
    }
    return null;
}

function drawRoundRect(ctx, x, y, w, h, r) {
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

async function renderLevelUpCard({ username, avatarUrl, oldLevel, newLevel, type, rewardRoleName, coinReward }) {
    const W = 900;
    const H = 240;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const safeUsername = (username || "Kullanıcı").toString();
    const safeOldLevel = parseInt(oldLevel) || 0;
    const safeNewLevel = parseInt(newLevel) || 1;
    const safeCoins = parseInt(coinReward) || (safeNewLevel * 100);

    const isVoice = type === "voice";
    const primaryColor = isVoice ? "#10b981" : "#3b82f6";
    const accentColor = isVoice ? "#34d399" : "#60a5fa";

    // Preload Asset Images
    const coinImg = await getAsset("coin");
    const crownImg = await getAsset("crown");
    const categoryImg = await getAsset(isVoice ? "voice" : "chat");

    // 1. Matte Cyber Obsidian Background (#0d1117 / #161b22)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#0d1117");
    bgGrad.addColorStop(1, "#161b22");
    ctx.fillStyle = bgGrad;
    drawRoundRect(ctx, 0, 0, W, H, 20);
    ctx.fill();

    // 2. Modern Geometric Accent Shapes (Decorative polygons)
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.moveTo(W - 250, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(W - 140, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isVoice ? "rgba(16, 185, 129, 0.06)" : "rgba(59, 130, 246, 0.06)";
    ctx.beginPath();
    ctx.moveTo(W - 180, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H - 60);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Subtle Frosted Glass Border (1px)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, 1, 1, W - 2, H - 2, 20);
    ctx.stroke();

    // Accent Side Stripe
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.moveTo(4, 20);
    ctx.lineTo(8, 20);
    ctx.lineTo(8, H - 20);
    ctx.lineTo(4, H - 20);
    ctx.closePath();
    ctx.fill();

    // 4. Avatar (Clean Circle with Subtle Ring)
    const avatarSize = 130;
    const avatarX = 40;
    const avatarY = (H - avatarSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    try {
        const avatar = await loadImage(avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png");
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
        ctx.fillStyle = "#21262d";
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // Crisp Ring around Avatar
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Header Title & Username
    const textX = 195;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Category Icon & Label
    if (categoryImg) {
        ctx.drawImage(categoryImg, textX, 32, 24, 24);
    }

    ctx.fillStyle = accentColor;
    ctx.font = "bold 15px Manrope, sans-serif";
    const typeLabel = isVoice ? "SES SEVİYESİ ATLADIN" : "SOHBET SEVİYESİ ATLADIN";
    ctx.fillText(typeLabel, textX + (categoryImg ? 32 : 0), 35);

    // Username
    ctx.fillStyle = "#f0f6fc";
    ctx.font = "bold 30px Manrope, sans-serif";
    const displayUsername = safeUsername.length > 18 ? safeUsername.substring(0, 16) + ".." : safeUsername;
    ctx.fillText(displayUsername, textX, 64);

    // 6. Level Up Container (Eski Lvl -> Yeni Lvl)
    const cardY = 115;
    const levelBoxX = textX;
    const levelBoxW = 340;
    const levelBoxH = 88;

    ctx.fillStyle = "#161b22";
    drawRoundRect(ctx, levelBoxX, cardY, levelBoxW, levelBoxH, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#8b949e";
    ctx.font = "12px ManropeReg, sans-serif";
    ctx.fillText("ESKİ SEVİYE", levelBoxX + 18, cardY + 16);
    ctx.fillText("YENİ SEVİYE", levelBoxX + 180, cardY + 16);

    ctx.fillStyle = "#c9d1d9";
    ctx.font = "bold 28px Manrope, sans-serif";
    ctx.fillText(`LVL ${safeOldLevel}`, levelBoxX + 18, cardY + 40);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 24px Manrope, sans-serif";
    ctx.fillText("→", levelBoxX + 138, cardY + 42);

    ctx.fillStyle = accentColor;
    ctx.font = "bold 32px Manrope, sans-serif";
    ctx.fillText(`LVL ${safeNewLevel}`, levelBoxX + 180, cardY + 38);

    // 7. Right Side Reward Badge Boxes
    const rightX = 560;
    const rightW = 300;

    // Coin Box
    const coinY = rewardRoleName ? 35 : 70;
    const coinH = rewardRoleName ? 72 : 88;

    ctx.fillStyle = "#161b22";
    drawRoundRect(ctx, rightX, coinY, rightW, coinH, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (coinImg) {
        ctx.drawImage(coinImg, rightX + 16, coinY + (coinH - 36) / 2, 36, 36);
    }

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 12px Manrope, sans-serif";
    ctx.fillText("KAZANILAN ÖDÜL", rightX + (coinImg ? 60 : 18), coinY + 14);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Manrope, sans-serif";
    ctx.fillText(`+${safeCoins.toLocaleString()} COIN`, rightX + (coinImg ? 60 : 18), coinY + 36);

    // Reward Role Box (If Role Unlocked)
    if (rewardRoleName) {
        const roleY = 122;
        const roleH = 80;

        ctx.fillStyle = "#161b22";
        drawRoundRect(ctx, rightX, roleY, rightW, roleH, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (crownImg) {
            ctx.drawImage(crownImg, rightX + 16, roleY + (roleH - 36) / 2, 36, 36);
        }

        ctx.fillStyle = "#c084fc";
        ctx.font = "bold 12px Manrope, sans-serif";
        ctx.fillText("KAZANILAN YENİ ROL", rightX + (crownImg ? 60 : 18), roleY + 16);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Manrope, sans-serif";
        const roleDisplay = rewardRoleName.length > 17 ? rewardRoleName.substring(0, 15) + ".." : rewardRoleName;
        ctx.fillText(roleDisplay, rightX + (crownImg ? 60 : 18), roleY + 40);
    }

    return canvas.toBuffer("image/png");
}

module.exports = { renderLevelUpCard };
