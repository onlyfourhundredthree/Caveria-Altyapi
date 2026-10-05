const {
    ChannelType,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const PrivateRoomUser = require("../../../Core/Database/PrivateRoomUser");
const Room = require("../../../Core/Database/Rooms"); 
const PermissionManager = require("./Permissions");
const ProfileApplier = require("./ApplyProfile");
const { PrivateRoomLogger } = require("./PrivateRoomUtils");

const activeRooms = new Map(); 

class PrivateRoomManagement {
    static async createRoom(member) {
        const guild = member.guild;
        const config = ConfigManager.get("privateRooms");

        const existingData = await Room.findOne({ ownerID: member.id });
        if (existingData) {
            const channel = guild.channels.cache.get(existingData.channelID);
            if (channel) {
                await member.voice.setChannel(channel);
                return;
            } else {
                await Room.deleteOne({ ownerID: member.id });
            }
        }

        try {
            const channel = await guild.channels.create({
                name: `🔊 ${member.displayName}`,
                type: ChannelType.GuildVoice,
                parent: config.categoryId || null,
                permissionOverwrites: PermissionManager.getBasePermissions(member),
                userLimit: config.defaultUserLimit || 0
            });

            await Room.create({
                ownerID: member.id,
                channelID: channel.id,
                members: [member.id]
            });

            activeRooms.set(channel.id, {
                ownerId: member.id,
                deleteTimeout: null,
                lastEmptyAt: null
            });

            let userData = await PrivateRoomUser.findOne({ userId: member.id });
            let profileToApplyId = null;

            if (!userData || userData.profiles.length === 0) {
                const newProfile = {
                    profileId: Date.now().toString(),
                    profileName: `Profil 1`,
                    channelName: `🔊 ${member.displayName}`,
                    userLimit: config.defaultUserLimit || 0,
                    permissions: { connect: true, speak: true, video: true, stream: true },
                    moderators: [],
                    allowedUsers: [],
                    blockedUsers: []
                };
                if (!userData) {
                    userData = await PrivateRoomUser.create({ userId: member.id, profiles: [newProfile], lastUsedProfileId: newProfile.profileId });
                } else {
                    userData.profiles.push(newProfile);
                    userData.lastUsedProfileId = newProfile.profileId;
                    await userData.save();
                }
                profileToApplyId = newProfile.profileId;
            } else {
                profileToApplyId = userData.lastUsedProfileId || userData.profiles[userData.profiles.length - 1].profileId;
            }

            if (profileToApplyId) {
                await ProfileApplier.apply(channel, member, profileToApplyId);
            }

            await member.voice.setChannel(channel);

            await this.sendControlPanel(channel, member);

            await PrivateRoomLogger.log(guild, "Oda Oluşturuldu", `Sahip: ${member}\nKanal: ${channel}`, "#00ff00");

        } catch (error) {
            console.error("Error creating private room:", error);
        }
    }

    static async sendControlPanel(channel, member) {
        const userData = await PrivateRoomUser.findOne({ userId: member.id });
        const profiles = userData ? userData.profiles : [];
        const lastUsedId = userData ? userData.lastUsedProfileId : null;

        const profileOptions = [
            { label: "Profil Oluştur", value: "CREATE_NEW_PROFILE", emoji: "➕" }
        ];
        profiles.forEach(p => {
            profileOptions.push({
                label: p.profileName,
                value: `SELECT_PROFILE_${p.profileId}`,
                description: `Oda Adı: ${p.channelName || 'Varsayılan'}`,
                emoji: "📄",
                default: p.profileId === lastUsedId
            });
        });

        const profileRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("PR_PROFILE_SELECT")
                .setPlaceholder("Profil seçin.")
                .addOptions(profileOptions)
        );

        const currentMods = [];
        const currentAllowed = [];
        const currentBlocked = [];

        channel.permissionOverwrites.cache.forEach(overwrite => {
            if (overwrite.type !== 1) return; 
            if (overwrite.id === member.id) return; 

            const allow = overwrite.allow;
            const deny = overwrite.deny;

            if (deny.has(PermissionFlagsBits.Connect)) {
                currentBlocked.push(overwrite.id);
            } else if (allow.has(PermissionFlagsBits.MuteMembers)) {
                currentMods.push(overwrite.id);
            } else if (allow.has(PermissionFlagsBits.Connect)) {
                currentAllowed.push(overwrite.id);
            }
        });

        const modRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("PR_MOD_SELECT")
                .setPlaceholder("Kanal moderatörlerini seçin.")
                .setMaxValues(5)
                .setDefaultUsers(currentMods.filter(id => interaction.guild.members.cache.has(id)).slice(0, 5))
        );

        const allowRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("PR_ALLOW_SELECT")
                .setPlaceholder("Kanala girebilecek üyeleri seçin.")
                .setMaxValues(10)
                .setDefaultUsers(currentAllowed.filter(id => interaction.guild.members.cache.has(id)).slice(0, 10))
        );

        const blockRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("PR_BLOCK_SELECT")
                .setPlaceholder("Kanaldan yasaklanacak üyeleri seçin.")
                .setMaxValues(10)
                .setDefaultUsers(currentBlocked.filter(id => interaction.guild.members.cache.has(id)).slice(0, 10))
        );

        const everyonePerm = channel.permissionOverwrites.cache.get(channel.guild.id);
        const isLocked = everyonePerm && everyonePerm.deny.has(PermissionFlagsBits.Connect);
        const hasCamera = everyonePerm && everyonePerm.allow.has(PermissionFlagsBits.Stream);

        const adminStatus = userData && userData.profiles.length > 0 ? userData.profiles[0].adminEntryControl : false;

        const fallbackEmojis = {
            pr_edit: "📝",
            pr_community: "👥",
            pr_locked: "🔒",
            pr_unlocked: "🔓",
            pr_camerayes: "📷",
            pr_camerano: "📵",
            pr_adminguardon: "🛡️",
            pr_adminguardoff: "🔓"
        };
        const emojis = ConfigManager.get("Emojis") || {};
        const getEmoji = (key) => {
            const e = emojis[key];
            if (e && e.trim() !== "") return e;
            return fallbackEmojis[key] || "❓";
        };

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("PR_BTN_RENAME").setEmoji(getEmoji("pr_edit")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_LIMIT").setEmoji(getEmoji("pr_community")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_LOCK").setEmoji(isLocked ? getEmoji("pr_locked") : getEmoji("pr_unlocked")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_CAMERA").setEmoji(hasCamera ? getEmoji("pr_camerayes") : getEmoji("pr_camerano")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_ADMIN_CTRL").setEmoji(adminStatus ? getEmoji("pr_adminguardon") : getEmoji("pr_adminguardoff")).setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
            content: "\u200B", 
            components: [profileRow, modRow, allowRow, blockRow, buttonRow]
        });

    }

    static async handleEmptyRoom(channel) {
        const config = ConfigManager.get("privateRooms");
        const roomData = activeRooms.get(channel.id);
        if (!roomData) return;

        if (channel.members.size === 0) {
            roomData.lastEmptyAt = Date.now();
            roomData.deleteTimeout = setTimeout(async () => {
                await this.deleteRoom(channel);
            }, config.emptyDeleteTimeout || 60000);
        } else {
            if (roomData.deleteTimeout) {
                clearTimeout(roomData.deleteTimeout);
                roomData.deleteTimeout = null;
                roomData.lastEmptyAt = null;
            }
        }
    }

    static async deleteRoom(channel) {
        try {
            activeRooms.delete(channel.id);
            await Room.deleteOne({ channelID: channel.id });
            if (channel) await channel.delete("Empty room auto-delete").catch(() => null);
        } catch (err) {
            console.error("Error deleting room:", err);
        }
    }

    static async cleanupOrphanedRooms(guild) {
        const rooms = await Room.find();
        for (const data of rooms) {
            const channel = guild.channels.cache.get(data.channelID);
            if (!channel) {
                await Room.deleteOne({ _id: data._id });
                continue;
            }
            if (channel.members.size === 0) {
                await this.deleteRoom(channel);
            } else {
                activeRooms.set(channel.id, {
                    ownerId: data.ownerID,
                    deleteTimeout: null,
                    lastEmptyAt: null
                });
            }
        }
    }
}

module.exports = { PrivateRoomManagement, activeRooms };
