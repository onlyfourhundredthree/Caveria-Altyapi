const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const OUTPUT_DIR = __dirname;
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function saveCanvas(canvas, filename) {
    const buf = canvas.toBuffer("image/png");
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), buf);
    console.log(`[LevelAssetGen] Saved ${filename}`);
}

const size = 256;
const cx = size / 2;
const cy = size / 2;

// 1. COIN PNG
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#78350f";
    ctx.font = "bold 130px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₯", cx, cy);

    saveCanvas(canvas, "coin.png");
})();

// 2. CROWN PNG
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#a855f7";
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Crown Path
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy + 40);
    ctx.lineTo(cx - 85, cy - 35);
    ctx.lineTo(cx - 40, cy + 5);
    ctx.lineTo(cx, cy - 50);
    ctx.lineTo(cx + 40, cy + 5);
    ctx.lineTo(cx + 85, cy - 35);
    ctx.lineTo(cx + 70, cy + 40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#eab308";
    ctx.fillRect(cx - 65, cy + 45, 130, 16);

    saveCanvas(canvas, "crown.png");
})();

// 3. CHAT PNG
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Chat Bubble
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 30, cy + 20);
    ctx.lineTo(cx - 55, cy + 60);
    ctx.lineTo(cx, cy + 40);
    ctx.closePath();
    ctx.fill();

    saveCanvas(canvas, "chat.png");
})();

// 4. VOICE PNG
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Mic
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy - 55, 48, 70, 24);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy - 15, 42, 0, Math.PI, false);
    ctx.stroke();

    ctx.fillRect(cx - 6, cy + 27, 12, 35);
    ctx.fillRect(cx - 30, cy + 57, 60, 12);

    saveCanvas(canvas, "voice.png");
})();

console.log("[LevelAssetGen] Completed!");
