const { AuditLogEvent, MessageFlags } = require("discord.js");
const client = global.bot;
const RoleLog = require("../../Core/Database/RoleLog");

const ConfigManager = require("../../Core/Handlers/ConfigManager");

const getLogChannel = (guild, name) => {
    const configKey = name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    const id = ConfigManager.get(`Channels.${configKey}`);
    if (id) {
        const channel = guild.channels.cache.get(id);
        if (channel && channel.isTextBased()) return channel;
    }
    return guild.channels.cache.find(ch => ch.name === name && ch.isTextBased());
};

function formatStickers(stickers) {
    if (!stickers || stickers.size === 0) return null;
    const arr = [];
    for (const [_, st] of stickers) {
        arr.push(`[**${st.name}**](${st.url})`);
    }
    return arr.join(", ");
}

function truncate(text, limit = 1000) {
    if (!text) return null;
    return text.length > limit ? text.slice(0, limit - 3) + "..." : text;
}


function sendV2Log(channel, title, subtitle, detailsMap, files = [], iconUrl = null) {
    let detailsText = "> ### " + (ConfigManager.get("Emojis.toji_hubsparkles") || "✨") + " **Detaylar**\n";
    for (const [key, val] of Object.entries(detailsMap)) {
        if (val !== undefined && val !== null && val !== "") {
            detailsText += `**${key}:** ${val}\n`;
        }
    }

    const v2Log = [
        {
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: iconUrl || client.user.displayAvatarURL() }
                    },
                    components: [
                        { type: 10, content: `> ## ${title}\n> -# ${subtitle}` }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: detailsText }
            ]
        }
    ];

    return channel.send({
        components: v2Log,
        flags: [MessageFlags.IsComponentsV2],
        allowedMentions: { parse: [] },
        files: files
    })
}

let isInitialized = false;

function getChannelType(type) {
    const types = {
        0: "Yazı Kanalı",
        2: "Ses Kanalı",
        4: "Kategori",
        5: "Duyuru Kanalı",
        13: "Sahne Kanalı",
        15: "Forum Kanalı"
    };
    return types[type] || `Bilinmiyor (${type})`;
}

module.exports = {

    messageDelete: async (message) => {
        try {
            if (message.partial) {
                try { message = await message.fetch(); } catch (err) { return; }
            }
            if (!message.guild || message.webhookId || !message.author || message.author.bot) return;

            const logChannel = getLogChannel(message.guild, "message-log");
            if (!logChannel) return;

            const attachments = Array.from(message.attachments.values());
            let files = attachments.length > 0 ? attachments.map(att => ({ attachment: att.url, name: att.name })) : [];

            let stickersText = formatStickers(message.stickers);
            if (message.stickers && message.stickers.size > 0) {
                for (const [_, st] of message.stickers) {
                    if (st.format !== 3 && st.format !== 4) { 
                        files.push({ attachment: st.url, name: `sticker_${st.name}.${st.format === 2 ? 'apng' : 'png'}` });
                    }
                }
            }

            const details = {
                "Kullanıcı": `${message.author} (\`${message.author.id}\`)`,
                "Kanal": `${message.channel} (\`${message.channel.id}\`)`
            };

            if (message.content) {
                details["Mesaj İçeriği"] = `\n\`\`\`\n${truncate(message.content, 1900)}\n\`\`\``;
            }

            if (stickersText) {
                details["Stickerlar"] = stickersText;
            }

            if (attachments.length > 0) {
                details["Dosya Bağlantıları"] = attachments.map(a => `[${a.name}](${a.url})`).join("\n");
            }

            await sendV2Log(logChannel, "Mesaj Silindi", `${message.author} adlı kullanıcı bir mesaj sildi.`, details, [], message.author.displayAvatarURL());

            if (files.length > 0) {
                await logChannel.send({ 
                    content: `> **${message.author.username}** adlı kullanıcının silinen mesajındaki medyalar:`, 
                    files: files 
                }).catch(err => {
                    logChannel.send({ content: `> ⚠️ **Medyalar yüklenemedi.** Boyut çok büyük veya Discord URL'yi iptal etmiş olabilir.` });
                });
            }
        } catch (err) { console.log(err); }
    },

messageUpdate: async (oldMessage, newMessage) => {
        try {
            if (!newMessage.guild || newMessage.webhookId || newMessage.author.bot) return;
            if (oldMessage.content === newMessage.content) return;

            const logChannel = getLogChannel(newMessage.guild, "message-log");
            if (!logChannel) return;

            const details = {
                "Kullanıcı": `${newMessage.author} (\`${newMessage.author.id}\`)`,
                "Kanal": `${newMessage.channel} (\`${newMessage.channel.id}\`)`,
                "Mesaj Linki": `[Mesaja Git](${newMessage.url})`
            };

            if (oldMessage.content) details["Eski Mesaj"] = `\n\`\`\`\n${truncate(oldMessage.content, 900)}\n\`\`\``;
            if (newMessage.content) details["Yeni Mesaj"] = `\n\`\`\`\n${truncate(newMessage.content, 900)}\n\`\`\``;

            sendV2Log(logChannel, "Mesaj Düzenlendi", `${newMessage.author} bir mesajı düzenledi.`, details, [], newMessage.author.displayAvatarURL());
        } catch (err) { }
    },

channelCreate: async (channel) => {
        try {
            if (!channel.guild) return;
            const logChannel = getLogChannel(channel.guild, "channel-log");
            if (!logChannel) return;

            const entry = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Kanal Oluşturuldu", `Yeni bir kanal oluşturuldu: ${channel}`, {
                "Oluşturan": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Kanal ID": channel.id,
                "Tip": getChannelType(channel.type),
                "Kategori": channel.parent ? channel.parent.name : "Yok"
            });
        } catch (err) { }
    },

channelDelete: async (channel) => {
        try {
            if (!channel.guild) return;
            const logChannel = getLogChannel(channel.guild, "channel-log");
            if (!logChannel) return;

            const entry = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Kanal Silindi", `\`${channel.name}\` adlı kanal silindi.`, {
                "Silinen Kişi": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Kanal ID": channel.id,
                "Tip": getChannelType(channel.type),
                "Kategori": channel.parent ? channel.parent.name : "Yok"
            });
        } catch (err) { }
    },

channelUpdate: async (oldChannel, newChannel) => {
        try {
            if (!newChannel.guild) return;
            const logChannel = getLogChannel(newChannel.guild, "channel-log");
            if (!logChannel) return;

            const entry = await newChannel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            let changes = [];
            if (oldChannel.name !== newChannel.name) changes.push(`**İsim:** \`${oldChannel.name}\` => \`${newChannel.name}\``);
            if (oldChannel.type !== newChannel.type) changes.push(`**Tip:** \`${getChannelType(oldChannel.type)}\` => \`${getChannelType(newChannel.type)}\``);
            if (oldChannel.parentId !== newChannel.parentId) {
                const oldCat = oldChannel.parent ? oldChannel.parent.name : "Yok";
                const newCat = newChannel.parent ? newChannel.parent.name : "Yok";
                changes.push(`**Kategori:** \`${oldCat}\` => \`${newCat}\``);
            }

            if (!changes.length) return;

            sendV2Log(logChannel, "Kanal Güncellendi", `Kanal güncellendi: ${newChannel}`, {
                "Güncelleyen": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Değişiklikler": "\n" + changes.join("\n")
            });
        } catch (err) { }
    },

roleCreate: async (role) => {
        try {
            const logChannel = getLogChannel(role.guild, "role-log");
            if (!logChannel) return;

            const entry = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Rol Oluşturuldu", `Yeni bir rol oluşturuldu: ${role}`, {
                "Oluşturan": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Rol ID": `\`${role.id}\``,
                "Renk": `\`${role.hexColor}\``,
                "Pozisyon": `\`${role.position}\``
            });
        } catch (err) { }
    },

roleDelete: async (role) => {
        try {
            const logChannel = getLogChannel(role.guild, "role-log");
            if (!logChannel) return;

            const entry = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Rol Silindi", `\`${role.name}\` adlı rol silindi.`, {
                "Silen Kişi": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Rol ID": `\`${role.id}\``
            });
        } catch (err) { }
    },

roleUpdate: async (oldRole, newRole) => {
        try {
            const logChannel = getLogChannel(newRole.guild, "role-log");
            if (!logChannel) return;

            const entry = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            let changes = [];
            if (oldRole.name !== newRole.name) changes.push(`**İsim:** \`${oldRole.name}\` => \`${newRole.name}\``);
            if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Renk:** \`${oldRole.hexColor}\` => \`${newRole.hexColor}\``);
            if (oldRole.hoist !== newRole.hoist) changes.push(`**Listede Ayrı Göster:** \`${oldRole.hoist}\` => \`${newRole.hoist}\``);
            if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Etiketlenebilir:** \`${oldRole.mentionable}\` => \`${newRole.mentionable}\``);
            if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push(`**İzinler:** Güncellendi.`);

            if (!changes.length) return;

            sendV2Log(logChannel, "Rol Güncellendi", `Rol güncellendi: ${newRole}`, {
                "Güncelleyen": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Rol ID": `\`${newRole.id}\``,
                "Değişiklikler": "\n" + changes.join("\n")
            });
        } catch (err) { }
    },

guildMemberAdd: async (member) => {
        try {
            const logChannel = getLogChannel(member.guild, "member-log");
            if (!logChannel) return;

            sendV2Log(logChannel, "Katılım Sağlandı", `${member} (${member.user.tag}) sunucuya katıldı.`, {
                "Hesap Oluşturulma": `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                "Üye Sayısı": member.guild.memberCount
            }, [], member.user.displayAvatarURL());
        } catch (err) { }
    },

guildMemberRemove: async (member) => {
        try {
            const logChannel = getLogChannel(member.guild, "member-log");
            if (!logChannel) return;

            sendV2Log(logChannel, "Ayrıldı", `${member} (${member.user.tag}) sunucudan ayrıldı.`, {
                "Kullanıcı ID": member.id
            }, [], member.user.displayAvatarURL());
        } catch (err) { }
    },

guildMemberUpdate: async (oldMember, newMember) => {
        try {
            const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
            const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

            if (addedRoles.size > 0 || removedRoles.size > 0) {
                const memberLogChannel = getLogChannel(newMember.guild, "member-log");
                await new Promise(r => setTimeout(r, 1000));
                const auditLogs = await newMember.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberRoleUpdate }).catch(() => null);
                const entry = auditLogs ? auditLogs.entries.find(e => e.target.id === newMember.id && e.createdTimestamp > Date.now() - 5000) : null;

                let adminID = entry?.executor?.id || "Bilinmiyor";
                let isBot = entry?.executor?.bot || false;

                if (isBot) {
                    if (client.roleLogCache && client.roleLogCache.has(newMember.id)) {
                        adminID = client.roleLogCache.get(newMember.id);
                        client.roleLogCache.delete(newMember.id); 
                    } else {
                        return; 
                    }
                }

                const executor = `<@${adminID}>`;

                if (memberLogChannel) {
                    if (addedRoles.size > 0) {
                        sendV2Log(memberLogChannel, "Rol Verildi", `${newMember} kullanıcısına rol verildi.`, {
                            "İşlemi Yapan": executor,
                            "Roller": addedRoles.map(r => `${r} (\`${r.id}\`)`).join("\n")
                        }, [], newMember.user.displayAvatarURL());
                    }
                    if (removedRoles.size > 0) {
                        sendV2Log(memberLogChannel, "Rol Alındı", `${newMember} kullanıcısından rol alındı.`, {
                            "İşlemi Yapan": executor,
                            "Roller": removedRoles.map(r => `${r} (\`${r.id}\`)`).join("\n")
                        }, [], newMember.user.displayAvatarURL());
                    }
                }

                for (const role of addedRoles.values()) {
                    const isDuplicate = await RoleLog.findOne({
                        userID: newMember.id,
                        roleID: role.id,
                        type: "ADD",
                        date: { $gt: Date.now() - 3000 }
                    });
                    if (isDuplicate) continue;

                    await RoleLog.create({
                        guildID: newMember.guild.id,
                        userID: newMember.id,
                        adminID: adminID,
                        roleID: role.id,
                        type: "ADD",
                        method: isBot ? "BOT" : "MANUAL"
                    }).catch(() => { });
                }

                for (const role of removedRoles.values()) {
                    const isDuplicate = await RoleLog.findOne({
                        userID: newMember.id,
                        roleID: role.id,
                        type: "REMOVE",
                        date: { $gt: Date.now() - 3000 }
                    });
                    if (isDuplicate) continue;

                    await RoleLog.create({
                        guildID: newMember.guild.id,
                        userID: newMember.id,
                        adminID: adminID,
                        roleID: role.id,
                        type: "REMOVE",
                        method: isBot ? "BOT" : "MANUAL"
                    }).catch(() => { });
                }
            }

            if (oldMember.nickname !== newMember.nickname) {
                const logChannel = getLogChannel(newMember.guild, "name-log");
                if (logChannel) {
                    const entry = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberUpdate }).then(audit => audit.entries.first());
                    if (entry?.executor?.bot) return;
                    sendV2Log(logChannel, "İsim Değişikliği", `${newMember} ismini değiştirdi.`, {
                        "Eski İsim": oldMember.nickname || oldMember.user.username,
                        "Yeni İsim": newMember.nickname || newMember.user.username,
                        "Değiştiren": entry?.executor ? `${entry.executor}` : "Kullanıcı/Bilinmiyor"
                    }, [], newMember.user.displayAvatarURL());
                }
            }
        } catch (err) { }
    },

emojiCreate: async (emoji) => {
        try {
            const logChannel = getLogChannel(emoji.guild, "emoji-log");
            if (!logChannel) return;

            const entry = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Emoji Oluşturuldu", `Emoji: ${emoji} (\`${emoji.name}\`)`, {
                "Oluşturan": entry?.executor ? entry.executor.toString() : "Bilinmiyor"
            });
        } catch (err) { }
    },

emojiDelete: async (emoji) => {
        try {
            const logChannel = getLogChannel(emoji.guild, "emoji-log");
            if (!logChannel) return;

            const entry = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiDelete, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Emoji Silindi", `Emoji: \`${emoji.name}\``, {
                "Silen Kişi": entry?.executor ? entry.executor.toString() : "Bilinmiyor"
            });
        } catch (err) { }
    },

emojiUpdate: async (oldEmoji, newEmoji) => {
        try {
            const logChannel = getLogChannel(newEmoji.guild, "emoji-log");
            if (!logChannel) return;
            if (oldEmoji.name === newEmoji.name) return;

            const entry = await newEmoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiUpdate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            sendV2Log(logChannel, "Emoji Güncellendi", `Emoji: ${newEmoji}`, {
                "Güncelleyen": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Eski İsim": oldEmoji.name,
                "Yeni İsim": newEmoji.name
            });
        } catch (err) { }
    },

guildUpdate: async (oldGuild, newGuild) => {
        try {
            const logChannel = getLogChannel(newGuild, "server-log");
            if (!logChannel) return;

            const entry = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 }).then(audit => audit.entries.first());
            if (entry?.executor?.bot) return;

            let changes = [];
            if (oldGuild.name !== newGuild.name) changes.push(`**İsim:** \`${oldGuild.name}\` => \`${newGuild.name}\``);
            if (oldGuild.icon !== newGuild.icon) changes.push(`**İkon:** ${oldGuild.iconURL() ? `[Eski](${oldGuild.iconURL()})` : "Yok"} => ${newGuild.iconURL() ? `[Yeni](${newGuild.iconURL()})` : "Yok"}`);
            if (oldGuild.banner !== newGuild.banner) changes.push(`**Banner:** ${oldGuild.bannerURL() ? `[Eski](${oldGuild.bannerURL()})` : "Yok"} => ${newGuild.bannerURL() ? `[Yeni](${newGuild.bannerURL()})` : "Yok"}`);
            if (oldGuild.description !== newGuild.description) changes.push(`**Açıklama:** \`${oldGuild.description || "Yok"}\` => \`${newGuild.description || "Yok"}\``);

            if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) changes.push(`**Vanity URL:** \`${oldGuild.vanityURLCode || "Yok"}\` => \`${newGuild.vanityURLCode || "Yok"}\``);

            if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
                const oldAfk = oldGuild.afkChannelId ? `<#${oldGuild.afkChannelId}>` : "Yok";
                const newAfk = newGuild.afkChannelId ? `<#${newGuild.afkChannelId}>` : "Yok";
                changes.push(`**AFK Kanalı:** ${oldAfk} => ${newAfk}`);
            }

            if (oldGuild.afkTimeout !== newGuild.afkTimeout) changes.push(`**AFK Süresi:** \`${oldGuild.afkTimeout / 60} dk\` => \`${newGuild.afkTimeout / 60} dk\``);

            if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
                const oldSys = oldGuild.systemChannelId ? `<#${oldGuild.systemChannelId}>` : "Yok";
                const newSys = newGuild.systemChannelId ? `<#${newGuild.systemChannelId}>` : "Yok";
                changes.push(`**Sistem Kanalı:** ${oldSys} => ${newSys}`);
            }

            if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
                const levels = { 0: "Yok", 1: "Düşük", 2: "Orta", 3: "Yüksek", 4: "En Yüksek" };
                changes.push(`**Doğrulama Seviyesi:** \`${levels[oldGuild.verificationLevel] || oldGuild.verificationLevel}\` => \`${levels[newGuild.verificationLevel] || newGuild.verificationLevel}\``);
            }

            if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
                const filters = { 0: "Kapalı", 1: "Rolsüz Üyeler", 2: "Herkes" };
                changes.push(`**İçerik Filtresi:** \`${filters[oldGuild.explicitContentFilter] || oldGuild.explicitContentFilter}\` => \`${filters[newGuild.explicitContentFilter] || newGuild.explicitContentFilter}\``);
            }

            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
                const notifs = { 0: "Tüm Mesajlar", 1: "Sadece @Bahsetmeler" };
                changes.push(`**Varsayılan Bildirimler:** \`${notifs[oldGuild.defaultMessageNotifications] || oldGuild.defaultMessageNotifications}\` => \`${notifs[newGuild.defaultMessageNotifications] || newGuild.defaultMessageNotifications}\``);
            }

            if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
                changes.push(`**Boost Çubuğu:** \`${oldGuild.premiumProgressBarEnabled ? "Açık" : "Kapalı"}\` => \`${newGuild.premiumProgressBarEnabled ? "Açık" : "Kapalı"}\``);
            }

            if (oldGuild.rulesChannelId !== newGuild.rulesChannelId) {
                const oldRules = oldGuild.rulesChannelId ? `<#${oldGuild.rulesChannelId}>` : "Yok";
                const newRules = newGuild.rulesChannelId ? `<#${newGuild.rulesChannelId}>` : "Yok";
                changes.push(`**Kurallar Kanalı:** ${oldRules} => ${newRules}`);
            }

            if (oldGuild.publicUpdatesChannelId !== newGuild.publicUpdatesChannelId) {
                const oldPub = oldGuild.publicUpdatesChannelId ? `<#${oldGuild.publicUpdatesChannelId}>` : "Yok";
                const newPub = newGuild.publicUpdatesChannelId ? `<#${newGuild.publicUpdatesChannelId}>` : "Yok";
                changes.push(`**Topluluk Güncellemeleri Kanalı:** ${oldPub} => ${newPub}`);
            }

            if (oldGuild.ownerId !== newGuild.ownerId) {
                changes.push(`**Sunucu Sahibi:** <@${oldGuild.ownerId}> => <@${newGuild.ownerId}>`);
            }

            const addedFeatures = newGuild.features.filter(f => !oldGuild.features.includes(f));
            const removedFeatures = oldGuild.features.filter(f => !newGuild.features.includes(f));
            if (addedFeatures.length > 0) changes.push(`**Eklenen Özellikler:** \`${addedFeatures.join(", ")}\``);
            if (removedFeatures.length > 0) changes.push(`**Kaldırılan Özellikler:** \`${removedFeatures.join(", ")}\``);

            if (!changes.length) return;

            sendV2Log(logChannel, "Sunucu Güncellendi", `Sunucu ayarları güncellendi.`, {
                "Güncelleyen": entry?.executor ? entry.executor.toString() : "Bilinmiyor",
                "Değişiklikler": "\n" + changes.join("\n")
            });
        } catch (err) { }
    }
};