const { MessageFlags } = require("discord.js");
const GuardSettings = require("../../../Core/Database/GuardSettings");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

const labels = {
    roleCreate: "Rol Oluşturma",
    roleDelete: "Rol Silme",
    roleUpdate: "Rol Güncelleme",
    channelCreate: "Kanal Oluşturma",
    channelDelete: "Kanal Silme",
    channelUpdate: "Kanal Güncelleme",
    webhookUpdate: "Webhook Düzenleme",
    memberBan: "Sağ Tık Ban",
    memberKick: "Sağ Tık Kick",
    memberRoleUpdate: "Üye Rol Değişimi",
    botAdd: "Bot Ekleme",
    serverUpdate: "Sunucu Güncelleme",
    emojiCreate: "Emoji Oluşturma",
    emojiDelete: "Emoji Silme",
    emojiUpdate: "Emoji Güncelleme",
    stickerCreate: "Sticker Oluşturma",
    stickerDelete: "Sticker Silme",
    stickerUpdate: "Sticker Güncelleme",
    guildUrlUpdate: "URL (Vanity) Koruma",
    integrationCreate: "Entegrasyon Ekleme"
};

const categories = Object.keys(labels);

function formatDuration(ms) {
    if (!ms || ms <= 0) return "0 sn";
    const sec = Math.floor(ms / 1000);
    if (sec >= 86400) return `${(sec / 86400).toFixed(1)} gün`;
    if (sec >= 3600) return `${(sec / 3600).toFixed(1)} sa`;
    if (sec >= 60) return `${(sec / 60).toFixed(1)} dk`;
    return `${sec} sn`;
}

async function getSettings(guildID) {
    let settings = await GuardSettings.findOne({ guildID });
    if (!settings) settings = await GuardSettings.create({ guildID });
    return settings;
}

function buildDashboard(settings, guild) {
    const enabled = settings.enabled !== false;
    const statusText = enabled
        ? "### 🟢 Guard Sistemi: **Aktif**"
        : "### 🔴 Guard Sistemi: **Devre Dışı**";

    const activeProtections = categories
        .filter(key => {
            const cfg = settings[key];
            return cfg && cfg.limit > 0;
        })
        .map(key => {
            const cfg = settings[key];
            return `> **${labels[key]}** — Limit: \`${cfg.limit}\` | Süre: \`${formatDuration(cfg.time)}\` | Ceza: \`${cfg.action || "ban"}\``;
        });

    const protectionsText = activeProtections.length > 0
        ? activeProtections.join("\n")
        : "> *Henüz bir koruma ayarı yapılmamış.*";

    const wl = settings;
    const wlSummary =
        `> **Tam:** \`${wl.fullAccess?.length || 0}\`  ` +
        `**Rol:** \`${wl.roleAccess?.length || 0}\`  ` +
        `**Kanal:** \`${wl.channelAccess?.length || 0}\`  ` +
        `**Bot:** \`${wl.botAccess?.length || 0}\`  ` +
        `**Emoji:** \`${wl.emojiAccess?.length || 0}\``;

    const components = [
        {
            type: 17,
            accent_color: enabled ? 0x57F287 : 0xED4245,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: guild.iconURL({ extension: "png", size: 128 }) || "https://i.hizliresim.com/3kvn97k.jpg" }
                    },
                    components: [
                        {
                            type: 10,
                            content: "## 🛡️ Guard Sistem Yönetimi\nTek panelden tüm guard ayarlarını yönetin."
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `${statusText}\n\n${protectionsText}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `### 👥 Güvenli Liste Özeti\n${wlSummary}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 1, label: "Limit & Süre", custom_id: "guard_limit_menu", emoji: { name: "⚡" } },
                        { type: 2, style: 1, label: "Whitelist", custom_id: "guard_whitelist_menu", emoji: { name: "👤" } },
                        { type: 2, style: enabled ? 4 : 3, label: enabled ? "Kapat" : "Aç", custom_id: "guard_toggle", emoji: { name: enabled ? "⏹️" : "▶️" } },
                        { type: 2, style: 2, label: "Yenile", custom_id: "guard_dashboard", emoji: { name: "🔄" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

module.exports = {
    conf: {
        usages: ["guard", "güvenlik", "koruma", "guard-sistemi", "whitelist", "whitelist-sistemi", "guard-panel", "guard-dashboard"],
        description: "Sunucu korumasını (Guard) sistemini yönetmenizi sağlayan paneli açar ve ayarları görüntüler.",
        category: "Owners",
        usage: ".guard",
        owner: true
    },

    run: async (client, message, args) => {
        if (!ConfigManager.isOwner(message.member)) return;

        const settings = await getSettings(message.guild.id);
        const payload = buildDashboard(settings, message.guild);

        await message.channel.send(payload);
    },
};
