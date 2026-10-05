const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const ASSETS_DIR = __dirname;
const MonopolyAssetLoader = require("../../Services/Fun/MonopolyAssetLoader");

async function generateMasterBaseBoard() {
    await MonopolyAssetLoader.init();

    const width = 1200;
    const height = 1200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Helper: Round Rectangle
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

    // 1. Deep Space Navy Background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 100, width / 2, height / 2, 800);
    bgGrad.addColorStop(0, "#0f172a");
    bgGrad.addColorStop(1, "#020617");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Outer Gold Metallic Border
    const margin = 20;
    const boardW = width - margin * 2;
    const boardH = height - margin * 2;

    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 6;
    ctx.strokeRect(margin, margin, boardW, boardH);

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 3;
    ctx.strokeRect(margin + 5, margin + 5, boardW - 10, boardH - 10);

    const cornerSize = 200;
    const sideTileCount = 5; // 20 tiles total
    const edgeLength = boardW - cornerSize * 2;
    const middleTileCount = sideTileCount - 1;
    const tileWidth = edgeLength / middleTileCount;

    const innerX = margin + cornerSize;
    const innerY = margin + cornerSize;
    const innerW = boardW - cornerSize * 2;
    const innerH = boardH - cornerSize * 2;

    // Inner Glass Surface
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(innerX, innerY, innerW, innerH);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.strokeRect(innerX, innerY, innerW, innerH);

    // Mock Tiles Definition for Base Board Text & Colors
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
        { name: "KONYA", type: "PROPERTY", price: 260, colorGroup: "#22c55e" },
        { name: "GAZİANTEP", type: "PROPERTY", price: 280, colorGroup: "#22c55e" },
        { name: "VERGİ %10", type: "TAX" },
        { name: "SAMSUN", type: "PROPERTY", price: 300, colorGroup: "#22c55e" },
        { name: "HAPSE GİT", type: "GOTOJAIL" },
        { name: "TRABZON", type: "PROPERTY", price: 350, colorGroup: "#eab308" },
        { name: "KAYSERİ", type: "PROPERTY", price: 380, colorGroup: "#eab308" },
        { name: "SÜRPRİZ", type: "CHANCE" },
        { name: "ESKİŞEHİR", type: "PROPERTY", price: 400, colorGroup: "#eab308" }
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

    // Draw Tiles on Base Board
    for (let i = 0; i < defaultTiles.length; i++) {
        const tile = defaultTiles[i];
        const bounds = getTileBounds(i);

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);

        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + bounds.h / 2;

        if (tile.type === "PROPERTY" && tile.colorGroup) {
            ctx.fillStyle = tile.colorGroup;
            const headerDepth = 32;
            if (bounds.type === "bottom") ctx.fillRect(bounds.x, bounds.y, bounds.w, headerDepth);
            else if (bounds.type === "top") ctx.fillRect(bounds.x, bounds.y + bounds.h - headerDepth, bounds.w, headerDepth);
            else if (bounds.type === "left") ctx.fillRect(bounds.x + bounds.w - headerDepth, bounds.y, headerDepth, bounds.h);
            else if (bounds.type === "right") ctx.fillRect(bounds.x, bounds.y, headerDepth, bounds.h);
        }

        // Draw Logos
        if (bounds.type === "corner_go") {
            ctx.fillStyle = "#166534";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 4;
            ctx.strokeRect(bounds.x + 5, bounds.y + 5, bounds.w - 10, bounds.h - 10);

            const img = MonopolyAssetLoader.get("go");
            if (img) ctx.drawImage(img, centerX - 40, centerY - 55, 80, 80);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("BAŞLANGIÇ", centerX, centerY + 35);
            ctx.font = "bold 18px sans-serif";
            ctx.fillStyle = "#fef08a";
            ctx.fillText("+$200 MAAŞ", centerX, centerY + 65);
        } else if (bounds.type === "corner_jail") {
            ctx.fillStyle = "#7f1d1d";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 4;
            ctx.strokeRect(bounds.x + 5, bounds.y + 5, bounds.w - 10, bounds.h - 10);

            const img = MonopolyAssetLoader.get("jail");
            if (img) ctx.drawImage(img, centerX - 40, centerY - 55, 80, 80);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("KARANTİNA", centerX, centerY + 35);
        } else if (bounds.type === "corner_vacation") {
            ctx.fillStyle = "#0e7490";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#06b6d4";
            ctx.lineWidth = 4;
            ctx.strokeRect(bounds.x + 5, bounds.y + 5, bounds.w - 10, bounds.h - 10);

            const img = MonopolyAssetLoader.get("vacation");
            if (img) ctx.drawImage(img, centerX - 40, centerY - 55, 80, 80);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("TATİL YERİ", centerX, centerY + 35);
        } else if (bounds.type === "corner_gotojail") {
            ctx.fillStyle = "#9a3412";
            ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
            ctx.strokeStyle = "#f97316";
            ctx.lineWidth = 4;
            ctx.strokeRect(bounds.x + 5, bounds.y + 5, bounds.w - 10, bounds.h - 10);

            const img = MonopolyAssetLoader.get("gotojail");
            if (img) ctx.drawImage(img, centerX - 40, centerY - 55, 80, 80);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.font = "bold 24px sans-serif";
            ctx.fillText("HAPSE GİT", centerX, centerY + 35);
        } else if (tile.type === "CHANCE") {
            const img = MonopolyAssetLoader.get("chance");
            if (img) ctx.drawImage(img, centerX - 26, centerY - 32, 52, 52);
            ctx.fillStyle = "#a855f7";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("SÜRPRİZ", centerX, centerY + 30);
        } else if (tile.type === "AIRPORT") {
            const img = MonopolyAssetLoader.get("airport");
            if (img) ctx.drawImage(img, centerX - 26, centerY - 32, 52, 52);
            ctx.fillStyle = "#3b82f6";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("HAVAALANI", centerX, centerY + 30);
        } else if (tile.type === "TAX") {
            const img = MonopolyAssetLoader.get("tax");
            if (img) ctx.drawImage(img, centerX - 26, centerY - 32, 52, 52);
            ctx.fillStyle = "#ef4444";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("VERGİ %10", centerX, centerY + 30);
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
    ctx.fillStyle = "#dc2626";
    roundRect(innerX + innerW / 2 - 250, innerY + 35, 500, 80, 16);
    ctx.fill();
    ctx.strokeStyle = "#fef08a";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 46px serif";
    ctx.fillText("CAVERIAPOLY", innerX + innerW / 2, innerY + 90);

    const buf = canvas.toBuffer("image/png");
    fs.writeFileSync(path.join(ASSETS_DIR, "board_base.png"), buf);
    console.log("[MasterBoardGen] Generated board_base.png successfully!");
}

module.exports = { generateMasterBaseBoard };

if (require.main === module) {
    generateMasterBaseBoard();
}
