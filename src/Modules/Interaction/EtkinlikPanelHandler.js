const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
const ScheduledEvent = require("../../Core/Database/ScheduledEvent");
const TaskManager = require("../../Core/Handlers/TaskManager");
const EventService = require("../../Services/Moderation/EventService");
const Economy = require("../../Core/Database/Economy");
const moment = require("moment");

function toSafeMap(input) {
    if (input instanceof Map) {
        const m = new Map();
        input.forEach((val, key) => {
            if (key === "$init" || key === "_id") return;
            if (val && typeof val === "object") {
                m.set(key, {
                    totalMinutes: parseFloat(val.totalMinutes) || 0,
                    rewarded: !!val.rewarded,
                    managerRewarded: !!val.managerRewarded
                });
            }
        });
        return m;
    }
    if (input && typeof input === "object") {
        const m = new Map();
        const entries = input.entries ? [...input.entries()] : Object.entries(input);
        for (const [key, val] of entries) {
            if (key === "$init" || key === "_id") continue;
            if (val && typeof val === "object") {
                m.set(key, {
                    totalMinutes: parseFloat(val.totalMinutes) || 0,
                    rewarded: !!val.rewarded,
                    managerRewarded: !!val.managerRewarded
                });
            }
        }
        return m;
    }
    return new Map();
}

async function renderEventPanel(interaction, event, options = {}) {
    return EventService.renderEventSettingsPanel(interaction, event, options);
}

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isAnySelectMenu()) return;
    if (!interaction.customId.startsWith("event_")) return;

    const ConfigManager = require("../../Core/Handlers/ConfigManager");
    const eventManageRoles = ConfigManager.get("Roles.Responsibilities.EventManage") || [];
    const isOwner = ConfigManager.isOwner(interaction.member);
    const isAdmin = interaction.member.permissions.has("Administrator");
    const hasEventRole = eventManageRoles.some(roleID => interaction.member.roles.cache.has(roleID));

    if (!isOwner && !isAdmin && !hasEventRole) {
        return interaction.reply({ content: "Bu işlemi sadece yetkili kişiler yapabilir.", flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.isButton() && interaction.customId === "event_manage_back") {
        return EventService.renderMainMenu(interaction);
    }

    if (interaction.isButton() && interaction.customId === "event_draft_create") {
        const modal = new ModalBuilder().setCustomId("event_create_modal").setTitle("Yeni Etkinlik Oluştur");
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("event_name")
                .setLabel("Etkinlik İsmi")
                .setPlaceholder("Örn: Film Gecesi")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ));
        return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "event_create_modal") {
        const eventName = interaction.fields.getTextInputValue("event_name");
        const newEvent = new ScheduledEvent({ eventName, createdAt: new Date() });
        await newEvent.save();
        return EventService.renderEventSettingsPanel(interaction, newEvent, { isFirstReply: true });
    }

    const [prefix, eventID, action] = interaction.customId.split("_");

    if (interaction.isStringSelectMenu() && interaction.customId === "event_manage_select") {
        const selectedID = interaction.values[0];
        const selectedEvent = await ScheduledEvent.findById(selectedID);
        if (!selectedEvent) return interaction.reply({ content: "Etkinlik bulunamadı.", flags: [MessageFlags.Ephemeral] });
        return renderEventPanel(interaction, selectedEvent);
    }

    const event = await ScheduledEvent.findById(eventID);
    if (!event) return interaction.reply({ content: "Bu etkinlik artık mevcut değil veya silinmiş.", flags: [MessageFlags.Ephemeral] });

    if (interaction.isButton()) {
        if (action === "info") {
            const { FileUploadBuilder, LabelBuilder } = require("discord.js");
            const modal = new ModalBuilder().setCustomId(`event_${eventID}_modalinfo`).setTitle("Etkinlik Detayları");
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("event_name")
                        .setLabel("Etkinlik İsmi")
                        .setPlaceholder("Etkinliğin adını girin...")
                        .setValue(event.eventName || "")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(100)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("event_desc")
                        .setLabel("Takvim Etkinliği Açıklaması")
                        .setPlaceholder("Discord takviminde görünecek kısa açıklama...")
                        .setValue(event.eventDescription || "")
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(1000)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("announcement_text")
                        .setLabel("Kanal Duyuru İçeriği")
                        .setPlaceholder("Metin kanalına atılacak uzun mesaj (Opsiyonel)")
                        .setValue(event.announcementText || "")
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(3000)
                        .setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("event_time")
                        .setLabel("Zamanlama (Tarih-Saat)")
                        .setPlaceholder("Örn: 30.04 20:30 (Boşsa 30dk sonra)")
                        .setValue(event.scheduleTime ? require("moment")(event.scheduleTime).format("DD.MM HH:mm") : "")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(20)
                        .setRequired(false)
                )
            );

            if (FileUploadBuilder && LabelBuilder) {
                const coverUpload = new FileUploadBuilder()
                    .setCustomId("cover_image")
                    .setRequired(false);
                
                const coverLabel = new LabelBuilder()
                    .setFileUploadComponent(coverUpload)
                    .setLabel("Kapak Görseli (Opsiyonel)");
                    
                if (typeof modal.addLabelComponents === "function") {
                    modal.addLabelComponents(coverLabel);
                }
            }

            return interaction.showModal(modal);
        }

        if (action === "time") {
            const modal = new ModalBuilder().setCustomId(`event_${eventID}_modaltime`).setTitle("Zamanlama Ayarla");
            modal.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("schedule_time")
                    .setLabel("Kaç Dakika Sonra? (Sadece Sayı)")
                    .setPlaceholder("Örn: 15, 30, 60...")
                    .setValue("30")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ));
            return interaction.showModal(modal);
        }

        if (action === "toggleauto") {
            event.autoAnnounce = !event.autoAnnounce;
            await event.save();
            return renderEventPanel(interaction, event);
        }

        if (action === "toggledeafen") {
            event.deafenCheck = !event.deafenCheck;
            await event.save();
            return renderEventPanel(interaction, event);
        }

        if (action === "savetpl") {
            const modal = new ModalBuilder().setCustomId(`event_${eventID}_modalsavetpl`).setTitle("Şablon Olarak Kaydet");
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("tpl_name")
                        .setLabel("Şablon Adı")
                        .setPlaceholder("Örn: Film Gecesi (Korku)")
                        .setStyle(TextInputStyle.Short)
                        .setMaxLength(100)
                        .setRequired(true)
                )
            );
            return interaction.showModal(modal);
        }

        if (action === "subchan") {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(`event_${eventID}_subselect`)
                    .setPlaceholder("Alt kanalları seçin (çoklu seçim)")
                    .setChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                    .setMinValues(1)
                    .setMaxValues(10)
            );
            return interaction.reply({ content: "Aşağıdaki menüden etkinliğe dahil edilecek alt kanalları seçin:", components: [row], flags: [MessageFlags.Ephemeral] });
        }

        if (action === "finish") {
            if (!event.isStarted) {
                return interaction.reply({ content: "Etkinlik henüz başlamadı.", flags: [MessageFlags.Ephemeral] });
            }
            if (event.isFinished) {
                return interaction.reply({ content: "Etkinlik zaten sona erdi.", flags: [MessageFlags.Ephemeral] });
            }

            let participants;
            let managerID = event.managerID;
            let startTime = event.startedAt || event.createdAt;

            if (interaction.client.activeEvents && interaction.client.activeEvents.has(event.channelID)) {
                const liveData = interaction.client.activeEvents.get(event.channelID);
                participants = liveData.participants;
                managerID = liveData.managerID;
                startTime = liveData.startTime;
            } else {
                participants = toSafeMap(event.participants);
            }

            const eventDurationMinutes = Math.floor((Date.now() - new Date(startTime).getTime()) / 60000);
            const rewardThreshold = eventDurationMinutes > 60 ? 30 : Math.max(1, Math.floor(eventDurationMinutes * 0.5));

            const participantChannelIds = [event.channelID, ...(event.subChannels || [])];
            const allEventMembers = interaction.guild.members.cache.filter(m => participantChannelIds.includes(m.voice.channelId));

            allEventMembers.forEach(member => {
                if (member.user.bot) return;
                const isDeaf = member.voice.selfDeaf || member.voice.serverDeaf;
                const isManager = member.id === managerID;

                if (event.deafenCheck && isDeaf && !isManager) return;

                let participant = participants.get(member.id);
                if (!participant) {
                    participant = { totalMinutes: 0, rewarded: false, managerRewarded: false };
                }

                if (participant.totalMinutes === undefined || isNaN(participant.totalMinutes)) {
                    participant.totalMinutes = 0;
                }

                participant.totalMinutes += 0.5;
                participants.set(member.id, participant);
            });

            for (const [memberID, participant] of participants.entries()) {
                if (participant.totalMinutes >= rewardThreshold && !participant.rewarded) {
                    participant.rewarded = true;
                    const pMember = interaction.guild.members.cache.get(memberID);
                    if (pMember) {
                        TaskManager.progressTask(interaction.guild, pMember, "EVENT_PARTICIPATE", 1).catch(e => console.error(`[EventPanel] Participate Progress Err (${memberID}):`, e));
                        await Economy.findOneAndUpdate(
                            { guildID: interaction.guild.id, userID: memberID },
                            { $inc: { coin: 15 } },
                            { upsert: true }
                        ).catch(e => console.error(`[EventPanel] Participate Coin Err (${memberID}):`, e));
                    }
                }
            }

            if (!participants.has(managerID)) {
                participants.set(managerID, { totalMinutes: 0, rewarded: false, managerRewarded: false });
            }

            const managerThreshold = eventDurationMinutes > 60 ? 20 : Math.max(1, Math.floor(eventDurationMinutes * 0.3));
            let mData = participants.get(managerID);
            if (mData && mData.totalMinutes >= managerThreshold && !mData.managerRewarded) {
                const managerMember = interaction.guild.members.cache.get(managerID);
                if (managerMember) {
                    mData.managerRewarded = true;
                    participants.set(managerID, mData);
                    TaskManager.progressTask(interaction.guild, managerMember, "EVENT_MANAGE", 1).catch(e => console.error(`[EventPanel] Manager Progress Err (${managerID}):`, e));
                    await Economy.findOneAndUpdate(
                        { guildID: interaction.guild.id, userID: managerID },
                        { $inc: { coin: 30 } },
                        { upsert: true }
                    ).catch(e => console.error(`[EventPanel] Manager Coin Err (${managerID}):`, e));
                }
            }

            if (interaction.client.activeEvents) {
                interaction.client.activeEvents.delete(event.channelID);
            }

            const plainParticipants = {};
            participants.forEach((val, key) => {
                plainParticipants[key] = {
                    totalMinutes: val.totalMinutes || 0,
                    rewarded: !!val.rewarded,
                    managerRewarded: !!val.managerRewarded
                };
            });
            event.participants = plainParticipants;
            event.markModified("participants");
            await ScheduledEvent.deleteOne({ _id: event._id }).catch(()=>{});
            
            if (event.discordEventID) {
                try {
                    const dEvent = await interaction.guild.scheduledEvents.fetch(event.discordEventID).catch(()=>{});
                    if (dEvent) {
                        await dEvent.delete().catch(()=>{});
                    }
                } catch(e) {}
            }

            const logChannelID = ConfigManager.get("Channels.EventLog") || "1414972465456873472";
            const logChannel = interaction.guild.channels.cache.get(logChannelID);
            if (logChannel) {
                const participantsList = [...participants.entries()]
                    .map(([id, p]) => `<@${id}>: ${Math.floor(p.totalMinutes || 0)} dk ${p.rewarded ? (ConfigManager.get("Emojis.toji_onay") || "✨") : (ConfigManager.get("Emojis.toji_iptal") || "✨")}`)
                    .join("\n") || "Katılımcı yok";
                const displayList = participantsList.length > 2000 ? participantsList.slice(0, 1990) + "..." : participantsList;

                const managerMember = interaction.guild.members.cache.get(event.managerID);
                const managerAvatar = managerMember ? managerMember.user.displayAvatarURL({ dynamic: true, size: 256 }) : interaction.guild.iconURL();

                const v2Log = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 9,
                                accessory: {
                                    type: 11,
                                    media: { url: managerAvatar }
                                },
                                components: [
                                    {
                                        type: 10,
                                        content: `> ## Etkinlik Sona Erdi\n> -# \`${event.eventName}\` etkinliği <@${interaction.user.id}> tarafından manuel olarak sonlandırıldı.`
                                    }
                                ]
                            },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 10,
                                content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Yönetici:** <@${event.managerID}>\n**Kanal:** <#${event.channelID}>\n\n**Süreler & Ödüller:**\n${displayList.length > 0 ? displayList : "Katılımcı yok"}`
                            }
                        ]
                    }
                ];

                logChannel.send({ components: v2Log, flags: [MessageFlags.IsComponentsV2] }).catch(err => console.error("[EventLog] Error:", err));
            }

            return EventService.renderMainMenu(interaction);
        }

        if (action === "cancel") {
            if (event.isStarted) {
                return interaction.reply({ content: "Başlamış etkinlikler iptal edilemez.", flags: [MessageFlags.Ephemeral] });
            }
            await ScheduledEvent.deleteOne({ _id: event._id });
            return EventService.renderMainMenu(interaction);
        }

        if (action === "start") {
            if (event.isStarted) {
                return interaction.reply({ content: "Bu etkinlik zaten başlamış.", flags: [MessageFlags.Ephemeral] });
            }
            if (!event.channelID) {
                return interaction.reply({ content: "Etkinlik başlatılamadı. Lütfen önce bir ana etkinlik kanalı seçin.", flags: [MessageFlags.Ephemeral] });
            }

            await interaction.deferUpdate().catch(()=>{});
            
            const discordEv = await EventService.startAndCreateDiscordEvent(interaction, event);
            if (!discordEv.success) {
                return interaction.followUp({ content: discordEv.msg, flags: [MessageFlags.Ephemeral] });
            }

            let delay = 0;
            if (event.scheduleTime) {
                const diff = event.scheduleTime - Date.now();
                if (diff > 0) delay = diff;
            }

            const startEventCore = async () => {
                event.isStarted = true;
                event.startedAt = new Date();
                await event.save().catch(()=>{});

                if (event.discordEventID && interaction.guild) {
                    try {
                        const dEvent = await interaction.guild.scheduledEvents.fetch(event.discordEventID).catch(() => null);
                        if (dEvent && dEvent.status === 1) { // 1 = SCHEDULED
                            await dEvent.setStatus(2, "Etkinlik zamanı geldi, otomatik başlatıldı.").catch(err => console.error("[EventPanel] Discord Event setStatus ACTIVE error:", err.message));
                        }
                    } catch (e) {}
                }

                const activeParticipants = toSafeMap(event.participants);
                if (!activeParticipants.has(event.managerID)) {
                    activeParticipants.set(event.managerID, { totalMinutes: 0, rewarded: false, managerRewarded: false });
                }

                interaction.client.activeEvents.set(event.channelID, {
                    eventID: event._id,
                    managerID: event.managerID,
                    startTime: event.startedAt,
                    participants: activeParticipants,
                    deafenCheck: event.deafenCheck || false,
                    subChannels: event.subChannels || []
                });

                if (event.autoAnnounce && event.announcementText) {
                    const channelID = event.announcementChannelID || ConfigManager.get("Channels.EventAnnouncement");
                    if (channelID) {
                        const channel = interaction.guild.channels.cache.get(channelID);
                        if (channel && channel.isTextBased()) {
                            channel.send({ 
                                content: event.announcementText, 
                                allowedMentions: { parse: ['everyone', 'roles'] } 
                            }).catch(e => console.error("[EventPanel] Discord Send Error:", e));
                        }
                    }
                }
            };

            if (delay > 0) {
                setTimeout(startEventCore, delay);
                interaction.followUp({ content: `✅ Etkinlik <t:${Math.floor(event.scheduleTime/1000)}:R> (<t:${Math.floor(event.scheduleTime/1000)}:f>) otomatik olarak başlatılacak ve duyuru atılacak.`, flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            } else {
                await startEventCore();
                interaction.followUp({ content: `✅ Etkinlik hemen başlatıldı ve duyuru gönderildi!`, flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            }

            return renderEventPanel(interaction, event);
        }
    }

    if (interaction.isModalSubmit()) {
        if (action === "modalinfo") {
            await interaction.deferUpdate().catch(()=>{});
            const eventName = interaction.fields.getTextInputValue("event_name");
            const announcementText = interaction.fields.getTextInputValue("announcement_text");
            const eventDescription = interaction.fields.getTextInputValue("event_desc");
            const eventTimeStr = interaction.fields.getTextInputValue("event_time");
            
            if (eventTimeStr && eventTimeStr.trim() !== "") {
                const moment = require("moment");
                const parsedDate = moment(eventTimeStr.trim(), "DD.MM HH:mm", true);
                if (parsedDate.isValid()) {
                    if (parsedDate.isBefore(moment())) {
                        parsedDate.add(1, 'year');
                    }
                    event.scheduleTime = parsedDate.toDate();
                } else {
                    event.scheduleTime = new Date(Date.now() + 30 * 60000); // Format hatalıysa 30dk default
                }
            } else {
                event.scheduleTime = new Date(Date.now() + 30 * 60000); // Boş bırakılmışsa 30dk default
            }
            
            let coverImageUrl = null;
            try {
                const coverField = interaction.fields.fields.get("cover_image");
                if (coverField && coverField.attachment) {
                    coverImageUrl = coverField.attachment.url;
                } else if (interaction.fields.getAttachment && interaction.fields.getAttachment("cover_image")) {
                    coverImageUrl = interaction.fields.getAttachment("cover_image").url;
                }
            } catch(e) {}

            event.eventName = eventName;
            event.announcementText = announcementText;
            event.eventDescription = eventDescription;
            if (coverImageUrl) {
                event.coverImage = coverImageUrl;
            }
            
            await event.save();
            return renderEventPanel(interaction, event);
        }

        if (action === "modaltime") {
            await interaction.deferUpdate().catch(()=>{});
            const scheduleTime = parseInt(interaction.fields.getTextInputValue("schedule_time"));
            if (isNaN(scheduleTime) || scheduleTime < 1) {
                return interaction.followUp({ content: "Geçersiz zaman değeri.", flags: [MessageFlags.Ephemeral] });
            }
            event.scheduleTime = moment().add(scheduleTime, 'minutes').toDate();
            await event.save();
            return renderEventPanel(interaction, event);
        }

        if (action === "modalsavetpl") {
            await interaction.deferUpdate().catch(()=>{});
            const tplName = interaction.fields.getTextInputValue("tpl_name");
            const EventTemplate = require("../../Core/Database/EventTemplate");
            
            const newTpl = new EventTemplate({
                TemplateName: tplName,
                EventName: event.eventName,
                EventDescription: event.eventDescription,
                AnnouncementText: event.announcementText,
                CoverImage: event.coverImage,
                MainChannel: event.channelID,
                SubChannels: event.subChannels || [],
                CreatorID: interaction.user.id
            });
            await newTpl.save();
            
            interaction.followUp({ content: `✅ **${tplName}** isimli etkinlik şablonu başarıyla kaydedildi.`, flags: [MessageFlags.Ephemeral] }).catch(()=>{});
            return renderEventPanel(interaction, event);
        }
    }

    if (interaction.isChannelSelectMenu()) {
        await interaction.deferUpdate().catch(()=>{});
        if (action === "subselect") {
            event.subChannels = interaction.values;
            await event.save();

            if (interaction.client.activeEvents && interaction.client.activeEvents.has(event.channelID)) {
                const liveData = interaction.client.activeEvents.get(event.channelID);
                liveData.subChannels = interaction.values;
                interaction.client.activeEvents.set(event.channelID, liveData);
            }

            return renderEventPanel(interaction, event);
        }

        if (action === "mainchan") {
            event.channelID = interaction.values[0];
            await event.save();
            return renderEventPanel(interaction, event);
        }

        if (action === "annchan") {
            event.announcementChannelID = interaction.values[0];
            await event.save();
            return renderEventPanel(interaction, event);
        }
    }

    if (interaction.isUserSelectMenu() && action === "manager") {
        event.managerID = interaction.values[0];
        await event.save();

        if (interaction.client.activeEvents && interaction.client.activeEvents.has(event.channelID)) {
            const liveData = interaction.client.activeEvents.get(event.channelID);
            liveData.managerID = interaction.values[0];
            interaction.client.activeEvents.set(event.channelID, liveData);
        }

        return renderEventPanel(interaction, event);
    }

    if (interaction.isStringSelectMenu() && action === "loadtpl") {
        await interaction.deferUpdate().catch(()=>{});
        const templateID = interaction.values[0];
        const EventTemplate = require("../../Core/Database/EventTemplate");
        const tpl = await EventTemplate.findById(templateID);
        if (!tpl) {
            return interaction.followUp({ content: "Şablon bulunamadı.", flags: [MessageFlags.Ephemeral] });
        }
        
        event.eventName = tpl.EventName;
        event.eventDescription = tpl.EventDescription;
        event.announcementText = tpl.AnnouncementText;
        event.coverImage = tpl.CoverImage;
        event.channelID = tpl.MainChannel;
        event.subChannels = tpl.SubChannels || [];
        await event.save();
        
        interaction.followUp({ content: `✅ **${tpl.TemplateName}** şablonu yüklendi!`, flags: [MessageFlags.Ephemeral] }).catch(()=>{});
        return renderEventPanel(interaction, event);
    }
};

module.exports.renderEventPanel = renderEventPanel;
