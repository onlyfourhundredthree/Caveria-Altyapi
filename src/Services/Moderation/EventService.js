const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, MessageFlags, GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const ScheduledEvent = require("../../Core/Database/ScheduledEvent");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class EventService {
    static async renderMainMenu(interactionOrMessage) {
        // İzin Kontrolleri
        const member = interactionOrMessage.member;
        const eventManageRoles = ConfigManager.get("Roles.Responsibilities.EventManage") || [];
        const isOwner = ConfigManager.isOwner(member || interactionOrMessage.author || interactionOrMessage.user);
        const isAdmin = member?.permissions?.has("Administrator") || false;
        const hasEventRole = eventManageRoles.some(roleID => member?.roles?.cache?.has(roleID));

        if (!isOwner && !isAdmin && !hasEventRole) {
            const errorMsg = "Bu işlemi sadece Etkinlik Yöneticileri yapabilir.";
            if (interactionOrMessage.author) { // Mesaj
                return interactionOrMessage.reply({ content: errorMsg }).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 5000));
            } else { // Interaction
                return interactionOrMessage.reply({ content: errorMsg, flags: [MessageFlags.Ephemeral] });
            }
        }

        // Eski veya iptal edilmiş çöpleri temizle
        await ScheduledEvent.deleteMany({ isCancelled: true });

        // Sadece bitmemiş ve iptal edilmemiş etkinlikleri getir
        const activeEvents = await ScheduledEvent.find({ isFinished: false, isCancelled: { $ne: true } }).sort({ createdAt: -1 });
        const emojis = ConfigManager.get("Emojis") || {};
        
        let extraMessage = "Etkinlik Sistemini ve aktif etkinliklerinizi bu menüden kontrol edebilirsiniz.";

        const options = activeEvents.map(e => {
            const status = e.isCancelled ? "İptal Edildi" : e.isStarted ? "Aktif" : "Beklemede";
            return {
                label: (e.eventName || "İsimsiz").substring(0, 50),
                value: e._id.toString(),
                description: `Durum: ${status}`,
                emoji: e.isStarted ? { name: "🟢" } : { name: "⏳" }
            };
        });

        if (options.length > 25) options.length = 25;

        const panel = new V2PanelBuilder();
        panel.addText(`> ## ${emojis.maravilha_etkinlik || "🎉"} Etkinlik Yönetim Paneli\n> -# ${extraMessage}`);
        panel.addDivider(1);

        if (options.length > 0) {
            const selectRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("event_manage_select")
                    .setPlaceholder("Ayarlamak istediğiniz etkinliği seçin...")
                    .addOptions(options)
            );
            panel.addActionRow(selectRow);
        } else {
            panel.addText("\n*Şu anda aktif veya planlanmış bir etkinlik bulunmuyor.*");
        }

        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("event_draft_create")
                .setLabel("Yeni Etkinlik Oluştur")
                .setStyle(ButtonStyle.Success)
                .setEmoji("➕")
        );
        panel.addActionRow(btnRow);

        const v2Components = panel.toJSON();
        const isMsg = !!interactionOrMessage.author;
        
        if (isMsg) { // Mesaj ise
            return interactionOrMessage.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
        } else { // Interaction ise
            if (interactionOrMessage.isCommand && interactionOrMessage.isCommand()) { // Slash Command
                return interactionOrMessage.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
            } else { // Buton, Select Menu vb.
                return interactionOrMessage.update({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {
                    return interactionOrMessage.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(()=>{});
                });
            }
        }
    }

    static async renderEventSettingsPanel(interaction, event, options = {}) {
        const { isFirstReply = false } = options;
        const emojis = ConfigManager.get("Emojis") || {};

        const status = event.isFinished
            ? `${emojis.toji_iptal || "❌"} Sona Erdi`
            : event.isCancelled
                ? `${emojis.toji_iptal || "❌"} İptal Edildi`
                : event.isStarted
                    ? `${emojis.toji_onay || "✅"} Devam Ediyor`
                    : `${emojis.maravilha_bekleme || "⏳"} Planlandı (Taslak)`;

        const scheduleTimeStr = event.scheduleTime ? `<t:${Math.floor(new Date(event.scheduleTime).getTime() / 1000)}:R>` : "Belirtilmemiş";
        const startedAtStr = event.startedAt ? `<t:${Math.floor(new Date(event.startedAt).getTime() / 1000)}:R>` : "Henüz başlamadı";
        const managerStr = event.managerID ? `<@${event.managerID}>` : "Belirtilmemiş";
        const mainChannelStr = event.channelID ? `<#${event.channelID}>` : "Belirtilmemiş";
        const annChannelStr = event.announcementChannelID ? `<#${event.announcementChannelID}>` : "Belirtilmemiş";

        const panel = new V2PanelBuilder();
        panel.addText(`> ## ${emojis.maravilha_etkinlik || "🎉"} Etkinlik Ayar Paneli\n> -# Tüm ayarları bu sayfadan yapabilirsiniz.`);
        panel.addDivider(1);
        panel.addText(`**Durum:** ${status}\n**Etkinlik Adı:** ${event.eventName}\n**Yönetici:** ${managerStr}\n**Ana Kanal:** ${mainChannelStr}\n**Duyuru Kanalı:** ${annChannelStr}\n**Zaman:** ${scheduleTimeStr}\n**Başlangıç:** ${startedAtStr}\n**Otomatik Duyuru:** ${event.autoAnnounce ? (emojis.toji_onay || "✅") : (emojis.toji_iptal || "❌")}\n**Sağırlık Kontrolü:** ${event.deafenCheck ? (emojis.toji_onay || "✅") : (emojis.toji_iptal || "❌")}`);

        const canEdit = !event.isStarted && !event.isFinished && !event.isCancelled;

        const buttons = [];
        if (canEdit) {
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_info`).setLabel("Detay/Açıklama").setStyle(ButtonStyle.Secondary).setEmoji("📝"));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_toggledeafen`).setLabel(event.deafenCheck ? "Sağırlık Kon. Kapat" : "Sağırlık Kon. Aç").setStyle(event.deafenCheck ? ButtonStyle.Danger : ButtonStyle.Success));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_toggleauto`).setLabel(event.autoAnnounce ? "Oto Duyuru Kapat" : "Oto Duyuru Aç").setStyle(event.autoAnnounce ? ButtonStyle.Danger : ButtonStyle.Success));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_savetpl`).setLabel("Şablon Kaydet").setStyle(ButtonStyle.Primary).setEmoji("💾"));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_start`).setLabel("Duyur ve Başlat").setStyle(ButtonStyle.Success).setEmoji("▶️"));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_cancel`).setLabel("İptal Et/Sil").setStyle(ButtonStyle.Danger).setEmoji("🗑️"));
        } else if (event.isStarted) {
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_finish`).setLabel("Etkinliği Bitir").setStyle(ButtonStyle.Danger).setEmoji("⏹️"));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_subchan`).setLabel("Alt Kanal Ekle/Sil").setStyle(ButtonStyle.Secondary).setEmoji("🔊"));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_manager`).setLabel("Yönetici Değiştir").setStyle(ButtonStyle.Secondary).setEmoji("👑"));
            buttons.push(new ButtonBuilder().setCustomId(`event_${event._id}_participants`).setLabel("Aktif Katılımcılar").setStyle(ButtonStyle.Primary).setEmoji("👥"));
            buttons.push(new ButtonBuilder().setCustomId(`event_manage_back`).setLabel("Geri Dön").setStyle(ButtonStyle.Secondary).setEmoji("↩️"));
        } else {
            buttons.push(new ButtonBuilder().setCustomId(`event_dummy_closed`).setLabel("Sona Erdi").setStyle(ButtonStyle.Secondary).setDisabled(true));
            buttons.push(new ButtonBuilder().setCustomId(`event_manage_back`).setLabel("Geri Dön").setStyle(ButtonStyle.Secondary).setEmoji("↩️"));
        }

        let row = new ActionRowBuilder();
        for (let i = 0; i < buttons.length; i++) {
            row.addComponents(buttons[i]);
            if (row.components.length === 5 || i === buttons.length - 1) {
                panel.addActionRow(row);
                row = new ActionRowBuilder();
            }
        }

        if (canEdit) {
            const { UserSelectMenuBuilder } = require("discord.js");
            if (UserSelectMenuBuilder) {
                panel.addActionRow(new ActionRowBuilder().addComponents(
                    new UserSelectMenuBuilder().setCustomId(`event_${event._id}_manager`).setPlaceholder("Etkinlik Yöneticisi Seç")
                ));
            } else {
                panel.addActionRow({ type: 1, components: [{ type: 5, custom_id: `event_${event._id}_manager`, placeholder: "Etkinlik Yöneticisi Seç" }] });
            }

            panel.addActionRow(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`event_${event._id}_mainchan`)
                        .setPlaceholder("Ana Etkinlik Kanalı (Ses)")
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                )
            );
            
            panel.addActionRow(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`event_${event._id}_subselect`)
                        .setPlaceholder("Alt Kanalları Seç (Çoklu - Opsiyonel)")
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setMinValues(1)
                        .setMaxValues(10)
                )
            );

            panel.addActionRow(
                new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId(`event_${event._id}_annchan`)
                        .setPlaceholder("Duyuru Kanalı Seç")
                        .addChannelTypes(ChannelType.GuildText)
                )
            );
            
            try {
                const EventTemplate = require("../../Core/Database/EventTemplate");
                const templates = await EventTemplate.find({}).limit(25).sort({ CreatedAt: -1 });
                if (templates.length > 0) {
                    const tplOptions = templates.map(t => ({
                        label: t.TemplateName.substring(0, 100),
                        description: (t.EventName || "İsimsiz Şablon").substring(0, 100),
                        value: t._id.toString(),
                        emoji: "📂"
                    }));
                    
                    const { StringSelectMenuBuilder } = require("discord.js");
                    panel.addActionRow(
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`event_${event._id}_loadtpl`)
                                .setPlaceholder("📂 Kayıtlı Şablon Yükle (Ortak Havuz)")
                                .addOptions(tplOptions)
                        )
                    );
                }
            } catch (e) {
                console.error("[EventService] Error loading templates:", e);
            }
        }

        const v2Components = panel.toJSON();

        try {
            // "Tek Mesaj Üzerinden Gitme" mantığı: Panel her zaman var olan mesajı günceller
            if (interaction.replied || interaction.deferred) {
                return interaction.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } else {
                return interaction.update({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {
                    if (interaction.replied || interaction.deferred) {
                        return interaction.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(()=>{});
                    } else {
                        return interaction.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(()=>{});
                    }
                });
            }
        } catch (err) {
            console.error("[EventService] Render error:", err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "Panel güncellenirken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
        }
    }

    static async startAndCreateDiscordEvent(interaction, event) {
        if (!event.channelID) return { success: false, msg: "Etkinlik kanalı belirtilmemiş! (Önce Ana Ses kanalını ayarlayın)" };
        
        try {
            const startTime = event.scheduleTime ? new Date(event.scheduleTime) : new Date(Date.now() + 60000);
            if (startTime.getTime() <= Date.now()) {
                startTime.setTime(Date.now() + 60000); 
            }
            const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000));
            
            let imageBase64 = null;
            if (event.coverImage) {
                try {
                    const response = await fetch(event.coverImage);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const inputBuffer = Buffer.from(arrayBuffer);
                        const img = await loadImage(inputBuffer);

                        const targetWidth = 800;
                        const targetHeight = 450;
                        const canvas = createCanvas(targetWidth, targetHeight);
                        const ctx = canvas.getContext("2d");

                        ctx.fillStyle = "#111214";
                        ctx.fillRect(0, 0, targetWidth, targetHeight);

                        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
                        const x = (targetWidth - (img.width * scale)) / 2;
                        const y = (targetHeight - (img.height * scale)) / 2;

                        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                        const pngBuffer = canvas.toBuffer("image/png");
                        imageBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
                    }
                } catch (e) {
                    console.error("[EventService] Canvas Cover Image Auto-Resize Error:", e);
                }
            }
            
            const targetChannel = interaction.guild.channels.cache.get(event.channelID);
            const isStage = targetChannel && targetChannel.type === ChannelType.GuildStageVoice;
            
            let guildEvent = null;
            try {
                guildEvent = await interaction.guild.scheduledEvents.create({
                    name: (event.eventName || "Etkinlik").substring(0, 100),
                    scheduledStartTime: startTime,
                    scheduledEndTime: endTime,
                    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
                    entityType: isStage ? GuildScheduledEventEntityType.StageInstance : GuildScheduledEventEntityType.Voice,
                    channel: event.channelID,
                    description: event.eventDescription || null,
                    image: imageBase64
                });
            } catch (createErr) {
                if (imageBase64) {
                    console.warn("[EventService] Scheduled event creation failed with image, retrying without image:", createErr);
                    guildEvent = await interaction.guild.scheduledEvents.create({
                        name: (event.eventName || "Etkinlik").substring(0, 100),
                        scheduledStartTime: startTime,
                        scheduledEndTime: endTime,
                        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
                        entityType: isStage ? GuildScheduledEventEntityType.StageInstance : GuildScheduledEventEntityType.Voice,
                        channel: event.channelID,
                        description: event.eventDescription || null,
                        image: null
                    });
                } else {
                    throw createErr;
                }
            }

            event.discordEventID = guildEvent.id;
            await event.save();
            return { success: true, guildEvent, startTime };
        } catch (err) {
            console.error("[EventService] Discord Event Oluşturma Hatası:", err);
            await interaction.channel.send({ content: `❌ **Discord Takvim Etkinliği Oluşturulurken Hata Çıktı!**\nNedeni: \`${err.message}\`` }).catch(()=>{});
            return { success: false, msg: "Discord Sunucu Etkinliği oluşturulamadı. (Hata: " + err.message + ")" };
        }
    }
}

module.exports = EventService;
