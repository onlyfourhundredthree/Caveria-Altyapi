const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Partner = require("../../Core/Database/GuildPartners");

const StaffTasks = require("../../Core/Database/StaffTasks");
const StatHistory = require("../../Core/Database/StatHistory");
const moment = require("moment");

function parseEmojiObj(str, fallback) {
    if (!str || typeof str !== 'string' || str.trim() === '') return { name: fallback };
    const match = str.match(/<a?:(.+):(\d+)>/);
    if (match) return { name: match[1], id: match[2] };
    return { name: str };
}

module.exports = async (interaction) => {
    if (!interaction.guild) return;

    const Emojis = ConfigManager.get('Emojis') || {};
    const e = (key, fallback) => Emojis[key] || fallback;
    const iptal = e('toji_iptal', (ConfigManager.get("Emojis.toji_iptal") || "✨"));
    const onay = e('toji_onay', (ConfigManager.get("Emojis.toji_onay") || "✨"));
    const info = e('toji_info', (ConfigManager.get("Emojis.toji_info") || "✨"));
    const partner = e('toji_partner', (ConfigManager.get("Emojis.toji_partner") || "✨"));
    const sign = e('toji_sign', (ConfigManager.get("Emojis.toji_sign") || "✨"));

    const iptalEmoji = parseEmojiObj(Emojis.toji_iptal, "🔨");
    const onayEmoji = parseEmojiObj(Emojis.toji_onay, "✅");
    const partnerEmoji = parseEmojiObj(Emojis.toji_partner, "🤝");
    const signEmoji = parseEmojiObj(Emojis.toji_sign, "📝");

    if (interaction.isButton()) {
        const customId = interaction.customId;

        if (["partner_panel_stat", "partner_panel_ban", "partner_panel_list", "partner_panel_setup", "delete_panel_ban", "edit_panel_reason"].includes(customId) || customId.startsWith('delete_panel_ban_') || customId.startsWith('edit_panel_reason_') || customId.startsWith('partner_list_page_')) {
            const pmRoles = ConfigManager.get("Roles.Responsibilities.PartnerManager") || [];
            const isPM = Array.isArray(pmRoles)
                ? pmRoles.some(r => interaction.member.roles.cache.has(r))
                : interaction.member.roles.cache.has(pmRoles);

            if (
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
                !isPM &&
                !ConfigManager.isOwner(interaction.member)
            ) {
                return interaction.reply({ content: `${iptal} Bu işlemi kullanmak için yeterli yetkiye sahip değilsiniz.`, ephemeral: true });
            }
        }

        if (customId === "partner_panel_stat") {
            const { UserSelectMenuBuilder, LabelBuilder } = require('discord.js');

            const modal = new ModalBuilder()
                .setCustomId("modal_partner_stat")
                .setTitle("Manuel Partner Düzenleme");

            const statAmountInput = new TextInputBuilder()
                .setCustomId("stat_amount")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Örn: 1 veya -1")
                .setRequired(true);

            const statAmountLabel = new LabelBuilder()
                .setLabel("Değişim Miktarı (Örn: 1 / -1)")
                .setDescription("Eklenecek veya çıkarılacak partner sayısı miktarını girin.")
                .setTextInputComponent(statAmountInput);

            const statUserSelect = new UserSelectMenuBuilder()
                .setCustomId("stat_user_id")
                .setPlaceholder("Stat eklenecek üyeyi seçin")
                .setMinValues(1)
                .setMaxValues(1)
                .setRequired(true);

            const statUserLabel = new LabelBuilder()
                .setLabel("Kullanıcı")
                .setDescription("Partner puanı eklenecek bot kullanıcısını seçin.")
                .setUserSelectMenuComponent(statUserSelect);

            modal.addLabelComponents(statUserLabel, statAmountLabel);

            return interaction.showModal(modal);
        }

        if (customId === "partner_panel_ban") {
            const modal = new ModalBuilder()
                .setCustomId("modal_partner_ban")
                .setTitle("Sunucu Yasakla / Aç");

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("ban_invite_link")
                        .setLabel("Discord Davet Linki")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("discord.gg/caveria")
                        .setRequired(true)
                )
            );

            return interaction.showModal(modal);
        }

        if (customId === "partner_panel_list" || customId.startsWith("partner_list_page_") || customId.startsWith("delete_panel_ban_") || customId.startsWith("edit_panel_reason_")) {
            const bannedGuilds = await Partner.find({ banned: true });

            if (!bannedGuilds.length) {
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: `${onay} Şu anda hiçbir sunucu yasaklı değil.`, embeds: [], components: [] });
                }
                return interaction.reply({ content: `${onay} Şu anda hiçbir sunucu yasaklı değil.`, ephemeral: true });
            }

            let page = 0;
            if (customId.startsWith("partner_list_page_")) {
                page = parseInt(customId.split("_")[3]) || 0;
            }

            if (customId.startsWith("delete_panel_ban_")) {
                const targetId = customId.split("_")[3];
                page = parseInt(customId.split("_")[4]) || 0;

                await Partner.findOneAndUpdate(
                    { _id: targetId, banned: true },
                    { $set: { banned: false } }
                );

                const newBanned = await Partner.find({ banned: true });
                if (!newBanned.length) {
                    return interaction.update({ content: `${onay} Tüm yasaklı sunucular kaldırıldı.`, embeds: [], components: [] });
                }
                if (page >= newBanned.length) page = Math.max(0, newBanned.length - 1);

                await interaction.deferUpdate();
                await updatePanelListEmbed(interaction, newBanned, page, true);
                return;
            }

            if (customId.startsWith("edit_panel_reason_")) {
                const targetId = customId.split("_")[3];
                const pageIndex = customId.split("_")[4];
                const serverData = bannedGuilds.find(x => x.id === targetId);

                if (!serverData) return interaction.reply({ content: `${iptal} Sunucu verisi bulunamadı.`, ephemeral: true });

                const modal = new ModalBuilder()
                    .setCustomId(`modal_edit_reason_${targetId}_${pageIndex}`)
                    .setTitle('Yasak Sebebi Düzenle');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('new_reason_input')
                            .setLabel("Yeni Sebep")
                            .setStyle(TextInputStyle.Paragraph)
                            .setValue(serverData.reason || "Belirtilmedi")
                            .setRequired(true)
                    )
                );

                return interaction.showModal(modal);
            }

            let isUpdate = false;
            if (!interaction.deferred && !interaction.replied) {
                if (customId.startsWith("partner_list_page_")) {
                    await interaction.deferUpdate();
                    isUpdate = true;
                } else {
                    await interaction.deferReply({ ephemeral: true });
                }
            } else if (customId.startsWith("partner_list_page_")) {
                isUpdate = true;
            }

            await updatePanelListEmbed(interaction, bannedGuilds, page, isUpdate);
        }

        if (customId === "partner_panel_setup" || customId === "partner_panel_setup_tr") {
            const embedMsg = new EmbedBuilder()
                .setColor("Blurple")
                .setDescription(`## 🇹🇷 Türkçe Partner Sistemi

### Başvuru Şartları
- Partner metninde **geçerli bir davet linki** olmalı.
- Başvuru yapan kişi, kendi sunucusunda partner yetkisine sahip olmalı.
- Partner mesajınız **sunucunuza ait** olmalı (başkasının metniyle başvuru kabul edilmez).

### Nasıl Çalışıyor?
1) Aşağıdaki **"Partner Yap"** butonuna tıkla ve açılan forma **kendi sunucunun partner metnini** yapıştır.  
2) Başvurunuz yetkili ekibimize iletilir.  
3) Onaylandığında botumuz sizin partner metninizi bu kanalda paylaşır.`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("auto_partner_tr")
                    .setLabel("🇹🇷 Partner Yap")
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.channel.send({ embeds: [embedMsg], components: [row] });
            return interaction.reply({ content: `${onay} Türkçe Partner Paneli bu kanala gönderildi.`, ephemeral: true });
        }

        if (customId === "partner_panel_setup_global") {
            const embedMsg = new EmbedBuilder()
                .setColor("Blurple")
                .setDescription(`## 🌐 Global Partner & Collaboration System

### Application Requirements
- Your advertisement text must contain a **valid Discord invite link**.
- The applicant must have partner/advertising permissions in their server.
- The advertisement text **must belong to your server** (third-party ads are not allowed).

### How It Works
1) Click the **"Apply for Global Partner"** button below and paste your server's text into the form.  
2) Your application will be forwarded to our management team.  
3) Once approved, our bot will automatically publish your text in this global channel.`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("auto_partner_global")
                    .setLabel("🌐 Apply for Global Partner")
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.channel.send({ embeds: [embedMsg], components: [row] });
            return interaction.reply({ content: `${onay} Global Partner Panel successfully sent to this channel.`, ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;
        if (customId.startsWith('partner_list_select_')) {
            const pmRoles = ConfigManager.get("Roles.Responsibilities.PartnerManager") || [];
            const isPM = Array.isArray(pmRoles)
                ? pmRoles.some(r => interaction.member.roles.cache.has(r))
                : interaction.member.roles.cache.has(pmRoles);

            if (
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
                !isPM &&
                !ConfigManager.isOwner(interaction.member)
            ) {
                return interaction.reply({ content: `${iptal} Bu işlemi kullanmak için yeterli yetkiye sahip değilsiniz.`, ephemeral: true });
            }

            const page = parseInt(customId.split('_')[3]) || 0;
            const value = interaction.values[0];
            const guildID = value.split('_')[0];

            const bannedGuilds = await Partner.find({ banned: true });
            if (!bannedGuilds.length) {
                return interaction.reply({ content: `${onay} Şu anda hiçbir sunucu yasaklı değil.`, ephemeral: true });
            }

            await interaction.deferUpdate();
            await updatePanelListEmbed(interaction, bannedGuilds, page, true, guildID);
        }
    }

    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        if (customId === "modal_partner_stat") {
            const userIds = interaction.fields.getSelectedUsers("stat_user_id")?.map(user => user.id) || [];
            if (userIds.length === 0) {
                return interaction.reply({ content: `${iptal} Geçerli bir kullanıcı seçmediniz.`, ephemeral: true });
            }
            const userID = userIds[0];

            const amountStr = interaction.fields.getTextInputValue("stat_amount");
            const amount = parseInt(amountStr);
            if (isNaN(amount) || amount === 0) {
                return interaction.reply({ content: `${iptal} Geçerli bir sayı girmediniz (Örn: 1 veya -1).`, ephemeral: true });
            }

            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            await StatHistory.updateOne(
                { userID, guildID: interaction.guild.id },
                {
                    $inc: { [`partners.${monthKey}`]: amount },
                    $setOnInsert: { userID, guildID: interaction.guild.id }
                },
                { upsert: true }
            );

            const staffTask = await StaffTasks.findOne({ userID, guildID: interaction.guild.id });
            if (staffTask) {
                const task = staffTask.tasks.find(t => t.type === 'partner');
                if (task) {
                    task.current += amount;
                    await staffTask.save();
                }
            }

            const actionText = amount > 0 ? "eklendi" : "çıkarıldı";
            return interaction.reply({ content: `${onay} <@${userID}> kullanıcısına **${Math.abs(amount)}** partner statı ${actionText}.`, ephemeral: true });
        }

        if (customId === "modal_partner_ban") {
            const inviteLink = interaction.fields.getTextInputValue("ban_invite_link");
            const inviteCode = inviteLink.replace(/https?:\/\/discord\.gg\//i, '').replace(/https?:\/\/discord\.com\/invite\//i, '').trim();

            if (!inviteCode) {
                return interaction.reply({ content: `${iptal} Geçerli bir davet linki girmediniz.`, ephemeral: true });
            }

            let invite;
            try {
                invite = await interaction.client.fetchInvite(inviteCode).catch(() => null);
            } catch {
                return interaction.reply({ content: `${iptal} Geçersiz davet linki veya sunucu bulunamadı.`, ephemeral: true });
            }

            if (!invite || !invite.guild) {
                return interaction.reply({ content: `${iptal} Davet linkinden sunucu bilgisi alınamadı.`, ephemeral: true });
            }

            const guildID = invite.guild.id;
            const guildName = invite.guild.name;
            const guildIcon = invite.guild.iconURL ? invite.guild.iconURL({ dynamic: true, size: 256 }) : null;

            let guildData = await Partner.findOne({ guildID });
            let bannedNow;

            if (guildData) {
                guildData.banned = !guildData.banned;
                bannedNow = guildData.banned;
                guildData.inviteCode = inviteCode;
                guildData.guildName = guildName;
                guildData.avatar = guildIcon;
                await guildData.save();
            } else {
                guildData = new Partner({
                    guildID,
                    guildName: guildName,
                    avatar: guildIcon,
                    inviteCode,
                    lastPartnerAt: null,
                    banned: true
                });
                bannedNow = true;
                await guildData.save();
            }

            const v2Payload = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: guildIcon ? {
                                type: 11,
                                media: { url: guildIcon }
                            } : undefined,
                            components: [
                                {
                                    type: 10,
                                    content: `> ## ${info} Partner Yasaklama Sistemi\n> -# **${guildName}** (\`${guildID}\`) sunucusunun partner durumu başarıyla güncellendi.\n> -# **Güncel Durum:** ${bannedNow ? "🔴 Yasaklı (Kara Listede)" : "🟢 Temiz (Banı Açıldı)"}`
                                }
                            ]
                        }
                    ]
                }
            ];

            return interaction.reply({ flags: [MessageFlags.IsComponentsV2], components: v2Payload });
        }

        if (customId.startsWith("modal_edit_reason_")) {
            const targetId = customId.split("_")[3];
            const pageIndex = customId.split("_")[4];
            const newReason = interaction.fields.getTextInputValue("new_reason_input");

            await Partner.updateOne({ _id: targetId }, { $set: { reason: newReason } });
            const bannedGuilds = await Partner.find({ banned: true });

            await interaction.deferUpdate();
            await updatePanelListEmbed(interaction, bannedGuilds, parseInt(pageIndex), true);
            return interaction.followUp({ content: `${onay} Sebep güncellendi.`, ephemeral: true });
        }
    }
};

async function updatePanelListEmbed(interaction, bannedGuilds, page, isUpdate = false, selectedGuildId = null) {
    const ITEMS_PER_PAGE = 25;
    const maxPage = Math.max(0, Math.ceil(bannedGuilds.length / ITEMS_PER_PAGE) - 1);

    if (page > maxPage) page = maxPage;
    if (page < 0) page = 0;

    const start = page * ITEMS_PER_PAGE;
    const currentItems = bannedGuilds.slice(start, start + ITEMS_PER_PAGE);

    const Emojis = ConfigManager.get('Emojis') || {};
    const e = (key, fallback) => Emojis[key] || fallback;

    const parseEmojiObj = (str) => {
        if (!str) return null;
        const match = str.match(/<a?:(.+):(\d+)>/);
        if (match) return { name: match[1], id: match[2] };
        return null;
    };

    const iptal = e('toji_iptal', (ConfigManager.get("Emojis.toji_iptal") || "✨"));
    const onay = e('toji_onay', (ConfigManager.get("Emojis.toji_onay") || "✨"));
    const partner = e('toji_partner', (ConfigManager.get("Emojis.toji_partner") || "✨"));

    const iptalEmoji = parseEmojiObj(Emojis.toji_iptal, "🔨");
    const partnerEmoji = parseEmojiObj(Emojis.toji_partner, "🤝");
    const signEmoji = parseEmojiObj(Emojis.toji_sign, "📝");

    const container = {
        type: 17,
        components: []
    };

    container.components.push({
        type: 9,
        accessory: {
            type: 11,
            media: { url: interaction.client.user.displayAvatarURL({ dynamic: true, size: 1024 }) }
        },
        components: [
            {
                type: 10,
                content: `> ## ${iptal} Yasaklı Sunucular Listesi\n> -# Partner sisteminden yasaklanmış sunucuları görüntüleyin ve yönetin.`
            }
        ]
    });

    container.components.push({
        type: 14,
        divider: true,
        spacing: 1
    });

    container.components.push({
        type: 10,
        content: `**Sayfa ${page + 1}/${maxPage + 1}** • Toplam **${bannedGuilds.length}** yasaklı sunucu.`
    });

    const selectOptions = currentItems.map((g) => {
        const reason = g.reason || 'Belirtilmedi';
        const desc = reason.length > 50 ? reason.substring(0, 47) + '...' : reason;
        return {
            label: (g.guildName || 'Bilinmiyor').substring(0, 25),
            value: `${g.id || g.guildID}_${page}`,
            description: desc.substring(0, 50),
            emoji: partnerEmoji,
            default: selectedGuildId && (g.id || g.guildID) === selectedGuildId
        };
    });

    container.components.push({
        type: 1,
        components: [
            {
                type: 3,
                custom_id: `partner_list_select_${page}`,
                placeholder: 'İşlem yapmak istediğiniz sunucuyu seçin...',
                options: selectOptions,
                min_values: 1,
                max_values: 1
            }
        ]
    });

    if (selectedGuildId) {
        const selected = bannedGuilds.find(g => (g.id || g.guildID) === selectedGuildId);
        if (selected) {
            container.components.push({
                type: 14,
                divider: true,
                spacing: 1
            });

            const guildName = selected.guildName || 'Bilinmiyor';
            const guildID = selected.id || selected.guildID;
            const reason = selected.reason || 'Belirtilmedi';
            const avatar = selected.avatar;

            const detailSection = {
                type: 9,
                components: [
                    {
                        type: 10,
                        content: `### ${partner} Seçili Sunucu\n**${guildName}**\n-# ID: \`${guildID}\`\n-# Sebep: **${reason}**`
                    }
                ]
            };

            if (avatar) {
                detailSection.accessory = {
                    type: 11,
                    media: { url: avatar },
                    description: guildName
                };
            } else {
                detailSection.accessory = {
                    type: 2,
                    style: 4,
                    custom_id: `delete_panel_ban_${guildID}_${page}`,
                    label: 'Ban Kaldır',
                    emoji: iptalEmoji
                };
            }

            container.components.push(detailSection);

            container.components.push({
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 4,
                        custom_id: `delete_panel_ban_${guildID}_${page}`,
                        label: 'Ban Kaldır',
                        emoji: iptalEmoji
                    },
                    {
                        type: 2,
                        style: 2,
                        custom_id: `edit_panel_reason_${guildID}_${page}`,
                        label: 'Sebep Düzenle',
                        emoji: signEmoji
                    }
                ]
            });
        }
    }

    container.components.push({
        type: 14,
        divider: true,
        spacing: 1
    });

    const pageButtons = [];
    if (maxPage > 0) {
        pageButtons.push({
            type: 2,
            style: 2,
            custom_id: `partner_list_page_${page - 1}`,
            label: 'Önceki',
            disabled: page === 0
        });
    }

    pageButtons.push({
        type: 2,
        style: 2,
        custom_id: 'partner_list_page_info',
        label: `${page + 1} / ${maxPage + 1}`,
        disabled: true
    });

    if (maxPage > 0) {
        pageButtons.push({
            type: 2,
            style: 2,
            custom_id: `partner_list_page_${page + 1}`,
            label: 'Sonraki',
            disabled: page === maxPage
        });
    }

    if (pageButtons.length > 0) {
        container.components.push({
            type: 1,
            components: pageButtons
        });
    }

    const payload = {
        flags: [MessageFlags.IsComponentsV2],
        components: [container]
    };

    await interaction.editReply(payload).catch(err => console.error('PartnerPanel editReply hatası:', err));
}
