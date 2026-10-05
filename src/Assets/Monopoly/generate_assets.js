const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const OUTPUT_DIR = __dirname;

function saveCanvas(canvas, filename) {
    const buf = canvas.toBuffer("image/png");
    const filePath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filePath, buf);
    console.log(`[AssetGen] Generated ${filename}`);
}

const size = 256;
const cx = size / 2;
const cy = size / 2;

// 1. GO (Başlangıç)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Glow Outer Ring
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#22c55e");
    grad.addColorStop(1, "#166534");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Flag pole
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 30, cy - 60, 12, 120);

    // Flag
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy - 60);
    ctx.lineTo(cx + 60, cy - 30);
    ctx.lineTo(cx - 18, cy);
    ctx.closePath();
    ctx.fill();

    // Text GO
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GO!", cx + 10, cy + 50);

    saveCanvas(canvas, "go.png");
})();

// 2. JAIL (Karantina)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Metallic Cage
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(40, 40, 176, 176);

    ctx.fillStyle = "#94a3b8";
    for (let x = 60; x <= 196; x += 32) {
        ctx.fillRect(x, 40, 12, 176);
    }

    // Heavy Gold Lock
    ctx.fillStyle = "#eab308";
    ctx.fillRect(cx - 24, cy - 10, 48, 44);
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 18, Math.PI, 0, false);
    ctx.stroke();

    saveCanvas(canvas, "jail.png");
})();

// 3. VACATION (Tatil)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "#0284c7");
    grad.addColorStop(1, "#0e7490");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Sun
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(cx - 40, cy - 40, 32, 0, Math.PI * 2);
    ctx.fill();

    // Island Sand
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 50, 90, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Palm Tree Trunk
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy + 50);
    ctx.quadraticCurveTo(cx - 10, cy, cx - 20, cy - 40);
    ctx.stroke();

    // Palm Leaves
    ctx.fillStyle = "#22c55e";
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
        ctx.beginPath();
        ctx.ellipse(cx - 20 + Math.cos(angle) * 30, cy - 40 + Math.sin(angle) * 20, 30, 12, angle, 0, Math.PI * 2);
        ctx.fill();
    }

    saveCanvas(canvas, "vacation.png");
})();

// 4. GOTOJAIL (Polis / Hapse Git)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Police Siren
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 50, Math.PI, 0, false);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(cx - 60, cy - 10, 120, 24);

    // Star Emblem
    ctx.fillStyle = "#eab308";
    ctx.font = "bold 50px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚨", cx, cy + 55);

    saveCanvas(canvas, "gotojail.png");
})();

// 5. CHANCE (Sürpriz)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
    grad.addColorStop(0, "#c084fc");
    grad.addColorStop(1, "#6b21a8");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e9d5ff";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 130px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cx, cy + 5);

    saveCanvas(canvas, "chance.png");
})();

// 6. AIRPORT (Havaalanı)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#3b82f6");
    grad.addColorStop(1, "#1d4ed8");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "110px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✈️", cx, cy);

    saveCanvas(canvas, "airport.png");
})();

// 7. TAX (Vergi)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#dc2626");
    grad.addColorStop(1, "#991b1b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fca5a5";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "110px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💰", cx, cy);

    saveCanvas(canvas, "tax.png");
})();

// 8. HOUSE (Ev)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Roof
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.moveTo(cx, 20);
    ctx.lineTo(cx + 95, 95);
    ctx.lineTo(cx - 95, 95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#166534";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Body
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(cx - 75, 95, 150, 130);
    ctx.strokeRect(cx - 75, 95, 150, 130);

    // Door
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 25, 155, 50, 70);

    // Windows
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(cx - 60, 115, 28, 28);
    ctx.fillRect(cx + 32, 115, 28, 28);

    saveCanvas(canvas, "house.png");
})();

// 9. HOTEL (Otel)
(() => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Tower Body
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(cx - 80, 30, 160, 196);
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 8;
    ctx.strokeRect(cx - 80, 30, 160, 196);

    // Hotel Windows
    ctx.fillStyle = "#fef08a";
    for (let wx = cx - 60; wx <= cx + 40; wx += 45) {
        for (let wy = 50; wy <= 170; wy += 35) {
            ctx.fillRect(wx, wy, 24, 24);
        }
    }

    // Door
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - 30, 176, 60, 50);

    saveCanvas(canvas, "hotel.png");
})();

console.log("[AssetGen] All 9 Monopoly PNG assets successfully created!");
