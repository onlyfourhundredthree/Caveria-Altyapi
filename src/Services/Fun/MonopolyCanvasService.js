const path = require("path");
const fs = require("fs");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const MonopolyAssetLoader = require("./MonopolyAssetLoader");

class MonopolyCanvasService {
    static async renderBoard(game, client) {
        try {
            await MonopolyAssetLoader.init().catch(() => {});

            const width = 1200;
            const height = 1200;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            // 0. Draw Pre-Rendered High-Definition Base Board
            const boardBase = MonopolyAssetLoader.get("board_base");
            if (boardBase) {
                ctx.drawImage(boardBase, 0, 0, width, height);
            } else {
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(0, 0, width, height);
            }

            // Pre-fetch Users & Pre-load Avatars Concurrently
            const avatarImageMap = new Map();
            const userCacheMap = new Map();

            await Promise.all(
                game.players.map(async (p) => {
                    let u = client.users.cache.get(p.userID);
                    if (!u) {
                        u = await client.users.fetch(p.userID).catch(() => null);
                    }
                    if (u) userCacheMap.set(p.userID, u);

                    const avatarUrl = (u && typeof u.displayAvatarURL === "function") ? u.displayAvatarURL({ extension: "png", size: 128 }) : null;
                    if (avatarUrl) {
                        try {
                            const imgPromise = loadImage(avatarUrl);
                            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000));
                            const img = await Promise.race([imgPromise, timeoutPromise]);
                            avatarImageMap.set(p.userID, img);
                        } catch (err) {
                            avatarImageMap.set(p.userID, null);
                        }
                    }
                })
            );

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

            const margin = 20;
            const boardW = width - margin * 2;
            const boardH = height - margin * 2;
            const cornerSize = 200;
            const edgeLength = boardW - cornerSize * 2;
            const tileWidth = edgeLength / 4;

            const innerX = margin + cornerSize;
            const innerY = margin + cornerSize;
            const innerW = boardW - cornerSize * 2;
            const innerH = boardH - cornerSize * 2;

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

            // 1. DYNAMIC PROPERTY OVERLAYS (Owners & Buildings)
            game.tiles.forEach((tile, i) => {
                const bounds = getTileBounds(i);

                // Owner Highlight Ribbon
                if (tile.ownerID) {
                    const owner = game.players.find(p => p.userID === tile.ownerID);
                    if (owner) {
                        ctx.strokeStyle = owner.color || "#38bdf8";
                        ctx.lineWidth = 4;
                        ctx.shadowColor = owner.color || "#38bdf8";
                        ctx.shadowBlur = 10;
                        ctx.strokeRect(bounds.x + 3, bounds.y + 3, bounds.w - 6, bounds.h - 6);
                        ctx.shadowBlur = 0;
                    }
                }

                // Buildings (Houses / Hotels)
                if (tile.type === "PROPERTY" && tile.level > 0) {
                    const centerX = bounds.x + bounds.w / 2;
                    const renderBuildings = (bx, by) => {
                        if (tile.level === 5) {
                            const hotelImg = MonopolyAssetLoader.get("hotel");
                            if (hotelImg) ctx.drawImage(hotelImg, bx - 16, by - 16, 32, 32);
                        } else {
                            const houseImg = MonopolyAssetLoader.get("house");
                            if (houseImg) {
                                const count = tile.level;
                                const startX = bx - ((count - 1) * 18) / 2;
                                for (let hIdx = 0; hIdx < count; hIdx++) {
                                    ctx.drawImage(houseImg, startX + hIdx * 18 - 10, by - 10, 20, 20);
                                }
                            }
                        }
                    };

                    if (bounds.type === "bottom") renderBuildings(centerX, bounds.y + 115);
                    else if (bounds.type === "top") renderBuildings(centerX, bounds.y + bounds.h - 115);
                    else if (bounds.type === "left") renderBuildings(bounds.x + 40, bounds.y + bounds.h / 2);
                    else if (bounds.type === "right") renderBuildings(bounds.x + bounds.w - 40, bounds.y + bounds.h / 2);
                }
            });

            // 2. DYNAMIC CENTER BOARD OVERLAYS
            // Last Action Log Card
            ctx.fillStyle = "#1e293b";
            roundRect(innerX + 40, innerY + 135, innerW - 80, 75, 10);
            ctx.fill();
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = "#f8fafc";
            ctx.textAlign = "center";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText(game.lastActionLog || "Zar atılması bekleniyor...", innerX + innerW / 2, innerY + 178);

            // 3D Real Dice Visual
            if (game.lastDice && game.lastDice[0] > 0) {
                const drawDice = (cx, cy, val) => {
                    const size = 70;
                    ctx.fillStyle = "#ffffff";
                    roundRect(cx - size / 2, cy - size / 2, size, size, 10);
                    ctx.fill();
                    ctx.strokeStyle = "#cbd5e1";
                    ctx.lineWidth = 4;
                    ctx.stroke();

                    ctx.fillStyle = "#0f172a";
                    const dot = (dx, dy) => {
                        ctx.beginPath();
                        ctx.arc(cx + dx, cy + dy, 6, 0, Math.PI * 2);
                        ctx.fill();
                    };

                    const off = 18;
                    if (val % 2 === 1) dot(0, 0);
                    if (val > 1) { dot(-off, -off); dot(off, off); }
                    if (val > 3) { dot(off, -off); dot(-off, off); }
                    if (val === 6) { dot(-off, 0); dot(off, 0); }
                };

                drawDice(innerX + innerW / 2 - 55, innerY + 265, game.lastDice[0]);
                drawDice(innerX + innerW / 2 + 55, innerY + 265, game.lastDice[1]);
            }

            // Active Player Turn Box
            const activePlayer = game.players[game.turnIndex];
            const activeUser = activePlayer ? (userCacheMap.get(activePlayer.userID) || client.users.cache.get(activePlayer.userID)) : null;

            if (activePlayer && activeUser) {
                ctx.fillStyle = "#0284c7";
                roundRect(innerX + 50, innerY + 325, innerW - 100, 60, 10);
                ctx.fill();
                ctx.strokeStyle = activePlayer.color || "#38bdf8";
                ctx.lineWidth = 4;
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 22px sans-serif";
                ctx.fillText(`🎮 Sıradaki Oyuncu: ${activeUser.username}  |  Bakiye: $${activePlayer.balance}`, innerX + innerW / 2, innerY + 363);
            }

            // Leaderboard / Players Grid
            ctx.fillStyle = "#1e293b";
            roundRect(innerX + 30, innerY + 405, innerW - 60, innerH - 435, 12);
            ctx.fill();
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 20px sans-serif";
            ctx.fillText("🏆 OYUNCU DURUMLARI VE BAKİYELERİ", innerX + innerW / 2, innerY + 438);

            const activePlayersList = game.players;
            const colCount = activePlayersList.length > 9 ? 3 : 2;
            const cellW = (innerW - 80) / colCount;
            const startY = innerY + 470;

            activePlayersList.forEach((p, idx) => {
                const row = Math.floor(idx / colCount);
                const col = idx % colCount;
                const px = innerX + 45 + col * cellW;
                const py = startY + row * 40;

                const u = userCacheMap.get(p.userID) || client.users.cache.get(p.userID);
                const isTurn = idx === game.turnIndex;

                ctx.fillStyle = isTurn ? (p.color || "#38bdf8") : "#cbd5e1";
                ctx.font = isTurn ? "bold 18px sans-serif" : "17px sans-serif";
                ctx.textAlign = "left";

                const pName = u ? u.username : `ID: ${p.userID}`;
                const truncatePName = pName.length > 12 ? pName.substring(0, 10) + ".." : pName;
                const statusTag = p.isBankrupt ? "🔴 İFLAS" : (p.inJail ? "⛓️ HAPİS" : `$${p.balance}`);

                ctx.fillText(`${isTurn ? "👉 " : ""}${idx + 1}. ${truncatePName}: ${statusTag}`, px, py);
            });

            // 3. DYNAMIC PLAYER PAWNS OVERLAY ON TILES
            const tilePlayersMap = {};
            game.players.forEach((p, pIndex) => {
                if (!p.isBankrupt) {
                    if (!tilePlayersMap[p.position]) tilePlayersMap[p.position] = [];
                    tilePlayersMap[p.position].push({ ...p, playerIndex: pIndex });
                }
            });

            for (const [posStr, playerList] of Object.entries(tilePlayersMap)) {
                const pos = parseInt(posStr);
                const bounds = getTileBounds(pos);
                const avatarRadius = 22;

                for (let pIdx = 0; pIdx < playerList.length; pIdx++) {
                    const player = playerList[pIdx];
                    const totalInTile = playerList.length;
                    let offsetX = 0;
                    let offsetY = 0;

                    if (totalInTile > 1) {
                        const cols = totalInTile > 6 ? 4 : 3;
                        const row = Math.floor(pIdx / cols);
                        const col = pIdx % cols;
                        offsetX = (col - (cols - 1) / 2) * 24;
                        offsetY = (row - 0.5) * 24;
                    }

                    const px = bounds.x + bounds.w / 2 + offsetX;
                    const py = bounds.y + bounds.h / 2 + offsetY;

                    ctx.save();

                    // Glowing Ring
                    ctx.beginPath();
                    ctx.arc(px, py, avatarRadius + 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = player.color || "#38bdf8";
                    ctx.shadowColor = player.color || "#38bdf8";
                    ctx.shadowBlur = 12;
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Avatar Image or Fallback Circle
                    const loadedImg = avatarImageMap.get(player.userID);
                    if (loadedImg) {
                        try {
                            ctx.beginPath();
                            ctx.arc(px, py, avatarRadius, 0, Math.PI * 2);
                            ctx.clip();
                            ctx.drawImage(loadedImg, px - avatarRadius, py - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                        } catch (err) {
                            ctx.beginPath();
                            ctx.arc(px, py, avatarRadius, 0, Math.PI * 2);
                            ctx.fillStyle = player.color || "#38bdf8";
                            ctx.fill();
                        }
                    } else {
                        ctx.beginPath();
                        ctx.arc(px, py, avatarRadius, 0, Math.PI * 2);
                        ctx.fillStyle = player.color || "#38bdf8";
                        ctx.fill();

                        ctx.fillStyle = "#ffffff";
                        ctx.font = "bold 15px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(`P${player.playerIndex + 1}`, px, py);
                    }

                    // Jail Lock Overlay
                    if (player.inJail) {
                        const jailIcon = MonopolyAssetLoader.get("jail");
                        if (jailIcon) {
                            ctx.drawImage(jailIcon, px - avatarRadius, py - avatarRadius, avatarRadius * 2, avatarRadius * 2);
                        }
                    }

                    ctx.restore();
                }
            }

            return canvas.toBuffer("image/png");
        } catch (globalErr) {
            console.error("[MonopolyCanvasService] Global Canvas Render Error:", globalErr);

            const fallbackCanvas = createCanvas(800, 800);
            const fCtx = fallbackCanvas.getContext("2d");
            fCtx.fillStyle = "#0f172a";
            fCtx.fillRect(0, 0, 800, 800);
            fCtx.fillStyle = "#ef4444";
            fCtx.font = "bold 24px sans-serif";
            fCtx.textAlign = "center";
            fCtx.fillText("CAVERIAPOLY BOARD", 400, 400);
            return fallbackCanvas.toBuffer("image/png");
        }
    }
}

module.exports = MonopolyCanvasService;
