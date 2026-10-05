const ScheduledEvent = require("../Database/ScheduledEvent");
const TaskManager = require("./TaskManager");
const ConfigManager = require("./ConfigManager");
const Economy = require("../Database/Economy");
const { MessageFlags } = require("discord.js");


function toSafeMap(input) {
    if (input instanceof Map) {
        const m = new Map();
        input.forEach((val, key) => {
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


module.exports = (client) => {
    if (!client.activeEvents) client.activeEvents = new Map();


    const checkScheduledEvents = async () => {
        try {
            const now = new Date();
            const pendingEvents = await ScheduledEvent.find({
                scheduleTime: { $lte: now, $ne: null },
                isStarted: false,
                isFinished: false,
                isCancelled: false
            });

            for (const event of pendingEvents) {
                if (!event.channelID) {
                    await ScheduledEvent.deleteOne({ _id: event._id });
                    continue;
                }

                const lockedEvent = await ScheduledEvent.findOneAndUpdate(
                    { _id: event._id, isStarted: false },
                    { $set: { isStarted: true, startedAt: new Date(), announcementSent: true } },
                    { new: true }
                );

                if (lockedEvent) {
                    const startTime = lockedEvent.startedAt;

                    const guildId = event.guildID || ConfigManager.get("Main.GuildID");
                    let guild = client.guilds.cache.get(guildId);
                    if (!guild) guild = client.guilds.cache.first();

                    if (lockedEvent.discordEventID && guild) {
                        try {
                            const dEvent = await guild.scheduledEvents.fetch(lockedEvent.discordEventID).catch(() => null);
                            if (dEvent && dEvent.status === 1) { // 1 = SCHEDULED
                                await dEvent.setStatus(2, "Etkinlik zamanı geldi, otomatik başlatıldı.").catch(err => console.error("[EventJob] Discord Event status set ACTIVE error:", err.message));
                            }
                        } catch (e) {
                            console.error("[EventJob] Fetch Discord Event Error:", e);
                        }
                    }

                    if (event.autoAnnounce && event.announcementText) {
                        const channelID = event.announcementChannelID || ConfigManager.get("Channels.EventAnnouncement") || ConfigManager.get("Channels.Chat");
                        const channel = client.channels.cache.get(channelID);
                        if (channel && channel.isTextBased()) {
                            await channel.send(event.announcementText).catch(e => console.error(`[EventJob] Discord Send Error:`, e));
                        }
                    }

                    const activeParticipants = toSafeMap(lockedEvent.participants);

                    let initialMemberCount = 0;
                    if (guild) {
                        const allChannelIds = [event.channelID, ...(event.subChannels || [])];
                        const fetched = await guild.members.fetch().catch(() => null);

                        const totalCached = guild.members.cache.size;
                        const allVoiceStates = guild.voiceStates.cache.filter(vs => vs.channelId);
                        const targetVoiceStates = guild.voiceStates.cache.filter(vs => vs.channelId && allChannelIds.includes(vs.channelId));
                        const memberVoiceCheck = guild.members.cache.filter(m => m.voice?.channelId && allChannelIds.includes(m.voice.channelId));

                        memberVoiceCheck.forEach(member => {
                            if (member.user.bot) return;
                            if (!activeParticipants.has(member.id)) {
                                activeParticipants.set(member.id, {
                                    totalMinutes: 0,
                                    rewarded: false,
                                    managerRewarded: false
                                });
                            }
                            initialMemberCount++;
                        });
                    }

                    if (!activeParticipants.has(event.managerID)) {
                        activeParticipants.set(event.managerID, {
                            totalMinutes: 0,
                            rewarded: false,
                            managerRewarded: false
                        });
                    }

                    client.activeEvents.set(event.channelID, {
                        eventID: event._id,
                        managerID: event.managerID,
                        startTime: startTime,
                        participants: activeParticipants,
                        deafenCheck: event.deafenCheck || false,
                        subChannels: event.subChannels || []
                    });

                }
            }

            const misalignedEvents = await ScheduledEvent.find({
                isStarted: true,
                isFinished: false,
                isCancelled: false
            });

            for (const ev of misalignedEvents) {
                if (!client.activeEvents.has(ev.channelID)) {
                    const recoveredParticipants = toSafeMap(ev.participants);

                    if (!recoveredParticipants.has(ev.managerID)) {
                        recoveredParticipants.set(ev.managerID, {
                            totalMinutes: 0,
                            rewarded: false,
                            managerRewarded: false
                        });
                    }

                    client.activeEvents.set(ev.channelID, {
                        eventID: ev._id,
                        managerID: ev.managerID,
                        startTime: ev.startedAt || ev.createdAt || new Date(),
                        participants: recoveredParticipants,
                        deafenCheck: ev.deafenCheck || false,
                        subChannels: ev.subChannels || []
                    });

                }
            }

        } catch (error) {
            console.error("[EventJob] checkScheduledEvents Error:", error);
        }
    };

    const finishEvent = async (data, channelID, guild, componentsV2) => {
        try {
            const ev = await ScheduledEvent.findById(data.eventID);
            if (ev) {
                const plainParticipants = {};
                const eventDurationMinutes = Math.floor((Date.now() - new Date(data.startTime).getTime()) / 60000);
                const managerThreshold = eventDurationMinutes >= 60 ? 20 : Math.max(1, Math.floor(eventDurationMinutes * 0.3));
                const rewardThreshold = eventDurationMinutes >= 60 ? 30 : Math.max(1, Math.floor(eventDurationMinutes * 0.5));

                if (data.participants instanceof Map) {
                    for (const [memberID, val] of data.participants.entries()) {
                        if (val.totalMinutes >= rewardThreshold && !val.rewarded) {
                            val.rewarded = true;
                            const pMember = await guild.members.fetch(memberID).catch(() => null);
                            if (pMember) {
                                TaskManager.progressTask(guild, pMember, "EVENT_PARTICIPATE", 1).catch(e => console.error(`[EventJob] Auto Participate Progress Err (${memberID}):`, e));
                                await Economy.findOneAndUpdate(
                                    { guildID: guild.id, userID: memberID },
                                    { $inc: { coin: 15 } },
                                    { upsert: true }
                                ).catch(e => console.error(`[EventJob] Auto Participate Coin Err (${memberID}):`, e));
                            }
                        }

                        if (memberID === data.managerID && val.totalMinutes >= managerThreshold && !val.managerRewarded) {
                            val.managerRewarded = true;
                            const managerMember = await guild.members.fetch(memberID).catch(() => null);
                            if (managerMember) {
                                TaskManager.progressTask(guild, managerMember, "EVENT_MANAGE", 1).catch(e => console.error(`[EventJob] Auto Manager Progress Err (${memberID}):`, e));
                                await Economy.findOneAndUpdate(
                                    { guildID: guild.id, userID: memberID },
                                    { $inc: { coin: 30 } },
                                    { upsert: true }
                                ).catch(e => console.error(`[EventJob] Auto Manager Coin Err (${memberID}):`, e));
                            }
                        }

                        plainParticipants[memberID] = {
                            totalMinutes: val.totalMinutes || 0,
                            rewarded: !!val.rewarded,
                            managerRewarded: !!val.managerRewarded
                        };
                    }
                }
                if (ev.discordEventID && guild) {
                    try {
                        const dEvent = await guild.scheduledEvents.fetch(ev.discordEventID).catch(() => null);
                        if (dEvent) {
                            await dEvent.delete().catch(() => {});
                        }
                    } catch (e) {}
                }
                await ScheduledEvent.deleteOne({ _id: ev._id }).catch(() => {});
            }
            client.activeEvents.delete(channelID);

            const logChannelID = ConfigManager.get("Channels.EventLog") || "1414972465456873472";
            const logChannel = guild.channels.cache.get(logChannelID);
            if (logChannel && componentsV2) {
                await logChannel.send({ components: componentsV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
            }
        } catch (error) {
            console.error("[EventJob] finishEvent Error:", error);
        }
    };

    const trackParticipants = async () => {
        try {
            for (const [channelID, data] of client.activeEvents) {
                const eventDoc = await ScheduledEvent.findById(data.eventID);
                const guildId = (eventDoc ? eventDoc.guildID : null) || ConfigManager.get("Main.GuildID");
                let guild = client.guilds.cache.get(guildId);
                if (!guild) guild = client.guilds.cache.first();
                if (!guild) {
                    continue;
                }

                const channel = guild.channels.cache.get(channelID);
                if (!channel) {
                    await finishEvent(data, channelID, guild, null);
                    continue;
                }

                const channelIds = [channelID, ...(data.subChannels || [])];
                const allMembers = guild.members.cache.filter(m => channelIds.includes(m.voice.channelId));

                const now = Date.now();
                const eventDurationMinutes = Math.floor((now - new Date(data.startTime).getTime()) / 60000);

                const rewardThreshold = eventDurationMinutes >= 60 ? 30 : Math.max(1, Math.floor(eventDurationMinutes * 0.5));
                const managerThreshold = eventDurationMinutes >= 60 ? 20 : Math.max(1, Math.floor(eventDurationMinutes * 0.3));

                let activeMemberCount = 0;

                allMembers.forEach(member => {
                    if (member.user.bot) return;

                    const isDeaf = member.voice.selfDeaf || member.voice.serverDeaf;
                    const isManager = member.id === data.managerID;

                    if (data.deafenCheck && isDeaf && !isManager) return;

                    activeMemberCount++;

                    let participant = data.participants.get(member.id);
                    if (!participant) {
                        participant = { totalMinutes: 0, rewarded: false, managerRewarded: false };
                    }

                    if (participant.totalMinutes === undefined || isNaN(participant.totalMinutes)) participant.totalMinutes = 0;

                    participant.totalMinutes += 0.5;

                    data.participants.set(member.id, participant);
                });

                let managerData = data.participants.get(data.managerID);

                if (!managerData) {
                    managerData = { totalMinutes: 0, rewarded: false, managerRewarded: false };
                    data.participants.set(data.managerID, managerData);
                }

                const managerInChannel = allMembers.has(data.managerID);

                const participantSummary = [...data.participants.entries()]
                    .map(([id, p]) => `<@${id}>: \`${(p.totalMinutes || 0).toFixed(1)}\` dk`)
                    .join("\n");

                try {
                    const eventDoc = await ScheduledEvent.findById(data.eventID);
                    if (eventDoc) {
                        const plainParticipants = {};
                        data.participants.forEach((val, key) => {
                            plainParticipants[key] = {
                                totalMinutes: val.totalMinutes || 0,
                                rewarded: !!val.rewarded,
                                managerRewarded: !!val.managerRewarded
                            };
                        });
                        eventDoc.participants = plainParticipants;
                        eventDoc.markModified("participants");
                        await eventDoc.save();
                    }
                } catch (dbErr) {
                    console.error("[EventJob] DB Sync Error:", dbErr);
                }

                if (activeMemberCount === 0) {
                    if (!data.emptySince) data.emptySince = Date.now();
                } else {
                    data.emptySince = null;
                }

                const emptyDuration = data.emptySince ? Math.floor((Date.now() - data.emptySince) / 60000) : 0;

                const participantsList = [...data.participants.entries()]
                    .map(([id, p]) => {
                        const isQualify = id === data.managerID ? (p.totalMinutes >= managerThreshold) : (p.totalMinutes >= rewardThreshold);
                        const statusIcon = isQualify ? (ConfigManager.get("Emojis.toji_onay") || "✨") : (ConfigManager.get("Emojis.toji_iptal") || "✨");
                        return `<@${id}>: ${Math.floor(p.totalMinutes || 0)} dk ${statusIcon}`;
                    })
                    .join("\n") || "Katılımcı yok";
                const displayList = participantsList.length > 2000 ? participantsList.slice(0, 1990) + "..." : participantsList;

                const eventName = eventDoc ? eventDoc.eventName : "Bilinmiyor";

                if (eventDurationMinutes > 240) {
                    const v2Log = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: {
                                        type: 11,
                                        media: { url: guild.iconURL() }
                                    },
                                    components: [
                                        {
                                            type: 10,
                                            content: `> ## Etkinlik Otomatik Sona Erdi\n> -# \`${eventName}\` etkinliği maksimum süre (4 saat) dolduğu için sonlandırıldı.`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Yönetici:** <@${data.managerID}>\n**Kanal:** <#${channelID}>\n\n**Süreler & Ödüller:**\n${displayList.length > 0 ? displayList : "Katılımcı yok"}`
                                }
                            ]
                        }
                    ];
                    await finishEvent(data, channelID, guild, v2Log);

                } else if (emptyDuration >= 10) {
                    const v2Log = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: {
                                        type: 11,
                                        media: { url: guild.iconURL() }
                                    },
                                    components: [
                                        {
                                            type: 10,
                                            content: `> ## Etkinlik Otomatik Sona Erdi\n> -# \`${eventName}\` etkinliği kanal 10 dakikadır boş olduğu için sonlandırıldı.`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Yönetici:** <@${data.managerID}>\n**Kanal:** <#${channelID}>\n\n**Süreler & Ödüller:**\n${displayList.length > 0 ? displayList : "Katılımcı yok"}`
                                }
                            ]
                        }
                    ];
                    await finishEvent(data, channelID, guild, v2Log);

                } else if (allMembers.size < 4 && eventDurationMinutes >= 30) {
                    const v2Log = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: {
                                        type: 11,
                                        media: { url: guild.iconURL() }
                                    },
                                    components: [
                                        {
                                            type: 10,
                                            content: `> ## Etkinlik Otomatik Sona Erdi\n> -# \`${eventName}\` etkinliği 30 dakikayı geçtiği ve ses kanalında 4 kişiden az bulunduğu için sonlandırıldı.`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Yönetici:** <@${data.managerID}>\n**Kanal:** <#${channelID}>\n\n**Süreler & Ödüller:**\n${displayList.length > 0 ? displayList : "Katılımcı yok"}`
                                }
                            ]
                        }
                    ];
                    await finishEvent(data, channelID, guild, v2Log);
                }
            }
        } catch (error) {
            console.error("[EventJob] trackParticipants Error:", error);
        }
    };

    setInterval(async () => {
        await checkScheduledEvents();
        await trackParticipants();
    }, 30000);
};
