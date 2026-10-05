const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const ASSETS_DIR = __dirname;
const MonopolyAssetLoader = require("../../Services/Fun/MonopolyAssetLoader");

async function generate3DAIBoard() {
    await MonopolyAssetLoader.init().catch(() => {});

    const width = 1200;
    const height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    // 1. Carbon Fiber Deep Dark Gradient Background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 850);
    bgGrad.addColorStop(0, "#0b0f19");
    bgGrad.addColorStop(0.6, "#05070e");
    bgGrad.addColorStop(1, "#020306");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Carbon Mesh Overlay Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
    }

    // Outer 3D Gold & Chrome Border
    const margin = 25;
    const boardW = width - margin * 2;
    const boardH = height - margin * 2;

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 8;
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 15;
    ctx.strokeRect(margin, margin, boardW, boardH);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.strokeRect(margin + 6, margin + 6, boardW - 12, boardH - 12);

    const cornerSize = 200;
    const sideTileCount = 5;
    const edgeLength = boardW - cornerSize * 2;
    const middleTileCount = sideTileCount - 1;
    const tileWidth = edgeLength / middleTileCount;

    const innerX = margin + cornerSize;
    const innerY = margin + cornerSize;
    const innerW = boardW - cornerSize * 2;
    const innerH = boardH - cornerSize * 2;

    // Inner Glass Board Surface with 3D Bevel
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(innerX, innerY, innerW, innerH);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 6;
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    // Default Tiles Definition
    const defaultTiles = [
        { name: "BAŞLANGIÇ", type: "START" },
        { name: "İSTANBUL", type: "PROPERTY", price: 100, colorGroup: "#ef4444" },
        { name: "ANKARA", type: "PROPERTY", price: 120, colorGroup: "#ef4444" },
        { name: "SÜRPRİZ", type: "CHANCE" },
        { name: "İZMİR", type: "PROPERTY", price: 140, colorGroup: "#ef4444" },
        { name: "HAPİS", type: "JAIL" },
        { name: "BURSA", type: "PROPERTY", price: 180, colorGroup: "#3b82f6" },
        { name: "ANTALYA", type: "PROPERTY", price: 200, colorGroup: "#3b82f6" },
        { name: "HAVAALANI", type: "AIRPORT" },
        { name: "ADANA", type: "PROPERTY", price: 220, colorGroup: "#3b82f6" },
        { name: "TATİL YERİ", type: "VACATION" },
        { name: "KONYA", type: "PROPERTY", price: 260, colorGroup: "#10b981" },
        { name: "GAZİANTEP", type: "PROPERTY", price: 280, colorGroup: "#10b981" },
        { name: "VERGİ %10", type: "TAX" },
        { name: "SAMSUN", type: "PROPERTY", price: 300, colorGroup: "#10b981" },
        { name: "HAPSE GİT", type: "GOTOJAIL" },
        { name: "TRABZON", type: "PROPERTY", price: 350, colorGroup: "#f59e0b" },
        { name: "KAYSERİ", type: "PROPERTY", price: 380, colorGroup: "#f59e0b" },
        { name: "SÜRPRİZ", type: "CHANCE" },
        { name: "ESKİŞEHİR", type: "PROPERTY", price: 400, colorGroup: "#f59e0b" }
    ];

    const getTileBounds = (index) => {
        if (index === 0) return { x: margin + boardW - cornerSize, y: margin + boardH - cornerSize, w: cornerSize, h: cornerSize, type: "corner_go" };
        if (index < 5) return { x: margin + boardW - cornerSize - (index) * tileWidth, y: margin + boardH - cornerSize, w: tileWidth, h: cornerSize, type: "bottom" };
        if (index === 5) return { x: margin, y: margin + boardH - cornerSize, w: cornerSize, h: cornerSize, type: "corner_jail" };
        if (index < 10) return { x: margin, y: margin + boardH - cornerSize - (index - 5) * tileWidth, w: cornerSize, h: tileWidth, type: "left" };
        if (index === 10) return { x: margin, y: margin, w: cornerSize, h: cornerSize, type: "corner_vacation" };
        if (index < 15) return { x: margin + cornerSize + (index - 11) * tileWidth, y: margin, w: tileWidth, h: cornerSize, type: "top" };
        if (index === 15) return { x: margin + boardW - cornerSize, y: margin, w: cornerSize, h: cornerSize, type: "corner_gotojail" };
        return { x: margin + boardW - cornerSize, y: margin + cornerSize + (index - 16) * tileWidth, w: cornerSize, h: tileWidth, type: "right" };
    };

    // Draw Shaded 3D Tiles
    for (let i = 0; i < defaultTiles.length; i++) {
        const tile = defaultTiles[i];
        const bounds = getTileBounds(i);

        // Tile Fill
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

        // Inner Tile Bevel Border
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.x + 1, bounds.y + 1, bounds.w - 2, bounds.h - 2);

        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + bounds.h / 2;

        // Color Header
        if (tile.type === "PROPERTY" && tile.colorGroup) {
            ctx.fillStyle = tile.colorGroup;
            const headerDepth = 34;
            if (bounds.type === "bottom") ctx.fillRect(bounds.x, bounds.y, bounds.w, headerDepth);
            else if (bounds.type === "top") ctx.fillRect(bounds.x, bounds.y + bounds.h - headerDepth, bounds.w, headerDepth);
            else if (bounds.type === "left") ctx.fillRect(bounds.x + bounds.w - headerDepth, bounds.y, headerDepth, bounds.h);
            else if (bounds.type === "right") ctx.fillRect(bounds.x, bounds.y, headerDepth, bounds.h);
        }

        // Draw Logos
        if (bounds.type === "corner_go") {
            ctx.fillStyle = "#14532d";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 5;
            ctx.strokeRect(bounds.x + 6, bounds.y + 6, bounds.w - 12, bounds.h - 12);

            const img = MonopolyAssetLoader.get("go");
            if (img) ctx.drawImage(img, centerX - 45, centerY - 60, 90, 90);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("BAŞLANGIÇ", centerX, centerY + 40);
        } else if (bounds.type === "corner_jail") {
            ctx.fillStyle = "#7f1d1d";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 5;
            ctx.strokeRect(bounds.x + 6, bounds.y + 6, bounds.w - 12, bounds.h - 12);

            const img = MonopolyAssetLoader.get("jail");
            if (img) ctx.drawImage(img, centerX - 45, centerY - 60, 90, 90);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("KARANTİNA", centerX, centerY + 40);
        } else if (bounds.type === "corner_vacation") {
            ctx.fillStyle = "#155e75";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 5;
            ctx.strokeRect(bounds.x + 6, bounds.y + 6, bounds.w - 12, bounds.h - 12);

            const img = MonopolyAssetLoader.get("vacation");
            if (img) ctx.drawImage(img, centerX - 45, centerY - 60, 90, 90);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("TATİL YERİ", centerX, centerY + 40);
        } else if (bounds.type === "corner_gotojail") {
            ctx.fillStyle = "#7c2d12";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#f97316";
            ctx.lineWidth = 5;
            ctx.strokeRect(bounds.x + 6, bounds.y + 6, bounds.w - 12, bounds.h - 12);

            const img = MonopolyAssetLoader.get("gotojail");
            if (img) ctx.drawImage(img, centerX - 45, centerY - 60, 90, 90);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("HAPSE GİT", centerX, centerY + 40);
        } else if (tile.type === "CHANCE") {
            const img = MonopolyAssetLoader.get("chance");
            if (img) ctx.drawImage(img, centerX - 30, centerY - 35, 60, 60);
            ctx.fillStyle = "#c084fc";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("SÜRPRİZ", centerX, centerY + 35);
        } else if (tile.type === "AIRPORT") {
            const img = MonopolyAssetLoader.get("airport");
            if (img) ctx.drawImage(img, centerX - 30, centerY - 35, 60, 60);
            ctx.fillStyle = "#60a5fa";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("HAVAALANI", centerX, centerY + 35);
        } else if (tile.type === "TAX") {
            const img = MonopolyAssetLoader.get("tax");
            if (img) ctx.drawImage(img, centerX - 30, centerY - 35, 60, 60);
            ctx.fillStyle = "#f87171";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("VERGİ %10", centerX, centerY + 35);
        } else if (tile.type === "PROPERTY") {
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (bounds.type === "bottom") {
                ctx.font = "bold 18px sans-serif";
                ctx.fillText(tile.name, centerX, bounds.y + 55);
                ctx.font = "bold 16px sans-serif";
                ctx.fillStyle = "#fbbf24";
                ctx.fillText(`$${tile.price}`, centerX, bounds.y + 85);
            } else if (bounds.type === "top") {
                ctx.font = "bold 18px sans-serif";
                ctx.fillText(tile.name, centerX, bounds.y + bounds.h - 55);
                ctx.font = "bold 16px sans-serif";
                ctx.fillStyle = "#fbbf24";
                ctx.fillText(`$${tile.price}`, centerX, bounds.y + bounds.h - 85);
            } else if (bounds.type === "left") {
                ctx.font = "bold 18px sans-serif";
                ctx.fillText(tile.name, bounds.x + bounds.w - 65, centerY - 15);
                ctx.font = "bold 16px sans-serif";
                ctx.fillStyle = "#fbbf24";
                ctx.fillText(`$${tile.price}`, bounds.x + bounds.w - 65, centerY + 15);
            } else if (bounds.type === "right") {
                ctx.font = "bold 18px sans-serif";
                ctx.fillText(tile.name, bounds.x + 65, centerY - 15);
                ctx.font = "bold 16px sans-serif";
                ctx.fillStyle = "#fbbf24";
                ctx.fillText(`$${tile.price}`, bounds.x + 65, centerY + 15);
            }
        }
    }

    // Header Logo (CAVERIAPOLY)
    ctx.fillStyle = "#b91c1c";
    roundRect(innerX + innerW / 2 - 250, innerY + 35, 500, 80, 16);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 48px serif";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 10;
    ctx.fillText("CAVERIAPOLY", innerX + innerW / 2, innerY + 92);
    ctx.shadowBlur = 0;

    const buf = canvas.toBuffer("image/png");
    fs.writeFileSync(path.join(ASSETS_DIR, "board_base.png"), buf);
    console.log("[MasterBoardGen] Generated 3D AI style board_base.png!");
}

generate3DAIBoard();
