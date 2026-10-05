const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    PermissionFlagsBits
} = require("discord.js");
const ConfigManager = require("./ConfigManager");
const PermanentRoomProfile = require("../Database/PermanentRoomProfile");
const PermanentRoom = require("../Database/PermanentRoom");

class PermanentRoomUtils {
    static async sendControlPanel(channel, room) {
        let profileData = await PermanentRoomProfile.findOne({ userId: room.ownerID });
        if (!profileData) {
            profileData = await PermanentRoomProfile.create({
                userId: room.ownerID,
                profiles: [{
                    profileId: "default",
                    profileName: "Varsayılan",
                    channelName: room.channelName,
                    userLimit: channel.userLimit || 0,
                    moderators: room.moderators || [],
                    allowedUsers: room.teamMembers || []
                }],
                lastUsedProfileId: "default"
            });
        }

        const components = await this.getControlComponents(channel, room, profileData);

        if (room.panelMessageID) {
            const oldMsg = await channel.messages.fetch(room.panelMessageID).catch(() => null);
            if (oldMsg) await oldMsg.delete().catch(() => { });
        }

        const newMsg = await channel.send({
            components: components
        });

        await PermanentRoom.findByIdAndUpdate(room._id, { $set: { panelMessageID: newMsg.id } });
    }

    static async getControlComponents(channel, room, profileData) {
        const profiles = profileData ? profileData.profiles : [];
        const lastUsedId = profileData ? profileData.lastUsedProfileId : null;

        const profileOptions = [{ label: "Profil Oluştur", value: "CREATE_NEW_PROFILE", emoji: "➕" }];
        profiles.forEach(p => {
            profileOptions.push({
                label: p.profileName,
                value: `PSELECT_PROFILE_${p.profileId}`,
                description: `Oda Adı: ${p.channelName || 'Varsayılan'}`,
                emoji: "📄",
                default: p.profileId === lastUsedId
            });
        });

        const profileRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("POD_PROFILE_SELECT")
                .setPlaceholder("Profil seçin.")
                .addOptions(profileOptions)
        );

        const currentMods = [];
        const currentAllowed = [];
        const currentBlocked = [];

        channel.permissionOverwrites.cache.forEach(overwrite => {
            if (overwrite.type !== 1) return; 
            if (overwrite.id === room.ownerID) return;

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
                .setCustomId("POD_MOD_SELECT")
                .setPlaceholder("Kanal moderatörlerini seçin.")
                .setMaxValues(25)
                .setDefaultUsers(currentMods.slice(0, 25))
        );
        const allowRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("POD_ALLOW_SELECT")
                .setPlaceholder("Kanala girebilecek üyeleri seçin.")
                .setMaxValues(25)
                .setDefaultUsers(currentAllowed.slice(0, 25))
        );
        const blockRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("POD_BLOCK_SELECT")
                .setPlaceholder("Kanaldan yasaklanacak üyeleri seçin.")
                .setMaxValues(25)
                .setDefaultUsers(currentBlocked.slice(0, 25))
        );

        const everyonePerm = channel.permissionOverwrites.cache.get(channel.guild.id);
        const isLocked = everyonePerm && everyonePerm.deny.has(PermissionFlagsBits.Connect);
        const hasCamera = everyonePerm && everyonePerm.allow.has(PermissionFlagsBits.Stream);
        const adminStatus = profileData && profileData.profiles.length > 0 ? profileData.profiles[0].adminEntryControl : false;

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

        let lockEmoji = getEmoji("pr_unlocked");
        if (isLocked && !adminStatus) lockEmoji = getEmoji("pr_locked");
        if (isLocked && adminStatus) lockEmoji = getEmoji("pr_adminguardon");

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("POD_BTN_RENAME").setEmoji(getEmoji("pr_edit")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("POD_BTN_LIMIT").setEmoji(getEmoji("pr_community")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("POD_BTN_LOCK").setEmoji(lockEmoji).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("POD_BTN_CAMERA").setEmoji(hasCamera ? getEmoji("pr_camerayes") : getEmoji("pr_camerano")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("POD_BTN_ROLE").setEmoji((ConfigManager.get("Emojis.toji_cloud") || "✨")).setStyle(ButtonStyle.Secondary)
        );

        return [profileRow, modRow, allowRow, blockRow, buttonRow];
    }
}

module.exports = PermanentRoomUtils;
