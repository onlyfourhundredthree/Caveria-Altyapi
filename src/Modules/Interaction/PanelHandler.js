const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags } = require("discord.js");
const TaskSettings = require("../../Core/Database/TaskSettings");
const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
const ScheduledMessage = require("../../Core/Database/ScheduledMessage");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu() && !interaction.isUserSelectMenu() && !interaction.isRoleSelectMenu() && !interaction.isChannelSelectMenu()) return;
    if (!interaction.customId.startsWith("panel_")) return;

    const emojis = ConfigManager.get("Emojis") || {};

    const isOwner = ConfigManager.isOwner(interaction.member);
    if (!isOwner) return interaction.reply({ content: "Yetkiniz yok.", flags: [MessageFlags.Ephemeral] });

    if (interaction.customId === "panel_claim_settings") {
        const MemberClaimSettings = require("../../Core/Database/MemberClaimSettings");
        let settings = await MemberClaimSettings.findOne({ guildID: interaction.guild.id });
        if (!settings) settings = await MemberClaimSettings.create({ guildID: interaction.guild.id });

        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: interaction.guild.iconURL({ dynamic: true }) || interaction.user.displayAvatarURL() } },
                        components: [
                            { type: 10, content: `## ${emojis.toji_sparkly || ""} Üye Claim Ayarları\n**Yeni üyeleri claimleme ve adapte etme sisteminin limitlerini buradan düzenleyebilirsiniz.**` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `### ⚙️ Mevcut Ayarlar\n` +
                            `- **Havuz İçin Ses:** \`${settings.qualifyVoice}\` dakika\n` +
                            `- **Havuz İçin Mesaj:** \`${settings.qualifyMessages}\` adet\n` +
                            `- **Max Claim Sınırı:** \`${settings.maxClaims}\` adet\n` +
                            `\n` +
                            `- **Ses Hedefi:** \`${settings.maxVoiceLimit}\` dk (Dk başı \`${settings.xpPerMinute}\` XP)\n` +
                            `- **Mesaj Hedefi:** \`${settings.maxMessageLimit}\` adet (Mesaj başı \`${settings.xpPerMessage}\` XP)\n` +
                            `\n` +
                            `- **Claim Bildirim Kanalı:** ${ConfigManager.get("Channels.ClaimDropChannel") ? `<#${ConfigManager.get("Channels.ClaimDropChannel")}>` : "\`Ayarlanmamış\`"}\n` +
                            `- **Claim Havuz Kanalı:** ${ConfigManager.get("Channels.ClaimLog") ? `<#${ConfigManager.get("Channels.ClaimLog")}>` : "\`Ayarlanmamış\`"}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_claim_edit_req", label: "Havuz & Sınırları Düzenle", style: 3 },
                            { type: 2, custom_id: "panel_claim_edit_xp", label: "Ödül & Hedefleri Düzenle", style: 3 },
                            { type: 2, custom_id: "panel_claim_channel", label: "Bildirim Kanalı", style: 1 },
                            { type: 2, custom_id: "panel_claim_result_channel", label: "Havuz Kanalı", style: 1 },
                            { type: 2, custom_id: "panel_main", label: "Geri", style: 2 }
                        ]
                    }
                ]
            }
        ];

        await interaction.update({ components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.customId === "panel_claim_edit") {
        const MemberClaimSettings = require("../../Core/Database/MemberClaimSettings");
        let settings = await MemberClaimSettings.findOne({ guildID: interaction.guild.id });

        const modal = new ModalBuilder().setCustomId("panel_claim_modal").setTitle("Claim Limitlerini Düzenle");
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("req_voice").setLabel("Gereken Ses (Dakika)").setValue(String(settings.requiredVoice)).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("req_msg").setLabel("Gereken Mesaj").setValue(String(settings.requiredMessages)).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_reward").setLabel("XP Ödülü").setValue(String(settings.xpReward)).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("max_claims").setLabel("Maksimum Claim Sınırı").setValue(String(settings.maxClaims)).setStyle(TextInputStyle.Short))
        );
        await interaction.showModal(modal);
    }

    if (interaction.customId === "panel_claim_channel") {
        const row = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("panel_claim_channel_select")
                .setPlaceholder("Kanalı seçin...")
                .setChannelTypes(ChannelType.GuildText)
        );
        await interaction.reply({ content: "Lütfen claim loglarının gönderileceği kanalı seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_claim_channel_select") {
        const channelID = interaction.values[0];
        await ConfigManager.updateNested("Channels", "ClaimDropChannel", channelID, interaction.user.tag);
        await interaction.update({ content: `Claim bildirim kanalı başarıyla <#${channelID}> olarak ayarlandı.`, components: [] });
    }

    if (interaction.customId === "panel_claim_result_channel") {
        const row = new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("panel_claim_result_channel_select")
                .setPlaceholder("Kanalı seçin...")
                .setChannelTypes(ChannelType.GuildText)
        );
        await interaction.reply({ content: "Lütfen claim havuz duyurularının gönderileceği kanalı seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_claim_result_channel_select") {
        const channelID = interaction.values[0];
        await ConfigManager.updateNested("Channels", "ClaimLog", channelID, interaction.user.tag);
        await interaction.update({ content: `Claim sonuç log kanalı başarıyla <#${channelID}> olarak ayarlandı.`, components: [] });
    }

    if (interaction.isModalSubmit() && interaction.customId === "panel_claim_modal") {
        const voice = parseInt(interaction.fields.getTextInputValue("req_voice"));
        const msg = parseInt(interaction.fields.getTextInputValue("req_msg"));
        const xp = parseInt(interaction.fields.getTextInputValue("xp_reward"));
        const max = parseInt(interaction.fields.getTextInputValue("max_claims"));

        const MemberClaimSettings = require("../../Core/Database/MemberClaimSettings");
        await MemberClaimSettings.findOneAndUpdate(
            { guildID: interaction.guild.id },
            { $set: { requiredVoice: voice, requiredMessages: msg, xpReward: xp, maxClaims: max } },
            { upsert: true }
        );

        await interaction.reply({ content: "Claim ayarları başarıyla güncellendi.", flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_task_mgmt") {
        const tasks = await TaskSettings.find({ guildID: interaction.guild.id });
        const emojis = ConfigManager.get("Emojis") || {};

        const categorizedTasks = {};
        tasks.forEach(t => {
            if (!categorizedTasks[t.taskCategory]) categorizedTasks[t.taskCategory] = [];
            categorizedTasks[t.taskCategory].push(t);
        });

        let taskStr = "";
        for (const [category, list] of Object.entries(categorizedTasks)) {
            const listStr = list.map(t => `- **${t.taskName}**: \`${t.targetCount}\` adet -> \`${t.rewardXP} XP\``).join("\n");
            taskStr += `### 📂 Kategori: ${category}\n${listStr || "Görev yok"}\n`;
        }

        const componentsV2 = [
            {
                type: 17, 
                components: [
                    {
                        type: 9, 
                        accessory: {
                            type: 11,
                            media: { url: interaction.guild.iconURL({ dynamic: true }) || interaction.user.displayAvatarURL() }
                        },
                        components: [
                            {
                                type: 10,
                                content: `## ${emojis.toji_nokta || ""} Görev Yönetimi\n**Sistemin en önemli parçası olan görevleri buradan tanımlayabilir ve düzenleyebilirsiniz.**`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `${emojis.toji_nokta || "•"} **Otomatik Görevlendirme:** Yetkililere rütbelerine göre atanır.\n${emojis.toji_nokta || "•"} **Dinamik Atama:** İşlem yaptıkça yeni görevler tanımlanır.\n${emojis.toji_nokta || "•"} **XP Ödülü:** Tamamlanan her görev için XP verilir.\n\n### 📝 Mevcut Görevler\n${taskStr || "Henüz görev tanımı yapılmamış."}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1, 
                        components: [
                            { type: 2, custom_id: "panel_task_add", label: "Yeni Görev", style: 3 },
                            { type: 2, custom_id: "panel_task_edit_list", label: "Düzenle", style: 1 },
                            { type: 2, custom_id: "panel_task_remove_list", label: "Sil", style: 4 },
                            { type: 2, custom_id: "panel_task_cat_roles", label: "Kategori Rolleri", style: 1 },
                            { type: 2, custom_id: "panel_main", label: "Geri", style: 2 }
                        ]
                    }
                ]
            }
        ];

        await interaction.update({ embeds: [], components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.customId === "panel_task_remove_list") {
        const tasks = await TaskSettings.find({ guildID: interaction.guild.id });
        if (!tasks.length) return interaction.reply({ content: "Silinecek görev bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("panel_task_delete")
                .setPlaceholder("Silmek istediğiniz görevi seçin...")
                .addOptions(tasks.map(t => ({
                    label: t.taskName,
                    description: `Kategori: ${t.taskCategory} | XP: ${t.rewardXP}`,
                    value: t._id.toString()
                })))
        );

        await interaction.reply({ content: "Lütfen silmek istediğiniz görevi seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_task_cat_roles") {
        const options = [
            { label: "Ticket Sorumluları", value: "TicketStaff", description: "Ticket görevlerini kimlerin alabileceğini seçin." },
            { label: "Ticket Yöneticileri", value: "TicketManager", description: "Ticket silme/yönetme yetkisine sahip rolleri seçin." },
            { label: "Etkinlik Sorumluları", value: "EventManage", description: "Etkinlik başlatan-yöneten rolleri seçin." },
            { label: "Etkinlik Yöneticileri", value: "EventManager", description: "Etkinlik onayı veren rolleri seçin." },
            { label: "Partner Sorumluları", value: "Partner", description: "Partnerlik yapan rolleri seçin." },
            { label: "Partner Yöneticileri", value: "PartnerManager", description: "Partner sorumlusu olan rolleri seçin." },
            { label: "Alım Sorumluları", value: "Recruitment", description: "Yetkili alımı yapan rolleri seçin." },
            { label: "Alım Yöneticileri", value: "RecruitmentManager", description: "Alım ekibi yöneticilerini seçin." }
        ];

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("panel_task_cat_select")
                .setPlaceholder("Hangi kategorinin rollerini düzenlemek istiyorsunuz?")
                .addOptions(options)
        );

        await interaction.reply({ content: "Lütfen düzenlemek istediğiniz kategoriyi seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_task_cat_select") {
        const cat = interaction.values[0];
        const currentRoles = ConfigManager.get(`Roles.Responsibilities.${cat}`) || [];

        const row = {
            type: 1,
            components: [{
                type: 6, 
                custom_id: `panel_task_cat_roles_submit_${cat}`,
                placeholder: "Yetkili rolleri seçin (Birden fazla seçebilirsiniz)...",
                min_values: 0,
                max_values: 25
            }]
        };

        await interaction.reply({
            content: `**${cat}** kategorisi için yetkili rolleri seçin. Şu anki roller: ${currentRoles.length > 0 ? currentRoles.map(id => `<@&${id}>`).join(", ") : "Hiçbiri"}`,
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
    }

    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith("panel_task_cat_roles_submit_")) {
        const cat = interaction.customId.replace("panel_task_cat_roles_submit_", "");
        const roles = interaction.values;

        await ConfigManager.updateNested("Roles", `Responsibilities.${cat}`, roles, interaction.user.tag);
        await interaction.update({ content: `**${cat}** yetkili roller başarıyla güncellendi: ${roles.length > 0 ? roles.map(id => `<@&${id}>`).join(", ") : "Tümü temizlendi."}`, components: [] });
    }

    if (interaction.customId === "panel_task_edit_list") {
        const tasks = await TaskSettings.find({ guildID: interaction.guild.id });
        if (!tasks.length) return interaction.reply({ content: "Düzenlenecek görev bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("panel_task_edit_select")
                .setPlaceholder("Düzenlemek istediğiniz görevi seçin...")
                .addOptions(tasks.map(t => ({
                    label: t.taskName,
                    description: `Kategori: ${t.taskCategory} | XP: ${t.rewardXP}`,
                    value: t._id.toString()
                })))
        );

        await interaction.reply({ content: "Lütfen düzenlemek istediğiniz görevi seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_task_edit_select") {
        const taskID = interaction.values[0];
        const task = await TaskSettings.findById(taskID);

        if (!task) return interaction.reply({ content: "Görev bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const modal = new ModalBuilder().setCustomId(`panel_task_modal_edit_${taskID}`).setTitle("Görevi Düzenle");

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("task_name").setLabel("Görev Adı").setPlaceholder("Örn: 10 Üye Çek").setValue(task.taskName).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("task_cat").setLabel("Kategori (VOICE, MESSAGE, PUBLIC_VOICE, vb)").setValue(task.taskCategory).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("task_count").setLabel("Hedef Adet").setValue(String(task.targetCount)).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("task_xp").setLabel("Verilecek XP").setValue(String(task.rewardXP)).setStyle(TextInputStyle.Short))
        );

        await interaction.showModal(modal);
    }

    if (interaction.customId === "panel_task_delete") {
        const taskID = interaction.values[0];
        const task = await TaskSettings.findByIdAndDelete(taskID);

        if (task) {
            const StaffUser = require("../../Core/Database/StaffUser");
            await StaffUser.updateMany(
                { guildID: interaction.guild.id },
                { $pull: { activeTasks: { taskID: taskID } } }
            );
            await interaction.update({ content: `**${task.taskName}** görevi ve tüm aktif atamaları başarıyla silindi.`, components: [], flags: [MessageFlags.Ephemeral] });
        } else {
            await interaction.update({ content: "Görev bulunamadı.", components: [], flags: [MessageFlags.Ephemeral] });
        }
    }

    if (interaction.customId === "panel_task_clear") {
        await TaskSettings.deleteMany({ guildID: interaction.guild.id });
        const StaffUser = require("../../Core/Database/StaffUser");
        await StaffUser.updateMany({ guildID: interaction.guild.id }, { $set: { activeTasks: [] } });
        await interaction.reply({ content: "Tüm görevler başarıyla silindi ve mevcut görev atamaları temizlendi.", flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_task_add") {
        const { LabelBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

        const modal = new ModalBuilder().setCustomId("panel_task_modal_add").setTitle("Yeni Görev Tanımla");

        const nameLabel = new LabelBuilder()
            .setLabel("Görev Adı")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("task_name")
                    .setPlaceholder("Örn: 10 Üye Çek")
                    .setStyle(TextInputStyle.Short)
            );

        const categories = [
            { label: "Mesaj (MESSAGE)", value: "MESSAGE" },
            { label: "Ses (VOICE)", value: "VOICE" },
            { label: "Yayın (STREAM)", value: "STREAM" },
            { label: "Davet (INVITE)", value: "INVITE" },
            { label: "Destek (TICKET)", value: "TICKET" },
            { label: "Partner (PARTNER)", value: "PARTNER" },
            { label: "Bump (BUMP)", value: "BUMP" },
            { label: "Oy (VOTE)", value: "VOTE" },
            { label: "Yorum (REVIEW)", value: "REVIEW" },
            { label: "Etkinlik Yönetim (EVENT_MANAGE)", value: "EVENT_MANAGE" },
            { label: "Etkinlik Katılım (EVENT_PARTICIPATE)", value: "EVENT_PARTICIPATE" },
            { label: "Public Ses (PUBLIC_VOICE)", value: "PUBLIC_VOICE" },
            { label: "Thread/Forum (THREADS)", value: "THREADS" },
            { label: "Kanıt İnceleme (EVIDENCE)", value: "EVIDENCE" },
            { label: "Yetkili Alım (RECRUIT)", value: "RECRUIT" }
        ];

        const catLabel = new LabelBuilder()
            .setLabel("Görev Kategorisi")
            .setStringSelectMenuComponent(
                new StringSelectMenuBuilder()
                    .setCustomId("task_cat")
                    .setPlaceholder("Kategori seçiniz...")
                    .addOptions(categories.map(c => new StringSelectMenuOptionBuilder().setLabel(c.label).setValue(c.value)))
            );

        const countLabel = new LabelBuilder()
            .setLabel("Hedef Adet")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("task_count")
                    .setPlaceholder("Örn: 10")
                    .setStyle(TextInputStyle.Short)
            );

        const xpLabel = new LabelBuilder()
            .setLabel("Kazanılacak XP")
            .setTextInputComponent(
                new TextInputBuilder()
                    .setCustomId("task_xp")
                    .setPlaceholder("Örn: 500")
                    .setStyle(TextInputStyle.Short)
            );

        try {
            modal.addLabelComponents(nameLabel, catLabel, countLabel, xpLabel);
            await interaction.showModal(modal);
        } catch (err) {
            console.error("[PANEL_TASK_ADD] Modal açılırken hata:", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `Modal açılamadı: ${err.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === "panel_task_modal_add") {
        const name = interaction.fields.getTextInputValue("task_name");
        const catField = interaction.fields.fields.get("task_cat");
        const category = catField ? (catField.values?.[0] || catField.value) : null;
        const count = parseInt(interaction.fields.getTextInputValue("task_count"));
        const xp = parseInt(interaction.fields.getTextInputValue("task_xp"));

        if (isNaN(count) || isNaN(xp)) {
            return interaction.reply({ content: "HATA: Hedef adet ve XP sayısal değerler olmalıdır.", flags: [MessageFlags.Ephemeral] });
        }

        await TaskSettings.create({
            guildID: interaction.guild.id,
            taskName: name,
            taskCategory: category,
            targetCount: count,
            rewardXP: xp,
            isAuto: true,
            active: true
        });

        await interaction.reply({ content: `**${name}** görevi (${category}) başarıyla oluşturuldu.`, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("panel_task_modal_edit_")) {
        const taskID = interaction.customId.replace("panel_task_modal_edit_", "");
        const name = interaction.fields.getTextInputValue("task_name");
        const category = interaction.fields.getTextInputValue("task_cat").toUpperCase();
        const count = parseInt(interaction.fields.getTextInputValue("task_count"));
        const xp = parseInt(interaction.fields.getTextInputValue("task_xp"));

        if (isNaN(count) || isNaN(xp)) {
            return interaction.reply({ content: "HATA: Hedef adet ve XP sayısal değerler olmalıdır.", flags: [MessageFlags.Ephemeral] });
        }

        const task = await TaskSettings.findByIdAndUpdate(taskID, {
            $set: {
                taskName: name,
                taskCategory: category,
                targetCount: count,
                rewardXP: xp
            }
        }, { new: true });

        if (task) {
            await interaction.reply({ content: `**${task.taskName}** görevi başarıyla güncellendi.`, flags: [MessageFlags.Ephemeral] });
        } else {
            await interaction.reply({ content: "Görev bulunamadı veya güncellenemedi.", flags: [MessageFlags.Ephemeral] });
        }
    }

    if (interaction.customId === "panel_rank_mgmt") {
        const ranks = await StaffRoleSystem.find({ guildID: interaction.guild.id }).sort({ requiredXP: 1 });
        const emojis = ConfigManager.get("Emojis") || {};

        let rankStr = "";
        if (ranks.length) {
            rankStr = ranks.map(r => {
                const extraMarkup = r.extraRoles && r.extraRoles.length > 0 ? `\n  └─ 🎁 **Ek:** ${r.extraRoles.map(id => `<@&${id}>`).join(", ")}` : "";
                return `- **${r.rankName}**: <@&${r.roleID}> (\`${r.requiredXP} XP\`) [${r.autoPromotion ? `${emojis.toji_onay || "✅"} Otomatik` : "⚠️ Manuel"}]${extraMarkup}`;
            }).join("\n");
        } else {
            rankStr = "Henüz bir rütbe tanımı yapılmamış.";
        }

        const componentsV2 = [
            {
                type: 17, // Main Container
                components: [
                    {
                        type: 9, // Header Section
                        accessory: {
                            type: 11,
                            media: { url: interaction.guild.iconURL({ dynamic: true }) || interaction.user.displayAvatarURL() }
                        },
                        components: [
                            {
                                type: 10,
                                content: `## Rütbe & Rol Ayarları\n**Yetkililerin XP kazandıkça hangi rollere yükseleceğini buradan belirleyebilirsiniz.**`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `### 💎 Rütbe Mantığı\n${emojis.toji_nokta || "•"} **XP Eşiği:** Hak kazanma sınırı.\n${emojis.toji_nokta || "•"} **Otomatik:** Bot anında verir.\n${emojis.toji_nokta || "•"} **Manuel:** Yönetici onayı bekler.\n\n### 📂 Mevcut Hiyerarşi\n${rankStr}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1, // Action Row for buttons (V2 style inside/outside?)
                        components: [
                            { type: 2, custom_id: "panel_rank_add", label: "Yeni Rütbe", style: 3 }, // Success
                            { type: 2, custom_id: "panel_rank_edit_list", label: "Rütbeyi Düzenle", style: 1 }, // Primary
                            { type: 2, custom_id: "panel_rank_remove_list", label: "Rütbe Sil", style: 4 }, // Danger
                            { type: 2, custom_id: "panel_main", label: "Geri Dön", style: 2 } // Secondary
                        ]
                    }
                ]
            }
        ];

        await interaction.update({ embeds: [], components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.customId === "panel_rank_edit_list") {
        const ranks = await StaffRoleSystem.find({ guildID: interaction.guild.id });
        if (!ranks.length) return interaction.reply({ content: "Düzenlenecek rütbe bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("panel_rank_edit_select")
                .setPlaceholder("Düzenlemek istediğiniz rütbeyi seçin...")
                .addOptions(ranks.map(r => ({
                    label: r.rankName,
                    description: `XP: ${r.requiredXP}`,
                    value: r._id.toString()
                })))
        );

        await interaction.reply({ content: "Lütfen düzenlemek istediğiniz rütbeyi seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_rank_edit_select") {
        const rankID = interaction.values[0];
        const rank = await StaffRoleSystem.findById(rankID);

        if (!rank) return interaction.reply({ content: "Rütbe bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const modal = new ModalBuilder().setCustomId(`panel_rank_modal_edit_${rankID}`).setTitle("Rütbeyi Düzenle");

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rank_name").setLabel("Rütbe Adı").setValue(rank.rankName).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_id").setLabel("Rol ID").setValue(rank.roleID).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("req_xp").setLabel("Gereken XP").setValue(String(rank.requiredXP)).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("auto_promo").setLabel("Oto Atla? (1: Evet, 0: Hayır)").setValue(rank.autoPromotion ? "1" : "0").setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("max_srv_xp").setLabel("Maks Sunucu İş. XP").setValue(String(rank.maxServerXP || 0)).setStyle(TextInputStyle.Short))
        );

        await interaction.showModal(modal);
    }

    if (interaction.customId === "panel_rank_delete") {
        const rankID = interaction.values[0];
        const rank = await StaffRoleSystem.findByIdAndDelete(rankID);

        if (rank) {
            await interaction.update({ content: `**${rank.rankName}** rütbesi başarıyla silindi.`, components: [], flags: [MessageFlags.Ephemeral] });
        } else {
            await interaction.update({ content: "Rütbe bulunamadı.", components: [], flags: [MessageFlags.Ephemeral] });
        }
    }

    if (interaction.customId === "panel_rank_add") {
        const modal = new ModalBuilder().setCustomId("panel_rank_modal_add").setTitle("Yeni Rütbe Tanımla");

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("rank_name").setLabel("Rütbe Adı").setPlaceholder("Örn: Uzman Yetkili").setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("role_id").setLabel("Rol ID").setPlaceholder("ID giriniz").setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("req_xp").setLabel("Gereken XP").setPlaceholder("Örn: 5000").setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("auto_promo").setLabel("Oto Atla? (1: Evet, 0: Hayır)").setPlaceholder("1 veya 0 yazın").setStyle(TextInputStyle.Short).setValue("1")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("max_srv_xp").setLabel("Maks Sunucu İş. XP").setPlaceholder("Örn: 1000").setStyle(TextInputStyle.Short).setValue("0"))
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "panel_rank_modal_add") {
        const name = interaction.fields.getTextInputValue("rank_name");
        const roleID = interaction.fields.getTextInputValue("role_id");
        const xp = parseInt(interaction.fields.getTextInputValue("req_xp"));
        const autoPromo = interaction.fields.getTextInputValue("auto_promo") === "1";
        const maxSrvXP = parseInt(interaction.fields.getTextInputValue("max_srv_xp")) || 0;

        await StaffRoleSystem.create({
            guildID: interaction.guild.id,
            rankName: name,
            roleID: roleID,
            requiredXP: xp,
            autoPromotion: autoPromo,
            maxServerXP: maxSrvXP,
            extraRoles: [],
            active: true
        });

        await interaction.reply({ content: `**${name}** rütbesi (\`${xp} XP\`, Max Sunucu XP: \`${maxSrvXP}\`) başarıyla oluşturuldu.`, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("panel_rank_modal_edit_")) {
        const rankID = interaction.customId.replace("panel_rank_modal_edit_", "");
        const name = interaction.fields.getTextInputValue("rank_name");
        const roleID = interaction.fields.getTextInputValue("role_id");
        const xp = parseInt(interaction.fields.getTextInputValue("req_xp"));
        const autoPromo = interaction.fields.getTextInputValue("auto_promo") === "1";
        const maxSrvXP = parseInt(interaction.fields.getTextInputValue("max_srv_xp")) || 0;

        const rank = await StaffRoleSystem.findByIdAndUpdate(rankID, {
            $set: {
                rankName: name,
                roleID: roleID,
                requiredXP: xp,
                autoPromotion: autoPromo,
                maxServerXP: maxSrvXP
            }
        }, { new: true });

        if (rank) {
            await interaction.reply({ content: `**${rank.rankName}** rütbesi başarıyla güncellendi.`, flags: [MessageFlags.Ephemeral] });
        } else {
            await interaction.reply({ content: "Rütbe bulunamadı veya güncellenemedi.", flags: [MessageFlags.Ephemeral] });
        }
    }

    if (interaction.customId === "panel_main") {
        const emojis = ConfigManager.get("Emojis") || {};
        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: interaction.guild.iconURL({ dynamic: true }) || interaction.user.displayAvatarURL() }
                        },
                        components: [
                            {
                                type: 10,
                                content: `## ${emojis.toji_staff || ""} Yönetim Paneli\n**Yetkili sistemini buradan yönetebilirsiniz. Aşağıdaki butonları kullanarak istediğiniz kategoriye gidin.**`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `${emojis.toji_nokta || "•"} **Görev Yönetimi:** Rol bazlı görev havuzunu düzenleyin.\n` +
                            `${emojis.toji_nokta || "•"} **Rütbe Ayarları:** Temel rütbe seviyelerini ve XP şartlarını ayarlayın.\n` +
                            `${emojis.toji_nokta || "•"} **Rütbe Profili & Detay Yönetimi:** Bir rütbenin zorunlu görevlerini, XP çarpanlarını, sorumluluk rollerini ve limit/ceza ayarlarını tek bir ekrandan kolayca yönetin.\n` +
                            `${emojis.toji_nokta || "•"} **En İyi Yetkili:** Haftanın/İki haftanın en iyi yetkilisi sistemini ayarlayın.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_task_mgmt", label: "Görev Yönetimi", style: 1 },
                            { type: 2, custom_id: "panel_rank_mgmt", label: "Rütbe Ayarları", style: 1 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_rank_detail", label: "Rütbe Profili & Detay Yönetimi", style: 3 },
                            { type: 2, custom_id: "panel_claim_settings", label: "Claim Ayarları", style: 1 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_xp_give", label: "XP Dağıt / Ver", style: 3 },
                            { type: 2, custom_id: "panel_coin_give", label: "Coin Dağıt / Ver", style: 3 },
                            { type: 2, custom_id: "panel_staff_sync", label: "Rol Entegrasyonu (Sync)", style: 1 },
                            { type: 2, custom_id: "panel_best_staff", label: "Haftanın En İyi Yetkili Ayarları", style: 2 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_global_resp", label: "Sorumluluk Rolleri", style: 2 },
                            { type: 2, custom_id: "panel_global_stretch", label: "Esnetme Rolleri", style: 2 },
                            { type: 2, custom_id: "panel_global_xpmult", label: "Global XP Çarpanları", style: 2 }
                        ]
                    }
                ]
            }
        ];
        await interaction.update({ embeds: [], components: componentsV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
    }

    if (interaction.customId === "panel_staff_sync") {
        await interaction.deferReply({ ephemeral: true });
        const allRanks = await StaffRoleSystem.find({ guildID: interaction.guild.id, active: true }).sort({ requiredXP: 1 });
        if (!allRanks.length) return interaction.editReply({ content: "Hiç rütbe tanımlanmamış." });

        let fixedMemberCount = 0;
        let totalRolesFixed = 0;
        let totalStaffFound = 0;

        const allMembers = interaction.guild.members.cache.size >= interaction.guild.memberCount * 0.8 ? interaction.guild.members.cache : await interaction.guild.members.fetch();

        for (const [id, member] of allMembers) {
            if (member.user.bot) continue;

            const currentRIndex = [...allRanks].reverse().findIndex(r => member.roles.cache.has(r.roleID));

            if (currentRIndex !== -1) {
                totalStaffFound++;
                const actualRankIdx = allRanks.length - 1 - currentRIndex;

                let allRequiredExtraRoles = new Set();
                for (let i = 0; i <= actualRankIdx; i++) {
                    const rank = allRanks[i];
                    if (rank.extraRoles && rank.extraRoles.length > 0) {
                        rank.extraRoles.forEach(rID => allRequiredExtraRoles.add(rID));
                    }
                }

                if (allRequiredExtraRoles.size > 0) {
                    const missing = Array.from(allRequiredExtraRoles).filter(rID => !member.roles.cache.has(rID));
                    if (missing.length > 0) {
                        try {
                            await member.roles.add(missing);
                            fixedMemberCount++;
                            totalRolesFixed += missing.length;
                        } catch (err) {
                            console.error(`[SYNC] ${member.user.tag} için kümülatif rol eklenemedi:`, err.message);
                        }
                    }
                }
            }
        }
        await interaction.editReply({ content: `**Kümülatif Rol Entegrasyonu Tamamlandı!**\n> Taranan Yetkili: \`${totalStaffFound}\` \n> Güncellenen Üye: \`${fixedMemberCount}\` \n> Tanımlanan Toplam Rol: \`${totalRolesFixed}\` \n\n*Not: Yetkililerin şu anki rütbesi ve altındaki tüm rütbelere ait "Milestone/Ek" roller kontrol edilip eksikler tamamlandı.*` });
    }

    if (interaction.customId === "panel_xp_give") {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("panel_xp_target_select")
                .setPlaceholder("XP kime verilecek?")
                .addOptions([
                    { label: "Kullanıcı", value: "USER", description: "Tek kişiye XP verir.", emoji: "👤" },
                    { label: "Rol", value: "ROLE", description: "Roldaki herkese XP verir.", emoji: "👥" },
                    { label: "Herkes", value: "EVERYONE", description: "Tüm yetkililere XP verir.", emoji: "🌐" }
                ])
        );
        await interaction.reply({ content: "**XP Dağıtım Sistemi**\nLütfen hedef kitleyi seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_xp_target_select") {
        const target = interaction.values[0];
        if (target === "USER") {
            const { UserSelectMenuBuilder } = require("discord.js");
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder().setCustomId("panel_xp_select_user").setPlaceholder("Kullanıcıyı seçin...").setMinValues(1).setMaxValues(1)
            );
            await interaction.update({ content: "XP verilecek kullanıcıyı seçin:", components: [row], embeds: [] });
        } else if (target === "ROLE") {
            const { RoleSelectMenuBuilder } = require("discord.js");
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder().setCustomId("panel_xp_select_role").setPlaceholder("Rolü seçin...").setMinValues(1).setMaxValues(1)
            );
            await interaction.update({ content: "XP dağıtılacak rolü seçin:", components: [row], embeds: [] });
        } else if (target === "EVERYONE") {
            const modal = new ModalBuilder().setCustomId("panel_xp_give_modal_EVERYONE").setTitle("Global XP Dağıtımı");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_amount").setLabel("Miktar (Örn: 500 veya %10)").setPlaceholder("500").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("is_server_op").setLabel("Sunucu İşi XP mi? (1: Evet, 0: Hayır)").setValue("0").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_reason").setLabel("Sebep").setPlaceholder("Etkinlik bonusu vb.").setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isUserSelectMenu() && interaction.customId === "panel_xp_select_user") {
        const userID = interaction.values[0];
        const modal = new ModalBuilder().setCustomId(`panel_xp_give_modal_USER_${userID}`).setTitle("XP Ver");
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_amount").setLabel("Miktar (Örn: 500 veya %10)").setPlaceholder("500").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("is_server_op").setLabel("Sunucu İşi XP mi? (1: Evet, 0: Hayır)").setValue("0").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_reason").setLabel("Sebep").setPlaceholder("Manuel bonus vb.").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === "panel_xp_select_role") {
        const roleID = interaction.values[0];
        const modal = new ModalBuilder().setCustomId(`panel_xp_give_modal_ROLE_${roleID}`).setTitle("Role XP Ver");
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_amount").setLabel("Miktar (Örn: 500 veya %10)").setPlaceholder("500").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("is_server_op").setLabel("Sunucu İşi XP mi? (1: Evet, 0: Hayır)").setValue("0").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("xp_reason").setLabel("Sebep").setPlaceholder("Rol telafisi vb.").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.customId === "panel_best_staff" || interaction.customId === "panel_bs_refresh") {
        const emojis = ConfigManager.get("Emojis") || {};
        
        const currentChannel = ConfigManager.get("BestStaff.Channel");
        const currentRole = ConfigManager.get("BestStaff.RewardRole");
        const currentHour = ConfigManager.get("BestStaff.Hour") || "20:00";
        const currentXP = ConfigManager.get("BestStaff.RewardXP") || 0;
        const currentMult = ConfigManager.get("BestStaff.Multiplier") || 1.0;
        const currentCoin = ConfigManager.get("BestStaff.RewardCoin") || 0;

        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: interaction.guild.iconURL({ dynamic: true }) || interaction.user.displayAvatarURL() }
                        },
                        components: [
                            { type: 10, content: `## ${emojis.toji_sparkly || "✨"} En İyi Yetkili Ayarları\n**Her iki haftada bir seçilecek olan şampiyon yetkilinin sistemini buradan yönetin.**` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `### 🎁 Kazanılacak Ödüller` },
                    {
                        type: 9,
                        accessory: { type: 2, custom_id: "panel_bs_edit_xp", label: "Veriyi Ayarla", style: 2 },
                        components: [{ type: 10, content: `${emojis.toji_nokta || "•"} **Direkt XP Ödülü:** \`${currentXP}\`` }]
                    },
                    {
                        type: 9,
                        accessory: { type: 2, custom_id: "panel_bs_edit_xpmult", label: "Veriyi Ayarla", style: 2 },
                        components: [{ type: 10, content: `${emojis.toji_nokta || "•"} **XP Çarpanı Ödülü:** \`x${currentMult}\`` }]
                    },
                    {
                        type: 9,
                        accessory: { type: 2, custom_id: "panel_bs_edit_coin", label: "Veriyi Ayarla", style: 2 },
                        components: [{ type: 10, content: `${emojis.toji_nokta || "•"} **Coin Miktarı:** \`${currentCoin}\`` }]
                    },
                    {
                        type: 9,
                        accessory: { type: 2, custom_id: "panel_bs_edit_hour", label: "Veriyi Ayarla", style: 2 },
                        components: [{ type: 10, content: `${emojis.toji_nokta || "•"} **Sistem Saati (Pzt):** \`${currentHour}\`` }]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `### ⚙️ Kanal ve Rol Seçimi` },
                    {
                        type: 1,
                        components: [
                            { 
                                type: 8, 
                                custom_id: "panel_best_staff_channel", 
                                placeholder: "Duyuru Kanalını Seçin...", 
                                channel_types: [0],
                                ...(currentChannel ? { default_values: [{ id: currentChannel, type: "channel" }] } : {})
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { 
                                type: 6, 
                                custom_id: "panel_best_staff_role", 
                                placeholder: "Ödül Rolünü Seçin...",
                                ...(currentRole ? { default_values: [{ id: currentRole, type: "role" }] } : {})
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_main", label: "Geri Dön", style: 2 }
                        ]
                    }
                ]
            }
        ];

        await interaction.update({ embeds: [], components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.customId === "panel_bs_edit_xp") {
        const modal = new ModalBuilder().setCustomId("panel_modal_bs_xp").setTitle("Direkt XP Ayarı");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("val").setLabel("Miktar").setValue(String(ConfigManager.get("BestStaff.RewardXP") || 0)).setStyle(TextInputStyle.Short)));
        await interaction.showModal(modal);
    }
    if (interaction.customId === "panel_bs_edit_xpmult") {
        const modal = new ModalBuilder().setCustomId("panel_modal_bs_xpmult").setTitle("XP Çarpanı Ayarı");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("val").setLabel("Çarpan (Örn: 1.5)").setValue(String(ConfigManager.get("BestStaff.Multiplier") || 1.0)).setStyle(TextInputStyle.Short)));
        await interaction.showModal(modal);
    }
    if (interaction.customId === "panel_bs_edit_coin") {
        const modal = new ModalBuilder().setCustomId("panel_modal_bs_coin").setTitle("Coin Miktarı Ayarı");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("val").setLabel("Miktar").setValue(String(ConfigManager.get("BestStaff.RewardCoin") || 0)).setStyle(TextInputStyle.Short)));
        await interaction.showModal(modal);
    }
    if (interaction.customId === "panel_bs_edit_hour") {
        const modal = new ModalBuilder().setCustomId("panel_modal_bs_hour").setTitle("Çalışma Saati Ayarı");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("val").setLabel("Saat (Örn: 20:00)").setValue(String(ConfigManager.get("BestStaff.Hour") || "20:00")).setStyle(TextInputStyle.Short)));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("panel_modal_bs_")) {
        const val = interaction.fields.getTextInputValue("val");
        if (interaction.customId === "panel_modal_bs_xp") await ConfigManager.updateNested("BestStaff", "RewardXP", parseInt(val) || 0, interaction.user.tag);
        else if (interaction.customId === "panel_modal_bs_xpmult") await ConfigManager.updateNested("BestStaff", "Multiplier", parseFloat(val) || 1.0, interaction.user.tag);
        else if (interaction.customId === "panel_modal_bs_coin") await ConfigManager.updateNested("BestStaff", "RewardCoin", parseInt(val) || 0, interaction.user.tag);
        else if (interaction.customId === "panel_modal_bs_hour") await ConfigManager.updateNested("BestStaff", "Hour", val, interaction.user.tag);

        interaction.customId = "panel_bs_refresh";
        return module.exports(interaction);
    }

    if (interaction.customId === "panel_best_staff_channel") {
        const channelID = interaction.values[0];
        await ConfigManager.updateNested("BestStaff", "Channel", channelID, interaction.user.tag);
        interaction.customId = "panel_bs_refresh";
        return module.exports(interaction);
    }

    if (interaction.customId === "panel_best_staff_role") {
        const roleID = interaction.values[0];
        await ConfigManager.updateNested("BestStaff", "RewardRole", roleID, interaction.user.tag);
        interaction.customId = "panel_bs_refresh";
        return module.exports(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("panel_xp_give_modal_")) {
        const parts = interaction.customId.split("_");
        const type = parts[4]; 
        const targetID = parts[5]; 

        const amountStr = interaction.fields.getTextInputValue("xp_amount").trim();
        const reason = interaction.fields.getTextInputValue("xp_reason");
        const isServerOpField = interaction.fields.getTextInputValue("is_server_op");
        const isServerOp = isServerOpField === "1";
        const isPercent = amountStr.startsWith("%");
        const amountVal = parseFloat(amountStr.replace("%", ""));

        if (isNaN(amountVal)) return interaction.reply({ content: "Geçersiz XP miktarı.", flags: [MessageFlags.Ephemeral] });

        await interaction.deferReply({ ephemeral: true });

        const XPManager = require("../../Core/Handlers/XPManager");
        const allRanks = await StaffRoleSystem.find({ guildID: interaction.guild.id, active: true }).sort({ requiredXP: 1 });
        const staffRoleIDs = allRanks.map(r => r.roleID);

        let targets = [];
        if (type === "USER") {
            const member = await interaction.guild.members.fetch(targetID).catch(() => null);
            if (member) targets.push(member);
        } else if (type === "ROLE") {
            const roleMembers = interaction.guild.members.cache.size >= interaction.guild.memberCount * 0.8 ? interaction.guild.members.cache : await interaction.guild.members.fetch();
            targets = Array.from(roleMembers.values()).filter(m => m.roles.cache.has(targetID) && !m.user.bot);
        } else if (type === "EVERYONE") {
            const allMembers = interaction.guild.members.cache.size >= interaction.guild.memberCount * 0.8 ? interaction.guild.members.cache : await interaction.guild.members.fetch();
            targets = Array.from(allMembers.values()).filter(m => staffRoleIDs.some(rid => m.roles.cache.has(rid)) && !m.user.bot);
        }

        let totalGivenCount = 0;
        for (const member of targets) {
            let finalXP = amountVal;
            if (isPercent) {
                const currentRank = [...allRanks].reverse().find(r => member.roles.cache.has(r.roleID));
                const xpRequirement = currentRank ? currentRank.requiredXP : 1000;
                finalXP = (xpRequirement * (amountVal / 100));
            }

            if (isServerOp) {
                const currentRank = [...allRanks].reverse().find(r => member.roles.cache.has(r.roleID));
                const maxSXP = currentRank ? (currentRank.maxServerXP || 0) : 0;
                const StaffUser = require("../../Core/Database/StaffUser");
                let userData = await StaffUser.findOne({ guildID: interaction.guild.id, userID: member.id });
                if (!userData) {
                    userData = await StaffUser.create({ guildID: interaction.guild.id, userID: member.id });
                }
                const currentSXP = userData.serverOperationXP || 0;
                let availableSXP = Math.max(0, maxSXP - currentSXP);

                if (finalXP > availableSXP) {
                    finalXP = availableSXP;
                }

                if (finalXP > 0) {
                    userData.serverOperationXP = currentSXP + finalXP;
                    await userData.save();
                    await XPManager.addXP(interaction.guild, member, finalXP, `PANEL_XP (Sunucu İşi): ${reason} (Admin: ${interaction.user.tag})`, userData);
                    totalGivenCount++;
                }
            } else {
                await XPManager.addXP(interaction.guild, member, finalXP, `PANEL_XP: ${reason} (Admin: ${interaction.user.tag})`);
                totalGivenCount++;
            }
        }

        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: interaction.user.displayAvatarURL({ dynamic: true }) } },
                        components: [{
                            type: 10,
                            content: `> ## ${emojis.toji_onay || ""} XP Dağıtımı Başarılı!\n` +
                                `> ${emojis.toji_nokta || ""} **Hedef:** \`${type === "EVERYONE" ? "Tüm Yetkililer" : type === "ROLE" ? "Rol Üyeleri" : "Tekil Kullanıcı"}\` ${targetID ? (type === "USER" ? `(<@${targetID}>)` : `(<@&${targetID}>)`) : ""}\n` +
                                `> ${emojis.toji_nokta || ""} **Miktar:** \`${amountStr}\` XP\n` +
                                `> ${emojis.toji_nokta || ""} **Etkilenen:** \`${totalGivenCount}\` Üye\n` +
                                `> ${emojis.toji_nokta || ""} **Sebep:** \`${reason}\``.trim()
                        }]
                    }
                ]
            }
        ];

        await interaction.editReply({ content: null, embeds: [], components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.customId === "panel_coin_give") {
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("panel_coin_target_select")
                .setPlaceholder("Coin kime verilecek?")
                .addOptions([
                    { label: "Kullanıcı", value: "USER", description: "Tek kişiye coin verir.", emoji: "👤" },
                    { label: "Rol", value: "ROLE", description: "Roldaki herkese coin verir.", emoji: "👥" },
                    { label: "Herkes", value: "EVERYONE", description: "Sunucudaki herkese coin verir.", emoji: "🌐" }
                ])
        );
        await interaction.reply({ content: "**Coin Dağıtım Sistemi**\nLütfen hedef kitleyi seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "panel_coin_target_select") {
        const target = interaction.values[0];
        if (target === "USER") {
            const { UserSelectMenuBuilder } = require("discord.js");
            const row = new ActionRowBuilder().addComponents(
                new UserSelectMenuBuilder().setCustomId("panel_coin_select_user").setPlaceholder("Kullanıcıyı seçin...").setMinValues(1).setMaxValues(1)
            );
            await interaction.update({ content: "Coin verilecek kullanıcıyı seçin:", components: [row], embeds: [] });
        } else if (target === "ROLE") {
            const { RoleSelectMenuBuilder } = require("discord.js");
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder().setCustomId("panel_coin_select_role").setPlaceholder("Rolü seçin...").setMinValues(1).setMaxValues(1)
            );
            await interaction.update({ content: "Coin dağıtılacak rolü seçin:", components: [row], embeds: [] });
        } else if (target === "EVERYONE") {
            const modal = new ModalBuilder().setCustomId("panel_coin_give_modal_EVERYONE").setTitle("Global Coin Dağıtımı");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("coin_amount").setLabel("Miktar (Örn: 500)").setPlaceholder("500").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("coin_reason").setLabel("Sebep").setPlaceholder("Etkinlik ödülü vb.").setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isUserSelectMenu() && interaction.customId === "panel_coin_select_user") {
        const userID = interaction.values[0];
        const modal = new ModalBuilder().setCustomId(`panel_coin_give_modal_USER_${userID}`).setTitle("Coin Ver");
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("coin_amount").setLabel("Miktar (Örn: 500)").setPlaceholder("500").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("coin_reason").setLabel("Sebep").setPlaceholder("Manuel bonus vb.").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal).catch(() => {});
    }

    if (interaction.isRoleSelectMenu() && interaction.customId === "panel_coin_select_role") {
        const roleID = interaction.values[0];
        const modal = new ModalBuilder().setCustomId(`panel_coin_give_modal_ROLE_${roleID}`).setTitle("Role Coin Ver");
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("coin_amount").setLabel("Miktar (Örn: 500)").setPlaceholder("500").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("coin_reason").setLabel("Sebep").setPlaceholder("Rol telafisi vb.").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("panel_coin_give_modal_")) {
        const parts = interaction.customId.split("_");
        const type = parts[4]; 
        const targetID = parts[5]; 

        const amountStr = interaction.fields.getTextInputValue("coin_amount").trim();
        const reason = interaction.fields.getTextInputValue("coin_reason");
        const amountVal = parseFloat(amountStr);

        if (isNaN(amountVal)) return interaction.reply({ content: "Geçersiz coin miktarı.", flags: [MessageFlags.Ephemeral] });

        await interaction.deferReply({ ephemeral: true });

        const Economy = require("../../Core/Database/Economy");
        const coinEmoji = ConfigManager.get("Economy.CurrencyEmoji") || "🪙";
        const coinName = ConfigManager.get("Economy.CurrencyName") || "Coin";

        let targets = [];
        if (type === "USER") {
            const member = await interaction.guild.members.fetch(targetID).catch(() => null);
            if (member && !member.user.bot) targets.push(member);
        } else if (type === "ROLE") {
            const roleMembers = interaction.guild.members.cache.size >= interaction.guild.memberCount * 0.8 ? interaction.guild.members.cache : await interaction.guild.members.fetch();
            targets = Array.from(roleMembers.values()).filter(m => m.roles.cache.has(targetID) && !m.user.bot);
        } else if (type === "EVERYONE") {
            const allMembers = interaction.guild.members.cache.size >= interaction.guild.memberCount * 0.8 ? interaction.guild.members.cache : await interaction.guild.members.fetch();
            targets = Array.from(allMembers.values()).filter(m => !m.user.bot);
        }

        let totalGivenCount = 0;
        for (const member of targets) {
            await Economy.findOneAndUpdate(
                { guildID: interaction.guild.id, userID: member.id },
                { $inc: { coin: amountVal } },
                { upsert: true }
            );
            totalGivenCount++;
        }

        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: interaction.user.displayAvatarURL({ dynamic: true }) } },
                        components: [{
                            type: 10,
                            content: `> ## ${emojis.toji_onay || ""} ${coinName} Dağıtımı Başarılı!\n` +
                                `> ${emojis.toji_nokta || ""} **Hedef:** \`${type === "EVERYONE" ? "Herkes" : type === "ROLE" ? "Rol Üyeleri" : "Tekil Kullanıcı"}\` ${targetID ? (type === "USER" ? `(<@${targetID}>)` : `(<@&${targetID}>)`) : ""}\n` +
                                `> ${emojis.toji_nokta || ""} **Miktar:** \`${amountStr}\` ${coinEmoji}\n` +
                                `> ${emojis.toji_nokta || ""} **Etkilenen:** \`${totalGivenCount}\` Üye\n` +
                                `> ${emojis.toji_nokta || ""} **Sebep:** \`${reason}\``.trim()
                        }]
                    }
                ]
            }
        ];

        await interaction.editReply({ content: null, embeds: [], components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    }
};
