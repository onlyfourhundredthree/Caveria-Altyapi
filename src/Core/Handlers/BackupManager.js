const GuildBackup = require("../Database/GuildBackup");
const { ChannelType, PermissionsBitField } = require("discord.js");
const R2Uploader = require("../../Services/Systems/R2Uploader");

class BackupManager {


    static async createBackup(guild, type = "manual", progressCallback = null) {
        if (!guild) return null;

        if (progressCallback) progressCallback("Yedekleme başlatıldı, roller taranıyor...");

        const backupData = {
            guildID: guild.id,
            createdAt: Date.now(),
            backupType: type,
            roles: [],
            channels: [],
            emojis: [],
            stickers: [],
            guild: {}
        };

        const oldBackup = await GuildBackup.findOne({ guildID: guild.id }).select("roles").sort({ createdAt: -1 }).lean();
        const oldRolesMap = new Map();
        if (oldBackup && oldBackup.roles) {
            for (const r of oldBackup.roles) {
                oldRolesMap.set(r.id, r);
            }
        }

        if (guild.roles && guild.roles.cache) {
            const rolesArr = Array.from(guild.roles.cache.values()).sort((a, b) => b.position - a.position);
            const uploadPromises = [];

            for (const role of rolesArr) {
                if (role.managed) continue;

                let iconUrl = role.iconURL();
                let iconHash = role.icon; 
                
                const roleData = {
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    hoist: role.hoist,
                    position: role.position,
                    permissions: role.permissions.bitfield.toString(),
                    mentionable: role.mentionable,
                    icon: null,
                    iconHash: iconHash,
                    members: role.members.map(m => m.id)
                };

                backupData.roles.push(roleData);

                if (iconUrl) {
                    const oldRole = oldRolesMap.get(role.id);
                    if (oldRole && oldRole.iconHash === iconHash && oldRole.icon) {
                        roleData.icon = oldRole.icon;
                    } else {
                        const promise = R2Uploader.uploadFromDiscord(iconUrl, `${role.id}_icon.png`)
                            .then(url => { roleData.icon = url; })
                            .catch(err => { roleData.icon = iconUrl; });
                        uploadPromises.push(promise);
                    }
                }
            }

            if (uploadPromises.length > 0) {
                if (progressCallback) progressCallback(`Rol ikonları R2'ye yükleniyor... (${uploadPromises.length} adet)`);
                await Promise.all(uploadPromises);
            }
        }

        if (progressCallback) progressCallback(`✅ Roller yedeklendi (${backupData.roles.length} adet). Kanallar taranıyor...`);

        if (guild.channels && guild.channels.cache) {
            const channelsArr = Array.from(guild.channels.cache.values()).sort((a, b) => a.position - b.position);
            let channelCount = 0;
            for (const channel of channelsArr) {
                channelCount++;
                if (progressCallback && channelCount % 10 === 0) {
                    progressCallback(`Kanallar taranıyor... (${channelCount}/${channelsArr.length})`);
                }
                const overwrites = [];
                if (channel.permissionOverwrites && channel.permissionOverwrites.cache) {
                    channel.permissionOverwrites.cache.forEach(perm => {
                        overwrites.push({
                            id: perm.id,
                            type: perm.type,
                            allow: perm.allow.bitfield.toString(),
                            deny: perm.deny.bitfield.toString()
                        });
                    });
                }

                let messagesData = [];
                if (channel.isTextBased() && !channel.isThread()) {
                    try {
                        const fetched = await channel.messages.fetch({ limit: 50 }).catch(() => null);
                        if (fetched) {
                            const sortedMsgs = Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                            for (const msg of sortedMsgs) {
                                if (!msg.system && !msg.author.bot) {
                                    messagesData.push({
                                        authorId: msg.author.id,
                                        username: msg.author.username,
                                        avatar: msg.author.displayAvatarURL({ extension: 'png', size: 128 }),
                                        content: msg.content || "",
                                        embeds: msg.embeds.map(e => e.toJSON()),
                                        attachments: msg.attachments.map(a => a.url),
                                        createdAt: msg.createdTimestamp
                                    });
                                }
                            }
                        }
                    } catch (e) {}
                }

                backupData.channels.push({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    position: channel.position,
                    parentId: channel.parentId,
                    topic: channel.topic,
                    nsfw: channel.nsfw,
                    rateLimitPerUser: channel.rateLimitPerUser,
                    userLimit: channel.userLimit,
                    bitrate: channel.bitrate,
                    permissionOverwrites: overwrites,
                    messages: messagesData
                });
            }
        }

        if (progressCallback) progressCallback(`✅ Kanallar yedeklendi (${backupData.channels.length} adet). Diğer veriler taranıyor...`);

        const emojiPromises = [];
        if (guild.emojis && guild.emojis.cache) {
            const emojisArr = Array.from(guild.emojis.cache.values());
            for (const emoji of emojisArr) {
                const emojiUrl = emoji.imageURL();
                const emojiData = {
                    id: emoji.id,
                    name: emoji.name,
                    url: emojiUrl,
                    roles: emoji.roles.cache.map(r => r.id)
                };
                backupData.emojis.push(emojiData);

                if (emojiUrl) {
                    const ext = emoji.animated ? ".gif" : ".png";
                    const promise = R2Uploader.uploadFromDiscord(emojiUrl, `${emoji.id}${ext}`, "emojis")
                        .then(url => { emojiData.url = url; })
                        .catch(() => {});
                    emojiPromises.push(promise);
                }
            }
            if (emojiPromises.length > 0) {
                if (progressCallback) progressCallback(`Emojiler R2'ye yükleniyor... (${emojiPromises.length} adet)`);
                await Promise.all(emojiPromises);
            }
        }

        const stickerPromises = [];
        if (guild.stickers && guild.stickers.cache) {
            const stickersArr = Array.from(guild.stickers.cache.values());
            for (const sticker of stickersArr) {
                const stickerData = {
                    id: sticker.id,
                    name: sticker.name,
                    url: sticker.url,
                    tags: sticker.tags,
                    description: sticker.description
                };
                backupData.stickers.push(stickerData);

                if (sticker.url) {
                    const ext = ".png"; // Stickers are usually png or lottie, discord url doesn't strictly define it without fetch, but png works for S3 Key.
                    const promise = R2Uploader.uploadFromDiscord(sticker.url, `${sticker.id}${ext}`, "stickers")
                        .then(url => { stickerData.url = url; })
                        .catch(() => {});
                    stickerPromises.push(promise);
                }
            }
            if (stickerPromises.length > 0) {
                if (progressCallback) progressCallback(`Stickerlar R2'ye yükleniyor... (${stickerPromises.length} adet)`);
                await Promise.all(stickerPromises);
            }
        }

        backupData.guild = {
            name: guild.name,
            iconURL: guild.iconURL ? guild.iconURL() : null,
            bannerURL: guild.bannerURL ? guild.bannerURL() : null,
            splashURL: guild.splashURL ? guild.splashURL() : null,
            description: guild.description,
            verificationLevel: guild.verificationLevel,
            explicitContentFilter: guild.explicitContentFilter,
            preferredLocale: guild.preferredLocale,
            vanityURLCode: guild.vanityURLCode
        };

        // Cache counts for quick dashboard UI access without fetching massive arrays
        backupData.roleCount = backupData.roles.length;
        backupData.channelCount = backupData.channels.length;
        backupData.emojiCount = backupData.emojis.length;
        backupData.stickerCount = backupData.stickers.length;

        if (progressCallback) progressCallback(`✅ Veriler toplandı. Veritabanına kaydediliyor (Bu biraz sürebilir)...`);
        
        let savedBackup;
        try {
            savedBackup = await new GuildBackup(backupData).save();
            if (progressCallback) progressCallback(`🎉 Yedekleme başarıyla tamamlandı! ID: ${savedBackup._id}`);
        } catch (e) {
            console.error(e);
            return null;
        }

        // Eski yedekleri temizle (Artık 15 günden eski olanları siliyor)
        const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
        await GuildBackup.deleteMany({ guildID: guild.id, createdAt: { $lt: fifteenDaysAgo } }).catch(() => { });

        // Limit bazlı otomatik silme kaldırıldı, artık tarih bazlı silme (15 gün) geçerli.
        
        return savedBackup;
    }


    static async restoreRole(guild, roleID) {
        const backup = await GuildBackup.findOne({ guildID: guild.id }).select({ roles: 1, createdAt: 1 }).sort({ createdAt: -1 });
        if (!backup) return false;

        const roleData = backup.roles.find(r => r.id === roleID);
        if (!roleData) return false;

        const newRole = await guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            hoist: roleData.hoist,
            permissions: BigInt(roleData.permissions), 
            mentionable: roleData.mentionable,
            icon: roleData.icon || undefined,
            reason: "Guard: Backup Restore"
        }).catch(e => {
            console.error("Role restore create error:", e);
            // Fallback in case icon restore fails (e.g., tier doesn't allow it anymore)
            return guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                hoist: roleData.hoist,
                permissions: BigInt(roleData.permissions), 
                mentionable: roleData.mentionable,
                reason: "Guard: Backup Restore (Fallback without icon)"
            });
        });

        if (newRole) {
            await newRole.setPosition(roleData.position, { reason: "Guard: Restoring original position" }).catch(() => {});
        }
        if (roleData.members && roleData.members.length > 0) {
            let count = 0;
            for (const memberID of roleData.members) {
                const member = await guild.members.fetch(memberID).catch(() => null);
                if (member) {
                    await member.roles.add(newRole).catch(() => { });
                    count++;
                }
            }
        }

        return newRole;
    }


    static async restoreChannel(guild, channelID) {
        const backup = await GuildBackup.findOne({ guildID: guild.id }).select({ channels: 1, createdAt: 1 }).sort({ createdAt: -1 });
        if (!backup) return false;

        const chanData = backup.channels.find(c => c.id === channelID);
        if (!chanData) return false;

        let parent = null;
        if (chanData.parentId) {
            parent = guild.channels.cache.get(chanData.parentId);
        }

        const permissionOverwrites = [];
        if (chanData.permissionOverwrites) {
            for (const perm of chanData.permissionOverwrites) {
                const target = perm.type === 0 ? guild.roles.cache.get(perm.id) : await guild.members.fetch(perm.id).catch(() => null);
                if (target) {
                    permissionOverwrites.push({
                        id: perm.id,
                        allow: BigInt(perm.allow),
                        deny: BigInt(perm.deny)
                    });
                }
            }
        }

        const newChannel = await guild.channels.create({
            name: chanData.name,
            type: chanData.type,
            topic: chanData.topic,
            nsfw: chanData.nsfw,
            bitrate: chanData.bitrate,
            userLimit: chanData.userLimit,
            rateLimitPerUser: chanData.rateLimitPerUser,
            parent: parent,
            permissionOverwrites: permissionOverwrites,
            reason: "Guard: Backup Restore"
        });

        if (newChannel) {
            await newChannel.setPosition(chanData.position, { reason: "Guard: Restoring original position" }).catch(() => {});
        }

        return newChannel;
    }

    static async restoreEmoji(guild, emojiID) {
        const backup = await GuildBackup.findOne({ guildID: guild.id }).select({ emojis: 1, createdAt: 1 }).sort({ createdAt: -1 });
        if (!backup) return false;

        const emojiData = backup.emojis.find(e => e.id === emojiID);
        if (!emojiData || !emojiData.url) return false;

        try {
            const newEmoji = await guild.emojis.create({
                attachment: emojiData.url,
                name: emojiData.name,
                reason: "Guard: Backup Restore"
            });
            return newEmoji;
        } catch (e) {
            console.error("Emoji restore create error:", e);
            return false;
        }
    }

    static async restoreSticker(guild, stickerID) {
        const backup = await GuildBackup.findOne({ guildID: guild.id }).select({ stickers: 1, createdAt: 1 }).sort({ createdAt: -1 });
        if (!backup) return false;

        const stickerData = backup.stickers.find(s => s.id === stickerID);
        if (!stickerData || !stickerData.url) return false;

        try {
            const newSticker = await guild.stickers.create({
                file: stickerData.url,
                name: stickerData.name,
                tags: stickerData.tags || "",
                description: stickerData.description || "",
                reason: "Guard: Backup Restore"
            });
            return newSticker;
        } catch (e) {
            console.error("Sticker restore create error:", e);
            return false;
        }
    }
}

module.exports = BackupManager;
