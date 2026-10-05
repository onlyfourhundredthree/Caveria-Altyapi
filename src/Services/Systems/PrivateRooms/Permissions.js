const { PermissionFlagsBits } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

class PermissionManager {
    static getBasePermissions(member, profile = null) {
        const guild = member.guild;
        const overwrites = [
            {
                id: guild.id, 
                deny: [PermissionFlagsBits.Connect],
                allow: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: member.id, 
                allow: [
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.Stream,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.MuteMembers,
                    PermissionFlagsBits.DeafenMembers,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.PrioritySpeaker
                ]
            }
        ];

        if (profile) {

            for (const modId of profile.moderators || []) {
                overwrites.push({
                    id: modId,
                    allow: [
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak,
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.MoveMembers
                    ]
                });
            }

            for (const allowedId of profile.allowedUsers || []) {
                if (profile.moderators.includes(allowedId)) continue;
                overwrites.push({
                    id: allowedId,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                });
            }

            for (const blockedId of profile.blockedUsers || []) {
                overwrites.push({
                    id: blockedId,
                    deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                });
            }
        }

        return overwrites;
    }

    static async applyLock(channel, isLocked) {
        const guild = channel.guild;
        await channel.permissionOverwrites.edit(guild.id, {
            Connect: !isLocked
        });
    }

    static async syncProfilePermissions(channel, member, profile) {
        const overwrites = this.getBasePermissions(member, profile);
        await channel.permissionOverwrites.set(overwrites);

        if (profile.userLimit !== undefined) {
            await channel.setUserLimit(profile.userLimit);
        }

        await channel.permissionOverwrites.edit(channel.guild.id, {
            Speak: profile.permissions.speak,
            Stream: profile.permissions.stream,
            Connect: profile.permissions.connect 
        });
    }
}

module.exports = PermissionManager;
