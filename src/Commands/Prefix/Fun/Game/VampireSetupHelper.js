const Roles = require("./Roles");

// Rolleri settings.roles objesinden güvenli okur
function roleCount(settings, setupDef) {
    return settings.roles[setupDef.key] ?? setupDef.default ?? 0;
}

function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}

// --- DEFAULT ROL DAĞILIMINI Roles.js'DEN ÜRET ---
function defaultRoles() {
    const roles = {};
    for (const r of Object.values(Roles)) {
        if (r.setup) roles[r.setup.key] = r.setup.default;
    }
    roles.villager = 0;
    return roles;
}

// --- ROL SELECT OPTIONS ---
function buildRoleOptions(settings) {
    const opts = [];
    for (const r of Object.values(Roles)) {
        if (!r.setup) continue;
        const cur = roleCount(settings, r.setup);
        const emojiTxt = r.emoji ? `${r.emoji} ` : "";
        if (r.setup.mode === "count") {
            opts.push({
                label: `${r.name} (+1) — ${cur}`,
                value: `role_${r.setup.key}_inc`,
                description: `${r.name} sayısını artırır. (Şu an: ${cur})`,
                emoji: r.emoji ? { name: r.emoji } : undefined
            });
            opts.push({
                label: `${r.name} (-1) — ${cur}`,
                value: `role_${r.setup.key}_dec`,
                description: `${r.name} sayısını azaltır. (Şu an: ${cur})`,
                emoji: r.emoji ? { name: r.emoji } : undefined
            });
        } else {
            opts.push({
                label: `${r.name}: ${cur > 0 ? "Açık" : "Kapalı"}`,
                value: `role_${r.setup.key}_toggle`,
                description: `${r.name} rolünü aç/kapat. (Şu an: ${cur > 0 ? "Açık" : "Kapalı"})`,
                emoji: r.emoji ? { name: r.emoji } : undefined
            });
        }
    }
    return opts;
}

// --- SÜRE SELECT OPTIONS ---
function buildDurationOptions(settings) {
    const dur = [
        { key: "night", label: "Gece", settingKey: "nightDuration", def: 90, min: 15, max: 600 },
        { key: "disk", label: "Tartışma", settingKey: "discussionDuration", def: 60, min: 15, max: 600 },
        { key: "vote", label: "Oylama", settingKey: "voteDuration", def: 90, min: 15, max: 600 },
    ];
    const opts = [];
    for (const d of dur) {
        const cur = settings[d.settingKey] ?? d.def;
        opts.push({
            label: `${d.label} Süresi (+15sn) — ${cur}sn`,
            value: `dur_${d.key}_inc`,
            description: `${d.label} süresini 15 saniye artırır. (Şu an: ${cur}sn, max: ${d.max}s)`
        });
        opts.push({
            label: `${d.label} Süresi (-15sn) — ${cur}sn`,
            value: `dur_${d.key}_dec`,
            description: `${d.label} süresini 15 saniye azaltır. (Şu an: ${cur}sn, min: ${d.min}s)`
        });
    }
    return opts;
}

// --- GENEL AYAR SELECT OPTIONS (toggle + sayısal) ---
function buildGeneralOptions(settings) {
    const opts = [];
    const toggles = [
        { key: "reveal", settingKey: "revealRoleOnDeath", label: "Ölenin Rolünü Göster", def: true },
        { key: "self", settingKey: "doctorSelfProtect", label: "Doktor Kendini Korusun", def: true },
        { key: "inheritance", settingKey: "doctorInheritance", label: "Doktor Mirası", def: false },
        { key: "autoRoles", settingKey: "autoRoles", label: "Oto. Rol Dağıtımı", def: false },
    ];
    for (const t of toggles) {
        const cur = settings[t.settingKey] ?? t.def;
        opts.push({
            label: `${t.label}: ${cur ? "Açık" : "Kapalı"}`,
            value: `toggle_${t.key}`,
            description: `${t.label} ayarını aç/kapat. (Şu an: ${cur ? "Açık" : "Kapalı"})`
        });
    }
    return opts;
}

// --- TEK SELECT'TE TOPLU OPTIONS (eski davranışa geriyeuyumlu) ---
function buildAllSetupOptions(settings) {
    return [...buildRoleOptions(settings), ...buildDurationOptions(settings), ...buildGeneralOptions(settings)];
}

// --- AYARI UYGULA ( Dynamo ) ---
function applySetting(game, value) {
    const s = game.settings;

    // role_<key>_<op>
    if (value.startsWith("role_")) {
        const parts = value.split("_"); // ["role", key, op]
        if (parts.length < 3) return;
        const key = parts[1];
        const op = parts[2];
        const role = Object.values(Roles).find(r => r.setup && r.setup.key === key);
        if (!role) return;
        const cur = s.roles[key] ?? role.setup.default ?? 0;
        if (op === "inc") {
            const max = role.setup.max ?? 99;
            s.roles[key] = Math.min(max, (cur || 0) + 1);
        } else if (op === "dec") {
            const min = role.setup.min ?? 0;
            s.roles[key] = Math.max(min, (cur || 0) - 1);
        } else if (op === "toggle") {
            // 0<->1 (toggle modunda max genelde 1)
            s.roles[key] = cur > 0 ? 0 : 1;
        }
        game.markModified("settings");
        return;
    }

    // dur_<key>_<op>
    if (value.startsWith("dur_")) {
        const parts = value.split("_");
        if (parts.length < 3) return;
        const key = parts[1];
        const op = parts[2];
        const map = {
            night: { settingKey: "nightDuration", def: 90, min: 15, max: 600, step: 15 },
            disk: { settingKey: "discussionDuration", def: 60, min: 15, max: 600, step: 15 },
            vote: { settingKey: "voteDuration", def: 90, min: 15, max: 600, step: 15 },
        };
        const m = map[key];
        if (!m) return;
        const cur = s[m.settingKey] ?? m.def;
        if (op === "inc") s[m.settingKey] = Math.min(m.max, cur + m.step);
        else if (op === "dec") s[m.settingKey] = Math.max(m.min, cur - m.step);
        game.markModified("settings");
        return;
    }

    // toggle_<key>
    if (value.startsWith("toggle_")) {
        const key = value.replace("toggle_", "");
        const map = {
            reveal: "revealRoleOnDeath",
            self: "doctorSelfProtect",
            inheritance: "doctorInheritance",
            auto_roles: "autoRoles",
        };
        const sk = map[key];
        if (sk) {
            s[sk] = !s[sk];
        } else if (key === "tts") {
            s.ttsRoleMode = s.ttsRoleMode || 1;
            s.ttsRoleMode += 1;
            if (s.ttsRoleMode > 3) s.ttsRoleMode = 1;
        }
        game.markModified("settings");
        return;
    }

    // --- ESKİ VALUE'LERLE GERİYEUYUMLULUK (kullanıcı eski kayıtlar ise) ---
    const legacyMap = {
        add_vampire: "role_vampire_inc",
        rem_vampire: "role_vampire_dec",
        toggle_doctor: "role_doctor_toggle",
        toggle_seer: "role_seer_toggle",
        toggle_hunter: "role_hunter_toggle",
        toggle_jester: "role_jester_toggle",
        toggle_reveal: "toggle_reveal",
        toggle_self: "toggle_self",
        toggle_inheritance: "toggle_inheritance",
        night_plus: "dur_night_inc",
        night_minus: "dur_night_dec",
        disk_plus: "dur_disk_inc",
        disk_minus: "dur_disk_dec",
        vote_plus: "dur_vote_inc",
        vote_minus: "dur_vote_dec",
    };
    if (legacyMap[value]) return applySetting(game, legacyMap[value]);
}

// --- SETUP ÖZETİ (ekran altı metni) ---
function setupSummary(settings, playerCount = 0) {
    let totalSpecial = 0;
    let roleTxt = "Yok";

    if (settings.autoRoles) {
        let good = 0, evil = 0, neutral = 0;
        if (playerCount > 0) {
            if (playerCount <= 6) { evil = 1; good = 2; neutral = 0; }
            else if (playerCount <= 8) { evil = 2; good = 2; neutral = 0; }
            else if (playerCount <= 10) { evil = 2; good = 3; neutral = 1; }
            else if (playerCount <= 13) { evil = 3; good = 4; neutral = 1; }
            else if (playerCount <= 16) { evil = 4; good = 5; neutral = 2; }
            else { evil = 6; good = 6; neutral = 2; }
            
            let remaining = Math.max(0, playerCount - (evil + good + neutral));
            let totalGood = good + remaining;
            
            roleTxt = `\n> 🤫 **Oto Dağıtım (Gizli):**\n> 🟢 İyi: **${totalGood}** • 🔴 Kötü: **${evil}** • ⚪ Tarafsız: **${neutral}**`;
        } else {
            roleTxt = "\n> 🤫 **Oto Dağıtım:** Roller kişi sayısına göre otomatik belirlenecek ve gizli tutulacak!";
        }
        totalSpecial = "?";
    } else {
        const roleParts = [];
        for (const r of Object.values(Roles)) {
            if (!r.setup) continue;
            const cur = roleCount(settings, r.setup);
            if (cur > 0) {
                if (r.setup.mode === "count") {
                    roleParts.push(`${r.emoji} ${r.name}: ${cur}`);
                } else {
                    roleParts.push(`${r.emoji} ${r.name}: Açık`);
                }
                totalSpecial += cur;
            }
        }
        roleTxt = roleParts.length > 0 ? "\n> " + roleParts.join("\n> ") : "\n> Yok";
    }

    const durTxt = `⏱️ Gece: ${settings.nightDuration ?? 90}sn • Tartışma: ${settings.discussionDuration ?? 60}sn • Oylama: ${settings.voteDuration ?? 90}sn`;
    const optTxt = `⚙️ Rol Göster: ${settings.revealRoleOnDeath ? "Açık" : "Kapalı"} • Doktor Self: ${settings.doctorSelfProtect ? "Açık" : "Kapalı"} • Doktor Mirası: ${settings.doctorInheritance ? "Açık" : "Kapalı"}`;

    return { roleTxt, durTxt, optTxt, totalSpecial };
}

module.exports = {
    Roles,
    defaultRoles,
    buildRoleOptions,
    buildDurationOptions,
    buildGeneralOptions,
    buildAllSetupOptions,
    applySetting,
    setupSummary,
    roleCount,
};