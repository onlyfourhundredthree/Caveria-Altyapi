const Settings = require("../../../Settings.json");
const client = global.bot;
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { CronJob } = require("cron");
const { EmbedBuilder, MessageFlags } = require("discord.js");
const moment = require("moment");
const momentTz = require("moment-timezone");
require("moment-duration-format");

function getPrimaryGuildId(user) {
    if (!user) return null;
    const pg = user.primaryGuild || user.primary_guild;
    if (!pg) return null;
    if (typeof pg === "string") return pg;
    return pg.identityGuildId || pg.identity_guild_id || pg.guildId || pg.guild_id || null;
}

function getPrimaryGuildTag(user) {
    if (!user) return null;
    const pg = user.primaryGuild || user.primary_guild;
    if (!pg) return null;
    if (typeof pg === "object") return pg.tag || pg.clanTag || null;
    return null;
}

module.exports = async () => {
    if (!client.__tagPatchApplied) {
        client.__tagPatchApplied = true;

        const handleRawUserPatch = (rawUser) => {
            if (!rawUser || !rawUser.id) return;
            const cachedUser = client.users.cache.get(rawUser.id);
            if (cachedUser) {
                if ("primary_guild" in rawUser) {
                    cachedUser.primaryGuild = rawUser.primary_guild;
                    cachedUser.primary_guild = rawUser.primary_guild;
                } else if (!("primary_guild" in rawUser) && !("primaryGuild" in rawUser)) {
                    cachedUser.primaryGuild = null;
                    cachedUser.primary_guild = null;
                }
            }
        };

        client.ws.on("GUILD_MEMBERS_CHUNK", (payload) => {
            if (!payload.members) return;
            for (const member of payload.members) {
                if (member.user) handleRawUserPatch(member.user);
            }
        });
        client.ws.on("GUILD_MEMBER_ADD", (payload) => {
            if (payload.user) handleRawUserPatch(payload.user);
        });
        client.ws.on("GUILD_MEMBER_UPDATE", (payload) => {
            if (payload.user) handleRawUserPatch(payload.user);
        });
        client.ws.on("USER_UPDATE", (payload) => {
            if (payload) handleRawUserPatch(payload);
        });
    }

    async function processMemberTag(member) {
        if (!member || !member.user || member.user.bot) return;

        const guild = member.guild;
        const roleid = ConfigManager.get("Roles.Tag");
        const channelid = ConfigManager.get("Channels.Tag");
        const role = roleid ? guild.roles.cache.get(roleid) : null;
        const logChannel = channelid ? guild.channels.cache.get(channelid) : null;

        if (!role) return;

        const tagBanEnabled = ConfigManager.get("TagBan.Enabled");
        const bannedGuildIDs = ConfigManager.get("TagBan.BannedGuildIDs") || [];
        const tagBanAction = ConfigManager.get("TagBan.Action") || "rol";
        const bannedTagRoleId = ConfigManager.get("TagBan.BannedTagRole");
        const tagBanLogChannelId = ConfigManager.get("TagBan.LogChannel");
        const tagBanDmMessage = ConfigManager.get("TagBan.DmMessage") || "Yasaklı tag taşıdığınız tespit edildi.";
        const memberRoleId = ConfigManager.get("Roles.Member");

        const bannedTagRole = bannedTagRoleId ? guild.roles.cache.get(bannedTagRoleId) : null;
        const tagBanLogChannel = tagBanLogChannelId ? guild.channels.cache.get(tagBanLogChannelId) : null;
        const memberRole = memberRoleId ? guild.roles.cache.get(memberRoleId) : null;

        const user = member.user;
        const clanId = getPrimaryGuildId(user);
        const clanTag = getPrimaryGuildTag(user);
        const targetClanId = Settings.Main.GuildID;

        const isTagValid = Boolean(clanId && clanId === targetClanId);
        const hasRole = member.roles.cache.has(role.id);
        const hasBannedTagRole = bannedTagRole ? member.roles.cache.has(bannedTagRole.id) : false;

        const emojis = ConfigManager.get("Emojis") || {};
        const maravilhaIptal = emojis.toji_iptal ? `${emojis.toji_iptal} ` : "";
        const maravilhaOnay = emojis.toji_onay ? `${emojis.toji_onay} ` : "";

        // 1. Yasaklı Clan Tag Kontrolü
        const guardUsers = Array.isArray(Settings.RoleGuardUsers) ? Settings.RoleGuardUsers : [];
        const isOwnerOrGuard = ConfigManager.isOwner(member) || guardUsers.includes(member.id);

        if (tagBanEnabled && clanId && bannedGuildIDs.length > 0 && !isOwnerOrGuard) {
            const isBannedTag = bannedGuildIDs.includes(clanId);

            if (isBannedTag) {
                if (tagBanAction === "rol" && hasBannedTagRole) return;

                const actionText = tagBanAction === "ban" ? "sunucudan yasaklandınız" : "yasaklı tag rolü verildi";
                const dmMessageText = tagBanDmMessage
                    .replace(/{guild}/g, guild.name)
                    .replace(/{tag}/g, clanTag || "Yasaklı Tag")
                    .replace(/{action}/g, actionText);

                const dmV2 = [{
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: { type: 11, media: { url: guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png" } },
                            components: [{ type: 10, content: `# ${maravilhaIptal}Yasaklı Tag Bildirimi` }]
                        },
                        { type: 14 },
                        { type: 10, content: `> ${dmMessageText}` }
                    ]
                }];
                await member.send({ components: dmV2, flags: [1 << 15] }).catch(() => {});

                if (tagBanAction === "ban") {
                    try {
                        await member.ban({ reason: `Yasaklı klan tagı tespit edildi: ${clanTag}` });
                    } catch (err) {}
                } else {
                    if (bannedTagRole && !hasBannedTagRole) {
                        try {
                            await member.roles.add(bannedTagRole, `Yasaklı klan tagı tespit edildi: ${clanTag}`);
                            if (hasRole) {
                                await member.roles.remove(role).catch(() => {});
                            }
                        } catch (err) {}
                    }
                }
                return;
            }
        }

        // 2. Yasaklı Clan Tag Kaldırıldıysa Temizle
        if (tagBanEnabled && hasBannedTagRole && bannedTagRole) {
            const stillHasBannedTag = clanId && bannedGuildIDs.includes(clanId);

            if (!stillHasBannedTag) {
                try {
                    await member.roles.remove(bannedTagRole, "Yasaklı klan tagı artık taşınmıyor.");
                    if (memberRole && memberRole.id !== role?.id) {
                        await member.roles.add(memberRole, "Yasaklı klan tagı kaldırıldı, üye rolü verildi.").catch(() => {});
                    }
                } catch (err) {}
            }
        }

        // 3. Tag Rolü Verme / Alma İşlemleri
        if (hasRole && !isTagValid) {
            try {
                await member.roles.remove(role, "Klan tagı taşımadığı için rol alındı.");
            } catch (err) {}
        }

        if (!hasRole && isTagValid && !hasBannedTagRole) {
            try {
                await member.roles.add(role, "Klan tagı aldığı için rol verildi.");

                if (logChannel?.isTextBased()) {
                    const pg = user.primaryGuild || user.primary_guild;
                    const clanBadge = pg && pg.badge ? `https://cdn.discordapp.com/clan-badges/${clanId}/${pg.badge}.png?size=64` : (guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png");
                    const joinLogV2 = [{
                        type: 17,
                        components: [
                            {
                                type: 9,
                                accessory: { type: 11, media: { url: clanBadge } },
                                components: [{ type: 10, content: `# ${maravilhaOnay}Ailemize Katıldı!` }]
                            },
                            { type: 14 },
                            {
                                type: 10,
                                content: `> <@${member.id}>, sunucumuzun klan etiketini (**\`${clanTag || "Klan Tagı"}\`**) alarak ailemize katıldı!\n> \n> -# Bu klan etiketini taşıdığın sürece <@&${role.id}> ayrıcalıklarından faydalanacaksın. Desteğin için teşekkürler!`
                            }
                        ]
                    }];
                    await logChannel.send({ components: joinLogV2, allowedMentions: { roles: [] }, flags: [1 << 15] }).catch(() => {});
                }
            } catch (err) {}
        }
    }

    async function checkGuildTags() {
        try {
            const guildId = Settings.Main.GuildID;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return;

            let members;
            try {
                members = await guild.members.fetch({ force: true });
            } catch (err) {
                members = guild.members.cache;
            }

            for (const member of members.values()) {
                await processMemberTag(member);
            }
        } catch (err) {}
    }

    if (!client.__tagEventListenersAdded) {
        client.__tagEventListenersAdded = true;

        client.on("userUpdate", async (oldUser, newUser) => {
            if (newUser.bot) return;
            const guild = client.guilds.cache.get(Settings.Main.GuildID);
            if (!guild) return;

            const member = await guild.members.fetch({ user: newUser.id, force: true }).catch(() => null);
            if (member) await processMemberTag(member);
        });

        client.on("guildMemberUpdate", async (oldMember, newMember) => {
            if (newMember.user.bot || newMember.guild.id !== Settings.Main.GuildID) return;
            await processMemberTag(newMember);
        });
    }

    checkGuildTags();
    setInterval(checkGuildTags, 3 * 60 * 1000);
};
