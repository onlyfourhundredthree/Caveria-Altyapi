const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const BackupManager = require("../../Core/Handlers/BackupManager");
const GuildBackup = require("../../Core/Database/GuildBackup");
const BackupService = require("../../Services/Systems/BackupService");

function formatDate(ts) {
    return `<t:${Math.floor(ts / 1000)}:f> (<t:${Math.floor(ts / 1000)}:R>)`;
}

function getChannelTypeName(type) {
    const t = { 0: "Yazı", 2: "Ses", 4: "Kategori", 5: "Duyuru", 13: "Sahne", 15: "Forum" };
    return t[type] || `Tip ${type}`;
}

const ITEMS_PER_PAGE = 10;

function buildPageContent(backup, page, section) {
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "✦";
    const staff = emojis.toji_staff || "";

    let content = `## ${spark} Yedek Detayı\n` +
        `> **Tarih:** ${formatDate(backup.createdAt)}\n` +
        `> **Tür:** \`${backup.backupType}\`\n` +
        `> **ID:** \`${backup._id}\`\n`;

    if (section === "roles") {
        const total = backup.roleCount || 0;
        const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
        const items = backup.roles || [];
        content += `> **Roller:** \`${total}\` adet\n`;
        if (items.length > 0) content += "\n### " + staff + " Roller\n" + items.map(r => `> <@&${r.id}> \`${r.name}\` — \`${r.members?.length || 0} üye\``).join("\n");
        content += `\n-# Sayfa ${page + 1}/${totalPages}`;
        return { content, totalPages, section: "roles", items };
    }

    if (section === "channels") {
        const total = backup.channelCount || 0;
        const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
        const items = backup.channels || [];
        content += `> **Kanallar:** \`${total}\` adet\n`;
        if (items.length > 0) content += "\n### " + staff + " Kanallar\n" + items.map(c => `> <#${c.id}> \`${c.name}\` — \`${getChannelTypeName(c.type)}\``).join("\n");
        content += `\n-# Sayfa ${page + 1}/${totalPages}`;
        return { content, totalPages, section: "channels", items };
    }

    if (section === "emojis") {
        const total = backup.emojiCount || 0;
        const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
        const items = backup.emojis || [];
        content += `> **Emojiler:** \`${total}\` adet\n`;
        if (items.length > 0) content += "\n### " + staff + " Emojiler\n" + items.map(e => `> \`:${e.name}:\` \`${e.name}\``).join("\n");
        content += `\n-# Sayfa ${page + 1}/${totalPages}`;
        return { content, totalPages, section: "emojis", items };
    }

    if (section === "stickers") {
        const total = backup.stickerCount || 0;
        const totalPages = Math.ceil(total / ITEMS_PER_PAGE) || 1;
        const items = backup.stickers || [];
        content += `> **Stickerlar:** \`${total}\` adet\n`;
        if (items.length > 0) content += "\n### " + staff + " Stickerlar\n" + items.map(s => `> \`${s.name}\``).join("\n");
        content += `\n-# Sayfa ${page + 1}/${totalPages}`;
        return { content, totalPages, section: "stickers", items };
    }

    const rt = backup.roleCount || 0;
    const ct = backup.channelCount || 0;
    const et = backup.emojiCount || 0;
    const st = backup.stickerCount || 0;
    content += `> **Roller:** \`${rt}\` | **Kanallar:** \`${ct}\` | **Emojiler:** \`${et}\` | **Stickerlar:** \`${st}\``;
    return { content, totalPages: 1, section: "overview", items: [] };
}

async function buildDetailMessage(guild, backupId, section, page) {
    const projection = {
        createdAt: 1, backupType: 1,
        roleCount: 1, channelCount: 1, emojiCount: 1, stickerCount: 1
    };

    if (section === "roles") projection.roles = { $slice: [page * ITEMS_PER_PAGE, ITEMS_PER_PAGE] };
    else if (section === "channels") projection.channels = { $slice: [page * ITEMS_PER_PAGE, ITEMS_PER_PAGE] };
    else if (section === "emojis") projection.emojis = { $slice: [page * ITEMS_PER_PAGE, ITEMS_PER_PAGE] };
    else if (section === "stickers") projection.stickers = { $slice: [page * ITEMS_PER_PAGE, ITEMS_PER_PAGE] };

    const backup = await GuildBackup.findById(backupId, projection).lean();
    if (!backup) return null;

    const { content, totalPages, items } = buildPageContent(backup, page, section);

    const tabs = ["overview", "roles", "channels", "emojis", "stickers"];
    const tabButtons = tabs.filter(t => t !== "overview").map(t => ({
        type: 2, style: 1,
        label: t === "roles" ? "Roller" : t === "channels" ? "Kanallar" : t === "emojis" ? "Emojiler" : "Stickerlar",
        custom_id: `backup_tab_${t}_${backupId}`,
        disabled: section === t
    }));

    const navButtons = [];
    if (totalPages > 1) {
        navButtons.push(
            { type: 2, style: 2, label: "◀", custom_id: `backup_nav_${section}_${backupId}_${page - 1}`, disabled: page <= 0 },
            { type: 2, style: 2, label: "▶", custom_id: `backup_nav_${section}_${backupId}_${page + 1}`, disabled: page >= totalPages - 1 }
        );
    }
    navButtons.push({ type: 2, style: 2, label: "Geri", custom_id: "backup_list" });

    const components = [{ type: 17, components: [{ type: 10, content }] }];
    components[0].components.push({ type: 14, divider: true, spacing: 1 });
    components[0].components.push({ type: 1, components: tabButtons });
    if (navButtons.length > 0) {
        components[0].components.push({ type: 1, components: navButtons });
    }

    if (section !== "overview" && items && items.length > 0) {
        components[0].components.push({ type: 14, divider: true, spacing: 1 });
        const selectOptions = items.map(item => ({
            label: item.name.substring(0, 100),
            value: item.id,
            description: "Geri yüklemek için seçin"
        }));
        components[0].components.push({
            type: 1,
            components: [
                {
                    type: 3,
                    custom_id: `backup_restore_select_${section}_${backupId}`,
                    placeholder: "Geri yüklenecek öğeyi seçin...",
                    options: selectOptions
                }
            ]
        });
    }

    return { flags: [MessageFlags.IsComponentsV2], components };
}

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    const cid = interaction.customId || "";
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "✦";

    if (cid === "backup_refresh") {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
        const panel = await BackupService.getDashboard(interaction.guild);
        return interaction.editReply(panel).catch(() => {});
    }

    if (interaction.isButton() && cid === "backup_create") {
        await interaction.update({
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components: [
                { type: 10, content: `## ⏳ Yedek Alınıyor...\nLütfen bekleyin, rol ikonları ve kanal mesajları R2'ye yükleniyor. Bu işlem sunucu büyüklüğüne göre biraz zaman alabilir.` }
            ] }]
        }).catch(() => {});
        try {
            let lastUpdate = Date.now();
            const backup = await BackupManager.createBackup(interaction.guild, "manual", async (msg) => {
                if (Date.now() - lastUpdate > 1500) {
                    lastUpdate = Date.now();
                    await interaction.editReply({
                        flags: [MessageFlags.IsComponentsV2],
                        components: [{ type: 17, components: [
                            { type: 10, content: `## ⏳ Yedek Alınıyor...\n> ${msg}` }
                        ] }]
                    }).catch(() => {});
                }
            });
            return interaction.editReply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [
                    { type: 10, content: `## ${spark} Yedek Alındı\n**ID:** \`${backup._id}\`\n**Tarih:** ${formatDate(backup.createdAt)}\n**Roller:** \`${backup.roleCount || backup.roles?.length || 0}\` | **Kanallar:** \`${backup.channelCount || backup.channels?.length || 0}\` | **Emojiler:** \`${backup.emojiCount || backup.emojis?.length || 0}\` | **Sticker:** \`${backup.stickerCount || backup.stickers?.length || 0}\`` },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 1, components: [{ type: 2, style: 2, label: "Geri", custom_id: "backup_refresh" }] }
                ] }]
            });
        } catch (err) {
            return interaction.editReply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [
                    { type: 10, content: `## ${spark} Hata\nYedek alınamadı.` },
                    { type: 1, components: [{ type: 2, style: 2, label: "Geri", custom_id: "backup_refresh" }] }
                ] }]
            });
        }
    }

    if (interaction.isButton() && cid === "backup_list") {
        await interaction.deferUpdate().catch(() => {});
        const backups = await GuildBackup.find({ guildID: interaction.guild.id }).select("_id createdAt backupType roleCount channelCount emojiCount stickerCount").sort({ createdAt: -1 }).limit(25).lean();
        if (backups.length === 0) {
            const panel = { flags: [MessageFlags.IsComponentsV2], components: [{ type: 17, components: [
                { type: 10, content: `## ${spark} Yedekler\nHiç yedek bulunamadı.` },
                { type: 1, components: [{ type: 2, style: 2, label: "Geri", custom_id: "backup_refresh" }] }
            ] }] };
            return interaction.editReply(panel).catch(() => {});
        }
        const options = backups.map(b => ({
            label: `${b.backupType} - ${new Date(b.createdAt).toLocaleDateString("tr-TR")}`,
            value: b._id.toString(),
            description: `R:${b.roleCount || 0} K:${b.channelCount || 0} E:${b.emojiCount || 0} S:${b.stickerCount || 0}`
        }));
        const panel = {
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components: [
                { type: 10, content: `## ${spark} Yedekleri Yönet\nİncelemek için yedek seçin.` },
                { type: 14, divider: true, spacing: 1 },
                { type: 1, components: [{ type: 3, custom_id: "backup_detail_select", placeholder: "Yedek seçin", options }] },
                { type: 14, divider: true, spacing: 1 },
                { type: 1, components: [{ type: 2, style: 2, label: "Geri", custom_id: "backup_refresh" }] }
            ] }]
        };
        return interaction.editReply(panel).catch(() => {});
    }

    if (interaction.isStringSelectMenu() && cid === "backup_detail_select") {
        await interaction.deferUpdate().catch(() => {});
        const backupId = interaction.values[0];
        const panel = await buildDetailMessage(interaction.guild, backupId, "roles", 0);
        if (panel) return interaction.editReply(panel);
        return interaction.editReply({ content: "Yedek detayları alınamadı." });
    }

    const tabMatch = cid.match(/^backup_tab_(roles|channels|emojis|stickers)_(.+)$/);
    if (interaction.isButton() && tabMatch) {
        await interaction.deferUpdate().catch(() => {});
        const panel = await buildDetailMessage(interaction.guild, tabMatch[2], tabMatch[1], 0);
        if (panel) return interaction.editReply(panel);
    }

    const navMatch = cid.match(/^backup_nav_(roles|channels|emojis|stickers)_(.+)_(\d+)$/);
    if (interaction.isButton() && navMatch) {
        await interaction.deferUpdate().catch(() => {});
        const panel = await buildDetailMessage(interaction.guild, navMatch[2], navMatch[1], parseInt(navMatch[3]));
        if (panel) return interaction.editReply(panel);
    }

    const restoreSelectMatch = cid.match(/^backup_restore_select_(roles|channels|emojis|stickers)_(.+)$/);
    if (interaction.isStringSelectMenu() && restoreSelectMatch) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const section = restoreSelectMatch[1];
        const itemId = interaction.values[0];

        try {
            if (section === "roles") {
                const restored = await BackupManager.restoreRole(interaction.guild, itemId);
                return interaction.editReply(restored ? `${spark} Rol başarıyla geri yüklendi: **${restored.name}**` : "❌ Yedekte bu rol bulunamadı veya kurtarılamadı.");
            } else if (section === "channels") {
                const restored = await BackupManager.restoreChannel(interaction.guild, itemId);
                return interaction.editReply(restored ? `${spark} Kanal başarıyla geri yüklendi: **${restored.name}**` : "❌ Yedekte bu kanal bulunamadı veya kurtarılamadı.");
            } else if (section === "emojis") {
                const restored = await BackupManager.restoreEmoji(interaction.guild, itemId);
                return interaction.editReply(restored ? `${spark} Emoji başarıyla geri yüklendi: **${restored.name}**` : "❌ Yedekte bu emoji bulunamadı veya kurtarılamadı.");
            } else if (section === "stickers") {
                const restored = await BackupManager.restoreSticker(interaction.guild, itemId);
                return interaction.editReply(restored ? `${spark} Sticker başarıyla geri yüklendi: **${restored.name}**` : "❌ Yedekte bu sticker bulunamadı veya kurtarılamadı.");
            }
        } catch (err) {
            console.error(err);
            return interaction.editReply("❌ Bir hata oluştu.");
        }
    }
};

async function buildDashboard(guild) {
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "✦";
    const latest = await GuildBackup.findOne({ guildID: guild.id }).select("_id createdAt backupType roleCount channelCount emojiCount stickerCount").sort({ createdAt: -1 }).lean();

    let statText = "";
    if (latest) {
        statText = `> **Son Yedek:** ${formatDate(latest.createdAt)} (${latest.backupType})\n` +
            `> **Roller:** \`${latest.roleCount || 0}\` | **Kanallar:** \`${latest.channelCount || 0}\` | **Emojiler:** \`${latest.emojiCount || 0}\` | **Sticker:** \`${latest.stickerCount || 0}\``;
    } else {
        statText = "> *Henüz yedek alınmamış.*";
    }

    return {
        flags: [MessageFlags.IsComponentsV2],
        components: [{
            type: 17,
            components: [
                { type: 10, content: `## ${spark} Yedekleme Sistemi\nSunucu yedeklerini yönetin.` },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: statText },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 3, label: "Yedek Oluştur", custom_id: "backup_create" },
                        { type: 2, style: 1, label: "Yedekleri Yönet", custom_id: "backup_list" },
                        { type: 2, style: 2, label: "Yenile", custom_id: "backup_refresh" }
                    ]
                }
            ]
        }]
    };
}
