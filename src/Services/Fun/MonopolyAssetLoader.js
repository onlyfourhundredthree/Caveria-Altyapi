const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const ASSETS_DIR = path.join(__dirname, "../../Assets/Monopoly");

class MonopolyAssetLoader {
    static cache = new Map();

    static async init() {
        if (!fs.existsSync(ASSETS_DIR)) {
            fs.mkdirSync(ASSETS_DIR, { recursive: true });
        }

        const requiredAssets = [
            "go", "jail", "vacation", "gotojail", "chance", "airport", "tax", "house", "hotel"
        ];

        for (const key of requiredAssets) {
            const filePath = path.join(ASSETS_DIR, `${key}.png`);
            if (fs.existsSync(filePath)) {
                try {
                    const img = await loadImage(filePath);
                    this.cache.set(key, img);
                    continue;
                } catch (e) {
                    console.error(`[MonopolyAssetLoader] Failed to load local file ${key}.png:`, e.message);
                }
            }

            // Procedurally generate crisp HD vector icon for this key
            const img = await this.generateProceduralIcon(key);
            if (img) this.cache.set(key, img);
        }
    }

    static get(key) {
        return this.cache.get(key) || null;
    }

    static async generateProceduralIcon(key) {
        const canvas = createCanvas(120, 120);
        const ctx = canvas.getContext("2d");

        const cx = 60;
        const cy = 60;

        if (key === "go") {
            // GO Flag & Star Medal
            ctx.fillStyle = "#22c55e";
            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.stroke();

            // Flag pole & flag
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(cx - 15, cy - 25, 6, 50);
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(cx - 9, cy - 25);
            ctx.lineTo(cx + 25, cy - 12);
            ctx.lineTo(cx - 9, cy + 1);
            ctx.closePath();
            ctx.fill();
        } else if (key === "jail") {
            // Jail Bars
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(10, 10, 100, 100);
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 6;
            ctx.strokeRect(10, 10, 100, 100);

            // Vertical bars
            ctx.fillStyle = "#cbd5e1";
            for (let x = 25; x <= 95; x += 18) {
                ctx.fillRect(x, 10, 6, 100);
            }
            // Horizontal locks
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(cx - 12, cy - 10, 24, 20);
        } else if (key === "vacation") {
            // Sun & Palm Beach
            ctx.fillStyle = "#0284c7";
            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fill();

            // Sun
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(cx - 15, cy - 15, 18, 0, Math.PI * 2);
            ctx.fill();

            // Island sand
            ctx.fillStyle = "#fef08a";
            ctx.beginPath();
            ctx.ellipse(cx, cy + 25, 40, 15, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (key === "gotojail") {
            // Police Siren / Badge
            ctx.fillStyle = "#9a3412";
            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fill();

            // Siren Body
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(cx, cy - 5, 25, Math.PI, 0, false);
            ctx.fill();
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(cx - 30, cy - 5, 60, 12);
        } else if (key === "chance") {
            // Mystery Chest / Question Card
            ctx.fillStyle = "#8b5cf6";
            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 65px serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", cx, cy + 3);
        } else if (key === "airport") {
            // Airplane Jet
            ctx.fillStyle = "#2563eb";
            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 50px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("✈️", cx, cy);
        } else if (key === "tax") {
            // Money Bag
            ctx.fillStyle = "#dc2626";
            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 55px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("💰", cx, cy);
        } else if (key === "house") {
            // Green House
            ctx.fillStyle = "#22c55e";
            ctx.beginPath();
            ctx.moveTo(cx, cy - 25);
            ctx.lineTo(cx + 25, cy);
            ctx.lineTo(cx + 20, cy);
            ctx.lineTo(cx + 20, cy + 25);
            ctx.lineTo(cx - 20, cy + 25);
            ctx.lineTo(cx - 20, cy);
            ctx.lineTo(cx - 25, cy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#15803d";
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (key === "hotel") {
            // Red Hotel
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(cx - 25, cy - 25, 50, 50);
            ctx.strokeStyle = "#991b1b";
            ctx.lineWidth = 3;
            ctx.strokeRect(cx - 25, cy - 25, 50, 50);

            // Hotel Windows
            ctx.fillStyle = "#fef08a";
            for (let wx = cx - 18; wx <= cx + 10; wx += 14) {
                for (let wy = cy - 18; wy <= cy + 10; wy += 14) {
                    ctx.fillRect(wx, wy, 8, 8);
                }
            }
        }

        const buf = canvas.toBuffer("image/png");
        return await loadImage(buf).catch(() => null);
    }
}

module.exports = MonopolyAssetLoader;
