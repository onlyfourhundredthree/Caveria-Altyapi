const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');

// Font registration
const FONT_CANDIDATES = [
    { path: path.join(__dirname, '..', 'Assets', 'Fonts', 'Manrope-Bold.ttf'), family: 'Manrope' },
    { path: path.join(__dirname, '..', 'Assets', 'Fonts', 'KeepCalm-Medium.ttf'), family: 'KeepCalm' },
    { path: path.join(__dirname, '..', 'Assets', 'Fonts', 'Roboto.ttf'), family: 'Roboto' },
    { path: path.join(__dirname, '..', 'Fonts', 'Inter-Bold.ttf'), family: 'Inter' },
];
let FONT = 'Arial, sans-serif';
for (const c of FONT_CANDIDATES) {
    try {
        GlobalFonts.registerFromPath(c.path, 'GameFont');
        FONT = 'GameFont, Arial, sans-serif';
        break;
    } catch (e) { /* next */ }
}

// ─── DRAWING HELPERS ─────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
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
}

function drawCircleImage(ctx, image, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
}

/** Truncate text to fit within maxWidth */
function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '..').width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + '..';
}

/** Draw text with an outline for readability */
function drawOutlinedText(ctx, text, x, y, fillColor, outlineColor = '#000000', lineWidth = 3) {
    ctx.save();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
    ctx.restore();
}

// ─── BACKGROUND DRAWING ─────────────────────────────────────

let cachedDayBg = null;
let cachedNightBg = null;

async function drawBackground(ctx, W, H, isNight) {
    try {
        if (isNight && !cachedNightBg) cachedNightBg = await loadImage(path.join(__dirname, '..', 'Assets', 'Images', 'VampireNight.jpg'));
        if (!isNight && !cachedDayBg) cachedDayBg = await loadImage(path.join(__dirname, '..', 'Assets', 'Images', 'VampireDay.jpg'));

        const bg = isNight ? cachedNightBg : cachedDayBg;
        if (bg) {
            // Draw background covering the canvas (cover mode)
            const scale = Math.max(W / bg.width, H / bg.height);
            const w = bg.width * scale;
            const h = bg.height * scale;
            const x = (W - w) / 2;
            const y = (H - h) / 2;
            ctx.drawImage(bg, x, y, w, h);

            // Add a dark overlay so text is readable
            ctx.fillStyle = isNight ? 'rgba(10, 5, 20, 0.7)' : 'rgba(20, 10, 10, 0.6)';
            ctx.fillRect(0, 0, W, H);
        } else {
            ctx.fillStyle = isNight ? '#0c0a1a' : '#120a0a';
            ctx.fillRect(0, 0, W, H);
        }
    } catch (e) {
        ctx.fillStyle = isNight ? '#0c0a1a' : '#120a0a';
        ctx.fillRect(0, 0, W, H);
    }
}

// ─── HEADER ──────────────────────────────────────────────────

function drawHeader(ctx, W, game, paddingY) {
    const aliveCount = game.players.filter(p => p.isAlive).length;
    const deadCount = game.players.filter(p => !p.isAlive).length;
    const isNight = game.phase === "NIGHT";

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 52px ${FONT}`;
    ctx.shadowColor = isNight ? '#6644cc' : '#cc2222';
    ctx.shadowBlur = 30;
    drawOutlinedText(ctx, 'VAMPIR KOYLU', W / 2, paddingY + 40, '#ffffff', '#000000', 4);
    ctx.restore();

    // Phase badge
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const phaseText = isNight ? `GECE ${game.dayCount}` : `GUN ${game.dayCount}`;
    ctx.font = `bold 30px ${FONT}`;
    const badgeW = ctx.measureText(phaseText).width + 50;
    const badgeH = 44;
    const badgeX = W / 2 - badgeW / 2;
    const badgeY = paddingY + 72;
    
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 22);
    ctx.fillStyle = isNight ? 'rgba(50, 30, 120, 0.6)' : 'rgba(120, 30, 30, 0.6)';
    ctx.fill();
    ctx.strokeStyle = isNight ? '#6644cc' : '#cc3333';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = isNight ? '#bbaaff' : '#ffaaaa';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(phaseText, W / 2, badgeY + badgeH / 2);
    ctx.restore();

    // Stats
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 22px ${FONT}`;
    
    const statsY = paddingY + 140;
    
    // Alive
    ctx.fillStyle = '#55cc55';
    ctx.fillText(`Hayatta: ${aliveCount}`, W / 2 - 160, statsY);
    
    // Dead
    ctx.fillStyle = '#cc4444';
    ctx.fillText(`Ölü: ${deadCount}`, W / 2, statsY);
    
    // Total
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`Toplam: ${game.players.length}`, W / 2 + 160, statsY);
    ctx.restore();

    // Divider line
    const divGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.3, isNight ? '#4433aa55' : '#aa333355');
    divGrad.addColorStop(0.5, isNight ? '#6644cc88' : '#cc444488');
    divGrad.addColorStop(0.7, isNight ? '#4433aa55' : '#aa333355');
    divGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = divGrad;
    ctx.fillRect(60, statsY + 25, W - 120, 2);
    
    return statsY + 40; // Return Y position after header
}

// ─── EVENT BOX ───────────────────────────────────────────────

function drawEventBox(ctx, W, startY, eventTexts, isNight) {
    if (eventTexts.length === 0) return startY;
    
    const lineH = 38;
    const boxPadding = 25;
    const boxH = eventTexts.length * lineH + boxPadding * 2;
    const boxX = 60;
    const boxW = W - 120;
    const boxY = startY + 10;

    // Box background
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH, 16);
    ctx.fillStyle = isNight ? 'rgba(30, 20, 60, 0.5)' : 'rgba(60, 10, 10, 0.4)';
    ctx.fill();
    ctx.strokeStyle = isNight ? '#4433aa44' : '#88222244';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let currentY = boxY + boxPadding + lineH / 2;
    for (const txt of eventTexts) {
        if (txt.startsWith('##')) {
            // Title line
            ctx.font = `bold 24px ${FONT}`;
            ctx.fillStyle = '#ff6666';
            ctx.fillText(txt.replace('## ', ''), W / 2, currentY);
        } else if (txt.startsWith('> ')) {
            // Quote/note
            ctx.font = `italic 20px ${FONT}`;
            ctx.fillStyle = '#ffcccc';
            ctx.fillText(txt.replace('> ', ''), W / 2, currentY);
        } else if (txt === '') {
            // spacer
        } else {
            ctx.font = `22px ${FONT}`;
            ctx.fillStyle = '#dddddd';
            ctx.fillText(truncateText(ctx, txt, boxW - 40), W / 2, currentY);
        }
        currentY += lineH;
    }
    ctx.restore();

    return boxY + boxH + 15;
}

// ─── PLAYER CARD ─────────────────────────────────────────────

async function drawPlayerCard(ctx, client, guild, p, idx, cardX, cardY, cardW, cardH, options) {
    const cx = cardX + cardW / 2;
    const avatarSize = Math.min(110, cardW - 40);
    const avatarX = cx - avatarSize / 2;
    const avatarY = cardY + 20;
    const isNight = options.isNight;

    // Card background
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    if (p.isAlive) {
        const cg = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
        cg.addColorStop(0, isNight ? '#151030' : '#251010');
        cg.addColorStop(1, isNight ? '#0c0820' : '#180808');
        ctx.fillStyle = cg;
    } else {
        ctx.fillStyle = '#0a0808';
    }
    ctx.fill();

    // Card border
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    if (p.isAlive) {
        ctx.strokeStyle = isNight ? '#332266' : '#552222';
        ctx.lineWidth = 2;
    } else {
        ctx.strokeStyle = '#221111';
        ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.restore();

    // Get player info
    let displayName = `Oyuncu ${idx + 1}`;
    let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';

    if (p.isBot) {
        displayName = `AI ${p.id.split("_")[2] || (idx + 1)}`;
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx % 5}.png`;
    } else {
        try {
            const user = await client.users.fetch(p.id).catch(() => null);
            if (user) {
                displayName = user.username;
                avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
            }
            if (guild) {
                const member = await guild.members.fetch(p.id).catch(() => null);
                if (member) displayName = member.displayName;
            }
        } catch (e) { }
    }

    // Avatar
    try {
        const avatarImg = await loadImage(avatarUrl);

        if (!p.isAlive) {
            // Greyed out
            drawCircleImage(ctx, avatarImg, avatarX, avatarY, avatarSize);
            
            // Dark overlay
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.beginPath();
            ctx.arc(cx, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Big skull emoji
            ctx.save();
            ctx.font = `40px ${FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀', cx, avatarY + avatarSize / 2);
            ctx.restore();

            // Dead ring
            ctx.save();
            ctx.strokeStyle = '#66111166';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else {
            drawCircleImage(ctx, avatarImg, avatarX, avatarY, avatarSize);

            // Alive glow ring
            ctx.save();
            ctx.shadowColor = isNight ? '#6644cc' : '#cc3333';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = isNight ? '#7755dd' : '#dd4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, avatarY + avatarSize / 2, avatarSize / 2 + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    } catch (e) {
        // Fallback
        ctx.save();
        ctx.fillStyle = p.isAlive ? '#33225566' : '#22111133';
        ctx.beginPath();
        ctx.arc(cx, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.isAlive ? '#6644cc' : '#441111';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // Bot badge
    if (p.isBot) {
        ctx.save();
        ctx.fillStyle = '#5865F2';
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize - 8, avatarY + avatarSize - 8, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 14px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AI', avatarX + avatarSize - 8, avatarY + avatarSize - 7);
        ctx.restore();
    }

    // Name
    const nameY = avatarY + avatarSize + 30;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillStyle = p.isAlive ? '#ffffff' : '#666666';
    const name = truncateText(ctx, displayName, cardW - 20);
    ctx.fillText(name, cx, nameY);
    ctx.restore();

    // Status / Role
    const Roles = require('../Commands/Prefix/Fun/Game/Roles');
    const roleInfo = Roles[p.role];
    const roleName = roleInfo ? roleInfo.name : p.role;

    const statusY = nameY + 30;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options.showRoles) {
        // End game - show role + status
        ctx.font = `bold 20px ${FONT}`;
        ctx.fillStyle = '#ffaa44';
        ctx.fillText(roleName, cx, statusY);

        ctx.font = `bold 16px ${FONT}`;
        ctx.fillStyle = p.isAlive ? '#55cc55' : '#cc3333';
        ctx.fillText(p.isAlive ? 'HAYATTA' : 'ÖLÜ', cx, statusY + 28);
    } else {
        if (!p.isAlive) {
            ctx.font = `bold 20px ${FONT}`;
            if (options.revealRoles) {
                ctx.fillStyle = '#cc6644';
                ctx.fillText(roleName, cx, statusY);
                ctx.font = `bold 16px ${FONT}`;
                ctx.fillStyle = '#cc3333';
                ctx.fillText('ÖLÜ', cx, statusY + 28);
            } else {
                ctx.fillStyle = '#cc3333';
                ctx.fillText('ÖLÜ', cx, statusY);
            }
        } else {
            ctx.font = `bold 20px ${FONT}`;
            ctx.fillStyle = '#55cc55';
            ctx.fillText('HAYATTA', cx, statusY);
        }
    }
    ctx.restore();
}

// ─── MAIN RENDER ─────────────────────────────────────────────

async function renderVampireCanvas(client, game, options = {}) {
    const players = game.players;
    const isNight = game.phase === "NIGHT";

    // Layout - max 4 columns, generous sizing
    const cols = Math.min(players.length, 4);
    const rows = Math.ceil(players.length / cols);

    const cardW = 210;
    const cardH = 260;
    const cardGap = 25;

    const paddingX = 60;
    const paddingY = 40;

    // Event texts
    let eventTexts = [];
    if (options.endGame) {
        eventTexts.push('## OYUN SONA ERDİ!');
        eventTexts.push(`${(options.endGame.winnerText || '').replace(/[^\w\sçğıöşüÇĞIİÖŞÜ!]/g, '')} KAZANDI!`);
        if (options.endGame.reason) {
            eventTexts.push(options.endGame.reason.replace(/[^\w\sçğıöşüÇĞIİÖŞÜ!.]/g, ''));
        }
    } else if (options.execution) {
        eventTexts.push('## OYLAMA SONUCU');
        if (options.execution.isHanged) {
            const name = (options.execution.name || '').replace(/[<@>]/g, '');
            eventTexts.push(`${name} halk tarafından asıldı!`);
            eventTexts.push(`Rolü: ${options.execution.role || 'GİZLİ'}`);
        } else {
            eventTexts.push('Kimse asılmadı.');
        }
    } else {
        if (options.deaths) {
            if (options.deaths.length > 0) {
                eventTexts.push('## BU GECE ÖLENLER');
                for (const d of options.deaths) {
                    eventTexts.push(d.replace(/[<@>]/g, ''));
                }
            } else {
                eventTexts.push('## GECE SESSIZ GECTI');
                eventTexts.push('Kimse olmedi.');
            }
        }
        if (options.note) {
            eventTexts.push('');
            eventTexts.push('## VAMPIRLERIN NOTU');
            const noteClean = (options.note || '').replace(/[^\w\sçğıöşüÇĞIİÖŞÜ!?.,']/g, '');
            const words = noteClean.split(' ');
            let line = '';
            for (const word of words) {
                if (line.length + word.length > 45) {
                    eventTexts.push(`> ${line}`);
                    line = word;
                } else {
                    line = line ? `${line} ${word}` : word;
                }
            }
            if (line) eventTexts.push(`> ${line}`);
        }
    }

    const eventH = eventTexts.length > 0 ? (eventTexts.length * 38 + 60) : 0;
    const headerH = 180 + eventH;
    const footerH = 70;

    const gridW = (cols * cardW) + ((cols - 1) * cardGap);
    const gridH = (rows * cardH) + ((rows - 1) * cardGap);

    const W = Math.max(gridW + paddingX * 2, 850);
    const H = headerH + gridH + footerH + paddingY * 2;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Background
    await drawBackground(ctx, W, H, isNight);

    // Header
    const headerEndY = drawHeader(ctx, W, game, paddingY);

    // Events
    const eventsEndY = drawEventBox(ctx, W, headerEndY, eventTexts, isNight);
    const cardsStartY = eventTexts.length > 0 ? eventsEndY : headerEndY + 15;

    // Fetch guild
    const guild = client.guilds.cache.get(game.guildID);

    // Draw cards
    const actualGridW = (cols * cardW) + ((cols - 1) * cardGap);
    const gridOffsetX = (W - actualGridW) / 2;

    const cardOptions = {
        isNight,
        showRoles: !!options.endGame,
        revealRoles: game.settings?.revealRoleOnDeath
    };

    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const row = Math.floor(i / cols);
        const col = i % cols;

        // Center last row
        const rowItemCount = Math.min(cols, players.length - row * cols);
        const rowActualW = (rowItemCount * cardW) + ((rowItemCount - 1) * cardGap);
        const rowOffsetX = (actualGridW - rowActualW) / 2;

        const cardX = gridOffsetX + rowOffsetX + col * (cardW + cardGap);
        const cardY = cardsStartY + row * (cardH + cardGap);

        await drawPlayerCard(ctx, client, guild, p, i, cardX, cardY, cardW, cardH, cardOptions);
    }

    // Footer
    const footerY = cardsStartY + gridH + 20;

    const footDivGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
    footDivGrad.addColorStop(0, 'transparent');
    footDivGrad.addColorStop(0.5, isNight ? '#4433aa44' : '#aa333344');
    footDivGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = footDivGrad;
    ctx.fillRect(60, footerY, W - 120, 2);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillStyle = '#444444';
    ctx.fillText('VAMPIR KOYLU  -  Caveria Bot', W / 2, footerY + 30);
    ctx.restore();

    return canvas.toBuffer('image/png');
}

module.exports = { renderVampireCanvas };
