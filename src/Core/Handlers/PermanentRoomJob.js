const PermanentRoom = require("../Database/PermanentRoom");
const PermanentRoomProfile = require("../Database/PermanentRoomProfile");
const ConfigManager = require("./ConfigManager");
const Settings = require("../../../Settings.json");
const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const moment = require("moment");

module.exports = (client) => {
    const checkActivity = async () => {
        const rooms = await PermanentRoom.find({ status: "ACTIVE" });
        const now = Date.now();
        const threshold = 60 * 60 * 1000 * 60; 

        const { voiceTimes } = require("../../Modules/Voice/PermanentRoomVoiceTracker");

        for (const room of rooms) {
            const roomAge = now - room.createdAt;
            if (roomAge < 7 * 24 * 60 * 60 * 1000) continue;

            const startDate = room.lastActivityCheck || room.createdAt;
            const periodMs = now - startDate;
            if (periodMs < 7 * 24 * 60 * 60 * 1000) continue;

            let activeTime = 0;
            const guild = client.guilds.cache.get(room.guildID);
            if (guild) {
                const channel = guild.channels.cache.get(room.channelID);
                if (channel) {
                    for (const [memberID, member] of channel.members) {
                        const session = voiceTimes.get(memberID);
                        if (session && session.channelID === room.channelID) {
                            activeTime += (now - session.start);
                            session.start = now; 
                        }
                    }
                }
            }

            const totalWeeklyTime = room.weeklyVoiceTime + activeTime;

            if (totalWeeklyTime < threshold) {
                await warnRoom(client, room, threshold, totalWeeklyTime);
                room.weeklyVoiceTime = 0;
                room.lastActivityCheck = now;
                await room.save();
            } else {
                room.weeklyVoiceTime = 0;
                room.lastActivityCheck = now;
                room.failedChecks = 0;
                await room.save();
            }
        }
    };

    const warnRoom = async (client, room, threshold, totalWeeklyTime) => {
        const guild = client.guilds.cache.get(room.guildID);
        if (!guild) return;

        room.failedChecks = (room.failedChecks || 0) + 1;
        await room.save();

        const logChannelID = ConfigManager.get("Channels.PermanentRoomLog");
        const logChannel = guild.channels.cache.get(logChannelID);
        if (!logChannel) return;

        const emojis = ConfigManager.get("Emojis") || {};
        const iptal = emojis.toji_iptal || "❌";

        const hours = Math.floor(totalWeeklyTime / 3600000);
        const mins = Math.floor((totalWeeklyTime % 3600000) / 60000);

        const owner = await guild.members.fetch(room.ownerID).catch(() => null);

        const v2Payload = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: guild.iconURL({ extension: 'png' }) ? { type: 11, media: { url: guild.iconURL({ extension: 'png' }) } } : undefined,
                        components: [
                            { type: 10, content: `## ${iptal} Kalıcı Oda Aktiflik Uyarısı\n-# Haftalık ses süresi yetersiz.` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> **Oda:** \`${room.channelName}\` (<#${room.channelID}>)\n` +
                            `> **Sahip:** ${owner}\n` +
                            `> **Haftalık Ses:** \`${hours} saat ${mins} dk\`\n` +
                            `> **Gereken:** \`${Math.floor(threshold / 3600000)} saat\`\n` +
                            `> **Uyarı Sayısı:** \`#${room.failedChecks}\``
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 4, custom_id: `pod_delete_warn_${room._id}`, label: "Odayı Sil", emoji: { name: "🗑️" } },
                            { type: 2, style: 2, custom_id: `pod_keep_warn_${room._id}`, label: "Odayı Silme", emoji: { name: "✅" } }
                        ]
                    }
                ]
            }
        ];

        await logChannel.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});

        if (owner) {
            await owner.send({ content: `⚠️ Kalıcı odanız (**${room.channelName}**) bu hafta yeterli ses aktifliğine ulaşamadı (${hours}s ${mins}dk). Yetkililer tarafından incelenecek.` }).catch(() => {});
        }
    };

    const cleanupOrphanMessages = async () => {
        const guild = client.guilds.cache.get(Settings.Main.GuildID);
        if (!guild) return;

        const ownersChannelId = ConfigManager.get("Channels.PermanentRoomOwners");
        if (!ownersChannelId) return;
        const ownersChan = guild.channels.cache.get(ownersChannelId);
        if (!ownersChan) return;

        const activeRooms = await PermanentRoom.find({ status: "ACTIVE" }).lean();
        const activeIds = new Set(activeRooms.map(r => r.channelID).filter(Boolean));

        const existingLogs = new Set();
        try {
            const messages = await ownersChan.messages.fetch({ limit: 100 });
            for (const [, msg] of messages) {
                if (msg.author.id !== client.user.id) continue;
                const content = msg.components?.[0]?.components?.filter(c => c.type === 10).map(c => c.content).join(" ") || "";
                const channelMatch = content.match(/<#(\d+)>/);
                if (channelMatch) {
                    if (!activeIds.has(channelMatch[1])) {
                        await msg.delete().catch(() => {});
                    } else {
                        existingLogs.add(channelMatch[1]);
                    }
                }
            }
        } catch (_) {}

        for (const room of activeRooms) {
            if (existingLogs.has(room.channelID)) continue;

            const owner = await guild.members.fetch(room.ownerID).catch(() => null);
            const members = (room.teamMembers || []).filter(id => id !== room.ownerID);
            const memberMentions = members.map(id => `<@${id}>`).join(", ") || "Yok";

            const emojis = ConfigManager.get("Emojis") || {};
            await ownersChan.send({
                components: [{
                    type: 17,
                    components: [
                        { type: 10, content: `### ${emojis.toji_hubsparkles || "✨"} **Yeni Kalıcı Oda Aktif Edildi!**\nOda başarıyla oluşturuldu ve sahibine teslim edildi.` },
                        { type: 14, divider: true, spacing: 1 },
                        { type: 10, content: `> **Oda:** <#${room.channelID}>\n> **Sahibi:** ${owner}\n> **Üyeler:** ${memberMentions}\n> **Kişi Sayısı:** \`${(room.teamMembers || []).length}\`` }
                    ]
                }],
                flags: [MessageFlags.IsComponentsV2]
            }).catch(() => {});
        }
    };

    setInterval(checkActivity, 60 * 60 * 1000);
    setInterval(cleanupOrphanMessages, 6 * 60 * 60 * 1000);
    setTimeout(cleanupOrphanMessages, 30000);
};

module.exports.handleInteraction = async (interaction) => {
    const cid = interaction.customId || "";

    if (cid.startsWith("pod_delete_warn_")) {
        const roomId = cid.slice(16);
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const room = await PermanentRoom.findById(roomId);
        if (!room) return interaction.editReply({ content: "Oda bulunamadı." });

        const guild = interaction.guild;
        const channel = guild.channels.cache.get(room.channelID);
        if (channel) await channel.delete("Aktiflik yetersiz - yetkili tarafından silindi").catch(() => {});

        const ownersChanId = ConfigManager.get("Channels.PermanentRoomOwners");
        if (ownersChanId) {
            const ownersChan = guild.channels.cache.get(ownersChanId);
            if (ownersChan) {
                try {
                    const msgs = await ownersChan.messages.fetch({ limit: 100 });
                    for (const [, m] of msgs) {
                        if (m.author.id !== client.user.id) continue;
                        const c = m.components?.[0]?.components?.find(x => x.type === 10)?.content || "";
                        if (c.includes(room.channelID)) await m.delete().catch(() => {});
                    }
                } catch (_) {}
            }
        }

        await PermanentRoom.deleteOne({ _id: room._id });
        await PermanentRoomProfile.deleteOne({ userId: room.ownerID }).catch(() => {});

        const owner = await guild.members.fetch(room.ownerID).catch(() => null);
        if (owner) {
            await owner.send({ content: `🗑️ Kalıcı odanız (**${room.channelName}**) aktiflik yetersizliği nedeniyle silindi.` }).catch(() => {});
        }

        await interaction.message.edit({ components: [], content: "\u200b" }).catch(() => {});
        await interaction.channel.send({ content: `🗑️ **${room.channelName}** odası ${interaction.user} tarafından silindi.` });
        return interaction.editReply({ content: "Oda silindi." });
    }

    if (cid.startsWith("pod_keep_warn_")) {
        const roomId = cid.slice(14);
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const room = await PermanentRoom.findById(roomId);
        if (!room) return interaction.editReply({ content: "Oda bulunamadı." });

        room.weeklyVoiceTime = 0;
        room.lastActivityCheck = Date.now();
        room.failedChecks = 0;
        await room.save();

        await interaction.message.edit({ components: [], content: "\u200b" }).catch(() => {});
        await interaction.channel.send({ content: `✅ **${room.channelName}** odası ${interaction.user} tarafından korundu.` });
        return interaction.editReply({ content: "Oda korundu." });
    }
};
