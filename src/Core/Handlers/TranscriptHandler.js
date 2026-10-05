const moment = require('moment');
require('moment-duration-format');
const { MessageFlags } = require('discord.js');

const htmlTemplate = (channelName, ticketID, messages, info) => {
    const statusBadge = info.resolved
        ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(46,204,113,0.15);color:#2ecc71;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;">✅ Çözüldü</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(231,76,60,0.15);color:#e74c3c;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;">❌ Çözülmedi</span>`;
    const lockBadge = info.locked
        ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(241,196,15,0.15);color:#f1c40f;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;margin-left:6px;">🔒 Kilitli</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(149,165,166,0.15);color:#95a5a6;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700;margin-left:6px;">🔓 Kilitli Değil</span>`;

    const ticketInfoItems = [
        `<div class="stat-item"><div class="stat-label">Talep ID</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">#${ticketID}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Talep Sebebi</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.reason}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Açılma Tarihi</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.openDate}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Kapatılma Tarihi</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.closeDate}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Toplam Süre</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.duration}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Durum</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${statusBadge} ${lockBadge}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Mesaj Sayısı</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.messageCount}</div></div>`
    ];

    const userInfoItems = [
        `<div class="stat-item"><div class="stat-label">Açan Kullanıcı</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.user}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Hesap Oluşturma</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.accountCreated}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Sunucuya Katılma</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.joinedAt}</div></div>`
    ];

    const staffInfoItems = [
        `<div class="stat-item"><div class="stat-label">Kapatan Yetkili</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.closer}</div></div>`,
        `<div class="stat-item"><div class="stat-label">Çözen Yetkili</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.staff}</div></div>`
    ];

    const detailItems = [];
    if (info.subject) detailItems.push(`<div class="stat-item"><div class="stat-label">Konu</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.subject}</div></div>`);
    if (info.solution) detailItems.push(`<div class="stat-item"><div class="stat-label">Çözüm</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.solution}</div></div>`);
    if (info.result) detailItems.push(`<div class="stat-item"><div class="stat-label">Sonuç</div><div class="stat-value" style="font-weight:500;color:var(--text-main);">${info.result}</div></div>`);

    const buildAccordion = (title, items) => items.length > 0 ? `
    <details class="details-accordion">
        <summary class="details-summary">
            <span>${title}</span>
            <span class="details-arrow">▶</span>
        </summary>
        <div class="details-content">
            <div class="stats-grid" style="margin-top:10px;">
                ${items.join('')}
            </div>
        </div>
    </details>` : '';

    const ticketInfoAccordion = buildAccordion('📋 Ticket Bilgileri', ticketInfoItems);
    const userInfoAccordion = buildAccordion('👤 Kullanıcı Bilgileri', userInfoItems);
    const staffInfoAccordion = buildAccordion('🛡️ Yetkili Bilgileri', staffInfoItems);
    const detailsAccordion = buildAccordion('📝 Talep Detayları', detailItems);

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transcript - ${channelName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-darker: #0a0c10;
            --bg-main: #111318;
            --bg-card: #181a20;
            --bg-hover: #1e2028;
            --text-main: #e1e3e6;
            --text-muted: #8a8f98;
            --text-dim: #5c6169;
            --accent: #5865f2;
            --accent-glow: rgba(88, 101, 242, 0.12);
            --border: #252830;
            --border-light: rgba(255, 255, 255, 0.04);
            --success: #2ecc71;
            --danger: #e74c3c;
            --warning: #f1c40f;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: var(--bg-darker); color: var(--text-main); line-height: 1.55; padding: 40px 20px; font-size: 14px; }

        .container { max-width: 1000px; margin: 0 auto; }

        header {
            background: linear-gradient(145deg, var(--bg-main), var(--bg-card));
            padding: 32px;
            border-radius: 20px;
            margin-bottom: 28px;
            border: 1px solid var(--border);
            box-shadow: 0 10px 32px rgba(0,0,0,0.25), inset 0 1px 0 var(--border-light);
            position: relative;
            overflow: hidden;
        }

        header::before {
            content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px;
            background: linear-gradient(90deg, #5865f2, #eb459e, #fee75c);
        }

        header h1 { font-size: 26px; margin-bottom: 24px; color: #fff; font-weight: 800; display: flex; align-items: center; gap: 12px; letter-spacing: -0.3px; }
        header h1 span { color: var(--text-muted); font-weight: 500; font-size: 20px; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }

        .stat-item {
            background: rgba(0, 0, 0, 0.22);
            padding: 16px 18px;
            border-radius: 12px;
            border: 1px solid var(--border);
            transition: all 0.2s ease;
        }
        .stat-item:hover { border-color: var(--accent); background: var(--accent-glow); transform: translateY(-1px); }

        .stat-label { font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.9px; margin-bottom: 8px; }
        .stat-value { font-size: 14px; color: #fff; font-weight: 600; white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; }
        .stat-value.muted { color: var(--text-muted); font-weight: 500; }

        .section-title {
            font-size: 13px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 1px;
            margin: 24px 0 14px 4px; display: flex; align-items: center; gap: 8px;
        }

        .message-list { display: flex; flex-direction: column; gap: 1px; background: var(--bg-main); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; }

        .message {
            display: flex; gap: 14px; padding: 14px 18px;
            transition: background 0.12s ease;
            border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        .message:last-child { border-bottom: none; }
        .message:hover { background: var(--bg-hover); }

        .avatar-wrap { position: relative; flex-shrink: 0; }
        .avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; display: block; }
        .msg-body { flex: 1; min-width: 0; padding-top: 1px; }

        .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap; }
        .username { font-weight: 700; font-size: 15px; letter-spacing: -0.2px; display: inline-flex; align-items: center; gap: 6px; }
        .role-icon { width: 16px; height: 16px; border-radius: 3px; object-fit: contain; display: inline-block; }
        .time { font-size: 11px; color: var(--text-dim); font-weight: 500; }
        .bot-badge {
            background: rgba(88, 101, 242, 0.18); color: #aab0ff; font-size: 10px; font-weight: 700;
            padding: 1px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;
        }

        .msg-content { font-size: 14.5px; word-wrap: break-word; white-space: pre-wrap; color: #d8dade; line-height: 1.55; }

        .msg-content b, .msg-content strong { font-weight: 700; color: #fff; }
        .msg-content i, .msg-content em { font-style: italic; }
        .msg-content u { text-decoration: underline; text-decoration-color: rgba(255,255,255,0.3); }
        .msg-content code { background: #1e1f23; padding: 0.15em 0.4em; border-radius: 4px; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; color: #e8e8e8; border: 1px solid rgba(255,255,255,0.05); }
        .msg-content pre { background: #1a1c21; padding: 14px; border-radius: 10px; border: 1px solid var(--border); margin: 10px 0; overflow-x: auto; }
        .msg-content pre code { background: transparent; padding: 0; color: #e3e5e8; font-size: 13px; border: none; }
        .msg-content blockquote { border-left: 3px solid #4f545c; padding-left: 14px; color: #a8abb0; margin: 6px 0; border-radius: 2px; }

        .mention { background: rgba(88, 101, 242, 0.14); color: #c9cdfb; padding: 1px 5px; border-radius: 4px; font-weight: 500; display: inline-block; font-size: 13.5px; }
        .mention:hover { background: rgba(88, 101, 242, 0.28); }

        .v2-embed {
            background: #1c1e24;
            border-radius: 10px;
            border-left: 3px solid var(--accent);
            padding: 16px 18px;
            margin-top: 10px;
            max-width: 560px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .v2-h1 { font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 10px; letter-spacing: -0.2px; }
        .v2-h2 { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .v2-text { font-size: 13.5px; color: #c8cacf; margin-bottom: 4px; line-height: 1.55; }
        .v2-divider { height: 1px; background: #2f3138; margin: 12px 0; border-radius: 1px; }

        .attachment { margin-top: 10px; border-radius: 10px; overflow: hidden; max-width: 420px; display: inline-block; background: #1c1e24; padding: 10px; border: 1px solid var(--border); }
        .attachment img { max-width: 100%; max-height: 320px; display: block; border-radius: 6px; }
        .attachment-link { color: #6dbbff; text-decoration: none; display: flex; align-items: center; gap: 6px; font-size: 13.5px; padding: 2px 0; font-weight: 500; }
        .attachment-link:hover { text-decoration: underline; }

        .footer { margin-top: 36px; text-align: center; font-size: 12px; color: var(--text-dim); padding: 24px 0; border-top: 1px solid var(--border); }
        .footer span { color: var(--accent); font-weight: 700; }

        .detail-block {
            background: rgba(0,0,0,0.18);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px 18px;
            margin-top: 10px;
            font-size: 13.5px;
            color: var(--text-main);
            line-height: 1.65;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .details-accordion {
            margin-top: 18px;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            background: rgba(0,0,0,0.12);
        }
        .details-summary {
            padding: 14px 18px;
            cursor: pointer;
            font-size: 10px;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
            letter-spacing: 0.9px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
            list-style: none;
        }
        .details-summary::-webkit-details-marker { display: none; }
        .details-arrow { transition: transform 0.2s ease; font-size: 12px; color: var(--text-dim); }
        .details-accordion[open] .details-arrow { transform: rotate(90deg); }
        .details-content { padding: 0 18px 18px; }

        @media (max-width: 640px) {
            body { padding: 16px 10px; }
            header { padding: 22px; }
            .message { padding: 12px 14px; gap: 12px; }
            .avatar { width: 38px; height: 38px; }
            .stats-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📁 Transcript <span>#${channelName}</span></h1>
            ${ticketInfoAccordion}
            ${userInfoAccordion}
            ${staffInfoAccordion}
            ${detailsAccordion}
        </header>

        <div class="section-title">💬 Mesajlar</div>
        <div class="message-list">
            ${messages}
        </div>

        <div class="footer">
            Generated by <span>403AI</span> &bull; ${info.date}
        </div>
    </div>
</body>
</html>`;
};

function parseMarkdown(text, client) {
    if (!text) return "";
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/^-# (.*$)/gm, '<small style="color: var(--text-muted);">$1</small>')
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*]+)\*/g, '<i>$1</i>')
        .replace(/__([^_]+)__/g, '<u>$1</u>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #5865f2; text-decoration: none;">$1</a>');

    html = html.replace(/&lt;@!?(\d+)&gt;/g, (match, id) => {
        const user = client.users.cache.get(id);
        return `<span class="mention">@${user ? user.tag : `Kullanıcı (${id})`}</span>`;
    });

    html = html.replace(/&lt;@&amp;(\d+)&gt;/g, (match, id) => {
        return `<span class="mention" style="color: #f1c40f; background: rgba(241, 196, 15, 0.1);">@Rol (${id})</span>`;
    });

    html = html.replace(/&lt;#(\d+)&gt;/g, (match, id) => {
        const channel = client.channels.cache.get(id);
        return `<span class="mention">#${channel ? channel.name : `Kanal (${id})`}</span>`;
    });

    html = html.replace(/&lt;:([a-zA-Z0-9_]+):(\d+)&gt;/g, '<img src="https://cdn.discordapp.com/emojis/$2.png?size=44" class="emoji" alt="$1" style="width: 20px; height: 20px; vertical-align: middle; margin: 0 2px;">');
    html = html.replace(/&lt;a:([a-zA-Z0-9_]+):(\d+)&gt;/g, '<img src="https://cdn.discordapp.com/emojis/$2.gif?size=44" class="emoji" alt="$1" style="width: 20px; height: 20px; vertical-align: middle; margin: 0 2px;">');

    return html;
}

function parseV2Content(content, client) {
    if (!content) return "";
    let lines = content.split('\n');
    let html = "";
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        let cleanedLine = line.replace(/^>\s*/, "").trim();

        if (cleanedLine.startsWith('##')) {
            html += `<div class="v2-h1">${parseMarkdown(cleanedLine.replace(/^##\s*/, ""), client)}</div>`;
        } else if (cleanedLine.startsWith('###')) {
            html += `<div class="v2-h2">${parseMarkdown(cleanedLine.replace(/^###\s*/, ""), client)}</div>`;
        } else if (cleanedLine.startsWith('-#')) {
            html += `<div class="v2-text"><small style="color: var(--text-muted);">${parseMarkdown(cleanedLine.replace(/^-#\s*/, ""), client)}</small></div>`;
        } else {
            html += `<div class="v2-text">${parseMarkdown(cleanedLine, client)}</div>`;
        }
    });
    return html;
}

function isBotWelcomeMessage(msg, client) {
    if (msg.author.id !== client.user.id) return false;
    if (!msg.flags.has(MessageFlags.IsComponentsV2)) return false;
    try {
        for (const top of msg.components || []) {
            for (const comp of top.components || []) {
                if (comp.type === 10 && comp.content) {
                    const c = comp.content;
                    if (c.includes('Destek Talebi') && c.includes('başarıyla oluşturuldu')) return true;
                }
                if (comp.type === 9 && comp.components) {
                    for (const inner of comp.components || []) {
                        if (inner.type === 10 && inner.content) {
                            const c = inner.content;
                            if (c.includes('Destek Talebi') && c.includes('başarıyla oluşturuldu')) return true;
                        }
                    }
                }
            }
        }
    } catch (e) {}
    return false;
}

function processV2Component(comp, client) {
    if (!comp) return '';
    let html = '';
    if (comp.type === 10 && comp.content) {
        html += parseV2Content(comp.content, client);
    } else if (comp.type === 14) {
        html += '<div class="v2-divider"></div>';
    }
    if (Array.isArray(comp.components)) {
        comp.components.forEach(child => {
            html += processV2Component(child, client);
        });
    }
    return html;
}

const formatMessage = (msg, client, guild) => {
    const time = moment(msg.createdTimestamp).format('DD.MM.YYYY HH:mm');
    const avatar = msg.author.displayAvatarURL({ extension: 'png', size: 128 });

    let displayName = msg.author.globalName || msg.author.username;
    let roleColor = '#ffffff';
    let roleIconHtml = '';
    let avatarRing = '';
    let botBadge = msg.author.bot ? '<span class="bot-badge">BOT</span>' : '';

    let member = msg.member;
    if (!member && guild) {
        member = guild.members.cache.get(msg.author.id);
    }

    if (member) {
        displayName = member.displayName || displayName;
        const highestRole = member.roles.highest;
        if (highestRole && highestRole.color) {
            const hex = highestRole.color.toString(16).padStart(6, '0');
            roleColor = '#' + hex;
        }
        if (highestRole && highestRole.icon) {
            const iconUrl = highestRole.iconURL({ size: 64, format: 'png' });
            if (iconUrl) {
                roleIconHtml = `<img src="${iconUrl}" class="role-icon" alt="">`;
            }
        }
    }

    if (roleColor && roleColor !== '#000000' && roleColor !== '#ffffff') {
        avatarRing = `style="box-shadow: 0 0 0 2.5px ${roleColor};"`;
    }

    let contentHtml = `<div class="msg-content">${parseMarkdown(msg.content, client)}</div>`;

    if (msg.attachments.size > 0) {
        msg.attachments.forEach(att => {
            if (att.contentType?.startsWith('image/')) contentHtml += `<div class="attachment"><img src="${att.url}"></div>`;
            else contentHtml += `<div class="msg-content"><div class="attachment"><a href="${att.url}" target="_blank" class="attachment-link">📎 Dosya Eki: ${att.name}</a></div></div>`;
        });
    }

    if (msg.flags && msg.flags.has && msg.flags.has(MessageFlags.IsComponentsV2)) {
        let v2Html = '<div class="v2-embed">';
        if (Array.isArray(msg.components)) {
            msg.components.forEach(comp => {
                v2Html += processV2Component(comp, client);
            });
        }
        v2Html += '</div>';
        contentHtml += v2Html;
    }

    return `
    <div class="message">
        <div class="avatar-wrap">
            <img src="${avatar}" class="avatar" ${avatarRing} alt="">
        </div>
        <div class="msg-body">
            <div class="msg-header">
                <span class="username" style="color: ${roleColor};">${displayName} ${roleIconHtml}</span>
                ${botBadge}
                <span class="time">${time}</span>
            </div>
            ${contentHtml}
        </div>
    </div>`;
};

module.exports = async (channel, ticketData, client, closerUser = null) => {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const guild = channel.guild;

    const ticketUser = await client.users.fetch(ticketData.userID).catch(() => null);
    const ticketStaff = ticketData.staffID ? await client.users.fetch(ticketData.staffID).catch(() => null) : null;
    const ticketMember = guild ? await guild.members.fetch(ticketData.userID).catch(() => null) : null;

    const now = Date.now();
    const duration = moment.duration(now - ticketData.date).format("D [gün], H [saat], m [dakika], s [saniye]");
    const accountCreated = ticketUser ? moment(ticketUser.createdTimestamp).format('DD.MM.YYYY HH:mm:ss') : "Bilinmiyor";
    const joinedAt = ticketMember ? moment(ticketMember.joinedTimestamp).format('DD.MM.YYYY HH:mm:ss') : "Bilinmiyor";
    const openDate = moment(ticketData.date).format('DD.MM.YYYY HH:mm:ss');
    const closeDate = moment().format('DD.MM.YYYY HH:mm:ss');

    let closerText = "Bilinmiyor";
    if (closerUser) {
        closerText = `${closerUser.username} (${closerUser.id})`;
    }

    const info = {
        user: ticketUser ? `${ticketUser.username} (${ticketUser.id})` : ticketData.userID,
        staff: ticketStaff ? `${ticketStaff.username} (${ticketStaff.id})` : "Henüz Atanmadı",
        closer: closerText,
        date: moment().format('DD.MM.YYYY HH:mm'),
        resolved: ticketData.resolved,
        locked: ticketData.locked,
        duration: duration,
        messageCount: sorted.size,
        accountCreated: accountCreated,
        joinedAt: joinedAt,
        openDate: openDate,
        closeDate: closeDate,
        reason: ticketData.reason || "Belirtilmemiş",
        subject: ticketData.subject || "",
        problem: ticketData.problem || "",
        solution: ticketData.solution || "",
        result: ticketData.result || ""
    };

    let messageHtml = '';
    sorted.forEach(msg => {
        if (isBotWelcomeMessage(msg, client)) return;
        if (!msg.author.bot || msg.flags.has(MessageFlags.IsComponentsV2) || msg.content.includes("📁 **Sistem:**")) {
            messageHtml += formatMessage(msg, client, guild);
        }
    });

    return { html: htmlTemplate(channel.name, ticketData.ticketID, messageHtml, info), messageCount: sorted.size };
};
