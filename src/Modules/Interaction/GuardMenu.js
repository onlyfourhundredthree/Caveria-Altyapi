const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    MessageFlags
} = require("discord.js");
const GuardSettings = require("../../Core/Database/GuardSettings");
const GuardManager = require("../../Core/Handlers/GuardManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

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

const whitelistTypes = {
    full: { key: "fullAccess", label: "Tam Erişim" },
    role: { key: "roleAccess", label: "Rol Erişimi" },
    channel: { key: "channelAccess", label: "Kanal Erişimi" },
    bot: { key: "botAccess", label: "Bot Erişimi" },
    emoji: { key: "emojiAccess", label: "Emoji Erişimi" }
};

const actionOptions = [
    { label: "Ban", value: "ban", description: "Kullanıcıyı sunucudan yasaklar" },
    { label: "Kick", value: "kick", description: "Kullanıcıyı sunucudan atar" },
    { label: "Jail", value: "jail", description: "Kullanıcıyı jail'e atar" },
    { label: "Rolleri Al", value: "removeRoles", description: "Tehlikeli yetki rollerini alır" }
];

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

function buildLimitEditor(settings, selectedCategory) {
    const cfg = settings[selectedCategory] || { limit: 0, time: 60000, action: "ban" };
    const label = labels[selectedCategory];

    const categoryOptions = categories.map(key => ({
        label: labels[key],
        value: key,
        default: key === selectedCategory
    }));

    const components = [
        {
            type: 17,
            accent_color: 0x5865F2,
            components: [
                {
                    type: 10,
                    content: `## ⚡ Limit & Süre Yönetimi\nDüzenlemek istediğiniz koruma kategorisini seçin.`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: "guard_limit_select",
                            placeholder: "Kategori seçin",
                            options: categoryOptions
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `### ${label}\n` +
                        `> **Limit:** \`${cfg.limit || 0}\` işlem\n` +
                        `> **Süre:** \`${formatDuration(cfg.time)}\`\n` +
                        `> **Ceza:** \`${cfg.action || "ban"}\``
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 1, label: "Limit Değiştir", custom_id: `guard_limit_edit:${selectedCategory}:limit`, emoji: { name: "🔢" } },
                        { type: 2, style: 1, label: "Süre Değiştir", custom_id: `guard_limit_edit:${selectedCategory}:time`, emoji: { name: "⏱️" } },
                        { type: 2, style: 1, label: "Ceza Değiştir", custom_id: `guard_limit_edit:${selectedCategory}:action`, emoji: { name: "⚖️" } },
                        { type: 2, style: 2, label: "Geri", custom_id: "guard_dashboard", emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildActionSelect(selectedCategory) {
    const components = [
        {
            type: 17,
            accent_color: 0x5865F2,
            components: [
                {
                    type: 10,
                    content: `## ⚖️ Ceza Türü Seçin\n**${labels[selectedCategory]}** için uygulanacak cezayı seçin.`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `guard_limit_action_select:${selectedCategory}`,
                            placeholder: "Ceza seçin",
                            options: actionOptions
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Geri", custom_id: "guard_limit_menu", emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildWhitelistManager(settings) {
    const counts = Object.entries(whitelistTypes).map(([type, info]) => {
        const count = settings[info.key]?.length || 0;
        return `> **${info.label}:** \`${count}\` kişi`;
    }).join("\n");

    const components = [
        {
            type: 17,
            accent_color: 0x57F287,
            components: [
                {
                    type: 10,
                    content: "## 👤 Güvenli Liste Yönetimi\nGüvenli listeye kullanıcı ekleyin, çıkarın veya mevcut listeyi görüntüleyin."
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: counts
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 3, label: "Ekle", custom_id: "guard_whitelist_add", emoji: { name: "➕" } },
                        { type: 2, style: 4, label: "Çıkar", custom_id: "guard_whitelist_remove", emoji: { name: "➖" } },
                        { type: 2, style: 1, label: "Listele", custom_id: "guard_whitelist_list", emoji: { name: "📋" } },
                        { type: 2, style: 2, label: "Geri", custom_id: "guard_dashboard", emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildWhitelistTypeSelect(action) {
    const title = action === "add" ? "➕ Eklenecek Liste Türü" : "➖ Çıkarılacak Liste Türü";
    const options = Object.entries(whitelistTypes).map(([type, info]) => ({
        label: info.label,
        value: type,
        description: `${info.label} listesinden ${action === "add" ? "ekleme" : "çıkarma"} yap` 
    }));

    const components = [
        {
            type: 17,
            accent_color: action === "add" ? 0x57F287 : 0xED4245,
            components: [
                {
                    type: 10,
                    content: `## ${title}\nİşlem yapmak istediğiniz güvenli liste türünü seçin.`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `guard_whitelist_${action}_select`,
                            placeholder: "Liste türü seçin",
                            options
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Geri", custom_id: "guard_whitelist_menu", emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildWhitelistRemoveUserSelect(settings, type) {
    const info = whitelistTypes[type];
    const list = settings[info.key] || [];

    if (list.length === 0) {
        return buildErrorPanel("Bu listede çıkarılacak kullanıcı bulunmuyor.", "guard_whitelist_menu");
    }

    const options = list.slice(0, 25).map(id => ({
        label: id,
        value: id,
        description: `${info.label} listesinden çıkar`
    }));

    const components = [
        {
            type: 17,
            accent_color: 0xED4245,
            components: [
                {
                    type: 10,
                    content: `## ➖ ${info.label} Listesinden Çıkar\nÇıkarmak istediğiniz kullanıcıyı seçin.`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `guard_whitelist_remove_user:${type}`,
                            placeholder: "Kullanıcı seçin",
                            options
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Geri", custom_id: "guard_whitelist_remove", emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildWhitelistList(settings, page = 0) {
    const allEntries = [];
    for (const [type, info] of Object.entries(whitelistTypes)) {
        const list = settings[info.key] || [];
        for (const id of list) {
            allEntries.push({ type: info.label, id });
        }
    }

    if (allEntries.length === 0) {
        return buildErrorPanel("Güvenli liste şu anda boş.", "guard_whitelist_menu");
    }

    const perPage = 20;
    const totalPages = Math.ceil(allEntries.length / perPage);
    const pageEntries = allEntries.slice(page * perPage, (page + 1) * perPage);

    const listText = pageEntries.map(e => `> **${e.type}:** <@${e.id}> (\`${e.id}\`)`).join("\n");

    const navButtons = [
        { type: 2, style: 2, label: "◀", custom_id: `guard_whitelist_list_page:${page - 1}`, disabled: page <= 0 },
        { type: 2, style: 2, label: "▶", custom_id: `guard_whitelist_list_page:${page + 1}`, disabled: page >= totalPages - 1 }
    ];

    const components = [
        {
            type: 17,
            accent_color: 0x5865F2,
            components: [
                {
                    type: 10,
                    content: `## 📋 Güvenli Liste\nSayfa **${page + 1}/${totalPages}** — Toplam **${allEntries.length}** kayıt`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: listText
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: totalPages > 1 ? navButtons : []
                },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Geri", custom_id: "guard_whitelist_menu", emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    // Boş action row göndermeyi engelle
    if (totalPages <= 1) components[0].components = components[0].components.filter(c => c.type !== 1 || c.components.length > 0);

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildErrorPanel(text, backCustomId) {
    const components = [
        {
            type: 17,
            accent_color: 0xED4245,
            components: [
                {
                    type: 10,
                    content: `## ⚠️ Hata\n${text}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Geri", custom_id: backCustomId, emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function buildSuccessPanel(text, backCustomId) {
    const components = [
        {
            type: 17,
            accent_color: 0x57F287,
            components: [
                {
                    type: 10,
                    content: `## ✅ İşlem Tamamlandı\n${text}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Panele Dön", custom_id: backCustomId, emoji: { name: "◀️" } }
                    ]
                }
            ]
        }
    ];

    return { flags: [MessageFlags.IsComponentsV2], components };
}

function showLimitModal(interaction, category, field) {
    const label = labels[category];
    const isLimit = field === "limit";

    const modal = new ModalBuilder()
        .setCustomId(`guard_limit_modal:${category}:${field}`)
        .setTitle(isLimit ? `${label} - Limit` : `${label} - Süre`);

    const input = new TextInputBuilder()
        .setCustomId("value_input")
        .setLabel(isLimit ? "Yeni limit değeri" : "Yeni süre (milisaniye)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(isLimit ? "Örn: 3" : "Örn: 60000 (1 dakika)")
        .setRequired(true)
        .setMaxLength(10);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
}

function showWhitelistAddModal(interaction, type) {
    const info = whitelistTypes[type];

    const modal = new ModalBuilder()
        .setCustomId(`guard_whitelist_add_modal:${type}`)
        .setTitle(`${info.label} - Ekle`);

    const input = new TextInputBuilder()
        .setCustomId("id_input")
        .setLabel("Kullanıcı ID'si")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Örn: 123456789012345678")
        .setRequired(true)
        .setMaxLength(30);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
}

async function handleButton(interaction, settings, customId) {
    const guildID = interaction.guild.id;

    if (customId === "guard_dashboard") {
        return interaction.update(buildDashboard(settings, interaction.guild));
    }

    if (customId === "guard_toggle") {
        settings.enabled = !settings.enabled;
        await settings.save();
        await GuardManager.clearCache(guildID);
        return interaction.update(buildDashboard(settings, interaction.guild));
    }

    if (customId === "guard_limit_menu") {
        return interaction.update(buildLimitEditor(settings, "roleCreate"));
    }

    if (customId === "guard_whitelist_menu") {
        return interaction.update(buildWhitelistManager(settings));
    }

    if (customId === "guard_whitelist_add") {
        return interaction.update(buildWhitelistTypeSelect("add"));
    }

    if (customId === "guard_whitelist_remove") {
        return interaction.update(buildWhitelistTypeSelect("remove"));
    }

    if (customId === "guard_whitelist_list") {
        return interaction.update(buildWhitelistList(settings, 0));
    }

    if (customId.startsWith("guard_whitelist_list_page:")) {
        const page = parseInt(customId.split(":")[1]) || 0;
        return interaction.update(buildWhitelistList(settings, page));
    }

    if (customId.startsWith("guard_limit_edit:")) {
        const parts = customId.split(":");
        const category = parts[1];
        const field = parts[2];
        if (field === "action") {
            return interaction.update(buildActionSelect(category));
        }
        return showLimitModal(interaction, category, field);
    }
}

async function handleSelectMenu(interaction, settings, customId) {
    const guildID = interaction.guild.id;
    const value = interaction.values[0];

    if (customId === "guard_limit_select") {
        return interaction.update(buildLimitEditor(settings, value));
    }

    if (customId.startsWith("guard_limit_action_select:")) {
        const category = customId.split(":")[1];
        const config = settings[category] || { limit: 3, time: 60000, action: "ban" };
        config.action = value;
        settings[category] = config;
        await settings.save();
        await GuardManager.clearCache(guildID);
        return interaction.update(buildSuccessPanel(
            `**${labels[category]}** için ceza türü \`${value}\` olarak güncellendi.`,
            "guard_limit_menu"
        ));
    }

    if (customId === "guard_whitelist_add_select") {
        return showWhitelistAddModal(interaction, value);
    }

    if (customId === "guard_whitelist_remove_select") {
        return interaction.update(buildWhitelistRemoveUserSelect(settings, value));
    }

    if (customId.startsWith("guard_whitelist_remove_user:")) {
        const type = customId.split(":")[1];
        const info = whitelistTypes[type];
        const targetId = value;

        if (!settings[info.key].includes(targetId)) {
            return interaction.update(buildErrorPanel("Bu kullanıcı listede bulunmuyor.", "guard_whitelist_remove"));
        }

        settings[info.key] = settings[info.key].filter(id => id !== targetId);
        await settings.save();
        await GuardManager.clearCache(guildID);

        return interaction.update(buildSuccessPanel(
            `<@${targetId}> kullanıcısı **${info.label}** listesinden çıkarıldı.`,
            "guard_whitelist_menu"
        ));
    }
}

async function handleModalSubmit(interaction, settings, customId) {
    const guildID = interaction.guild.id;

    if (customId.startsWith("guard_limit_modal:")) {
        const parts = customId.split(":");
        const category = parts[1];
        const field = parts[2];
        const rawValue = interaction.fields.getTextInputValue("value_input").trim();
        const numericValue = parseInt(rawValue);

        if (isNaN(numericValue) || numericValue < 0) {
            return interaction.reply({
                content: "❌ Geçerli bir sayı girmelisiniz.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const config = settings[category] || { limit: 3, time: 60000, action: "ban" };
        config[field] = numericValue;
        settings[category] = config;
        await settings.save();
        await GuardManager.clearCache(guildID);

        const label = field === "limit" ? "Limit" : "Süre";
        return interaction.update(buildSuccessPanel(
            `**${labels[category]}** için ${label} \`${numericValue}\` ${field === "time" ? "ms" : ""} olarak güncellendi.`,
            "guard_limit_menu"
        ));
    }

    if (customId.startsWith("guard_whitelist_add_modal:")) {
        const type = customId.split(":")[1];
        const info = whitelistTypes[type];
        const targetId = interaction.fields.getTextInputValue("id_input").trim();

        if (!/^\d{17,20}$/.test(targetId)) {
            return interaction.reply({
                content: "❌ Geçerli bir kullanıcı ID'si girmelisiniz.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        if (settings[info.key].includes(targetId)) {
            return interaction.reply({
                content: `⚠️ Bu kullanıcı zaten **${info.label}** listesinde.`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        settings[info.key].push(targetId);
        await settings.save();
        await GuardManager.clearCache(guildID);

        return interaction.update(buildSuccessPanel(
            `<@${targetId}> kullanıcısı **${info.label}** listesine eklendi.`,
            "guard_whitelist_menu"
        ));
    }
}

module.exports = async (interaction) => {
    const customId = interaction.customId;
    if (!customId || !customId.startsWith("guard_")) return;

    if (!interaction.guild) return;

    if (!ConfigManager.isOwner(interaction.member)) {
        return interaction.reply({
            content: "❌ Bu paneli sadece bot sahibi kullanabilir.",
            flags: [MessageFlags.Ephemeral]
        });
    }

    const settings = await getSettings(interaction.guild.id);

    try {
        if (interaction.isButton()) {
            await handleButton(interaction, settings, customId);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, settings, customId);
        } else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction, settings, customId);
        }
    } catch (error) {
        require("fs").writeFileSync("caveria_guard_error.txt", error.stack || error.toString());
        console.error("[GuardMenu] Interaction hatası:", error);
        const reply = interaction.replied || interaction.deferred
            ? interaction.editReply
            : interaction.reply;

        await reply.call(interaction, {
            content: "❌ Bir hata oluştu. Lütfen tekrar deneyin.",
            flags: [MessageFlags.Ephemeral]
        }).catch(() => { });
    }
};
