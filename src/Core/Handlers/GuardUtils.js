const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const ConfigManager = require("./ConfigManager");
const Punitives = require("../Database/Punitives");

async function punishGuardViolation(guild, member, executor, action, reason) {
    if (!member) return;

    const normalizedAction = action?.toLowerCase().replace(/ed$/, "").replace(/ped$/, "p");

    try {
        if (normalizedAction === "ban") {
            if (member.bannable) {
                await member.ban({ reason: `Guard: ${reason}` });
            } else {
                console.error(`[Guard] ${member.user?.tag || member.id} banlanamadı (bannable: false).`);
            }
        } else if (normalizedAction === "kick") {
            if (member.kickable) {
                await member.kick(`Guard: ${reason}`);
            } else {
                console.error(`[Guard] ${member.user?.tag || member.id} kicklenemedi (kickable: false).`);
            }
        } else if (normalizedAction === "jail") {
            const jailRole = ConfigManager.get("Roles.Jailed");
            if (!jailRole) {
                console.error(`[Guard] CEZA UYGULANAMADI: Config'de 'Roles.Jailed' ayarlı değil! Kullanıcı: ${member.user?.tag || member.id}`);
                return;
            }
            if (!guild.roles.cache.has(jailRole)) {
                console.error(`[Guard] CEZA UYGULANAMADI: Jailed rolü (${jailRole}) sunucuda bulunamadı! Kullanıcı: ${member.user?.tag || member.id}`);
                return;
            }
            if (member.manageable) {
                await member.roles.set([jailRole], `Guard: ${reason}`);
            } else {
                console.error(`[Guard] ${member.user?.tag || member.id} jail yapılamadı (manageable: false). Botun rolü daha yüksekte olmalı.`);
            }
        } else if (normalizedAction === "removerol" || normalizedAction === "removeroles") {
            if (member.manageable) {
                const dangerousPerms = [
                    PermissionsBitField.Flags.Administrator,
                    PermissionsBitField.Flags.ManageRoles,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageWebhooks,
                    PermissionsBitField.Flags.ManageGuild,
                    PermissionsBitField.Flags.BanMembers,
                    PermissionsBitField.Flags.KickMembers
                ];
                const botMember = member.guild.members.me;
                const rolesWithDanger = member.roles.cache.filter(r =>
                    r.permissions.any(dangerousPerms) &&
                    !r.managed &&
                    botMember && r.position < botMember.roles.highest.position
                );
                if (rolesWithDanger.size > 0) {
                    await member.roles.remove(rolesWithDanger, `Guard: ${reason}`);
                }
            } else {
                console.error(`[Guard] ${member.user?.tag || member.id} rolleri alınamadı (manageable: false).`);
            }
        } else {
            console.error(`[Guard] Tanınmayan ceza türü: "${action}" (normalized: "${normalizedAction}"). Kullanıcı: ${member.user?.tag || member.id}`);
        }

        let punitiveType = null;
        let isActive = true;
        if (normalizedAction === "ban") {
            punitiveType = "Yasaklama";
        } else if (normalizedAction === "kick") {
            punitiveType = "Atılma";
            isActive = false;
        } else if (normalizedAction === "jail") {
            punitiveType = "Cezalı";
        }

        if (punitiveType && executor) {
            try {
                const lastPunitive = await Punitives.findOne().sort({ No: -1 });
                const newNo = lastPunitive ? lastPunitive.No + 1 : 1;
                await new Punitives({
                    No: newNo,
                    Member: member.id,
                    Staff: executor.id,
                    Type: punitiveType,
                    Reason: `Guard: ${reason}`,
                    Duration: null,
                    Date: Date.now(),
                    Expried: null,
                    Remover: null,
                    Active: isActive,
                    LastPunishType: null
                }).save();
            } catch (e) {
                console.error("[Guard] Sicil kaydı oluşturulamadı:", e);
            }
        }
    } catch (err) {
        console.error(`[Guard] Ceza uygulama hatası (action: ${action}, user: ${member.user?.tag || member.id}):`, err.message);
    }
}

async function applyPunishment(guild, member, executor, action, reason) {
    if (!member) {
        console.error(`[Guard] applyPunishment çağrıldı ama member null! Action: ${action}, Reason: ${reason}`);
        return;
    }
    await punishGuardViolation(guild, member, executor, action, reason);
}

async function sendGuardLog(guild, executor, type, description) {
    const typeLower = type.toLowerCase();

    const specMap = {
        rol: "GuardRoleLog",
        kanal: "GuardChannelLog",
        ban: "GuardBanLog",
        kick: "GuardBanLog",
        emoji: "GuardEmojiLog",
        webhook: "GuardWebhookLog",
        bot: "GuardBotLog",
        sunucu: "GuardServerLog"
    };

    const guardNameMap = {
        rol: "guard-role-log",
        kanal: "guard-channel-log",
        ban: "guard-ban-log",
        kick: "guard-ban-log",
        emoji: "guard-emoji-log",
        webhook: "guard-webhook-log",
        bot: "guard-bot-log",
        sunucu: "guard-server-log"
    };

    let channelId = null;
    let channel = null;

    for (const [keyword, configKey] of Object.entries(specMap)) {
        if (typeLower.includes(keyword)) {
            const channelName = guardNameMap[keyword];
            if (channelName) {
                channel = guild.channels.cache.find(x => x.isTextBased() && x.name === channelName) || null;
            }
            if (!channel) {
                channelId = ConfigManager.get(`Channels.${configKey}`);
                if (channelId) channel = guild.channels.cache.get(channelId) || null;
            }
            break;
        }
    }

    if (!channel || !channel.isTextBased()) {
        console.error(`[Guard] Log kanalı bulunamadı! Tür: ${type}, Guild: ${guild.id}`);
        return;
    }

    const emojis = ConfigManager.get("Emojis") || {};
    const shield = emojis.toji_staff || "";
    const nokta = emojis.toji_nokta || "-";
    const iptal = emojis.toji_iptal || "";

    const executorText = executor?.id ? `<@${executor.id}> (\`${executor.id}\`)` : String(executor);

    const descLines = description.split("\n").filter(l => l.trim());
    const details = descLines.map(l => `> ${nokta} ${l.trim()}`).join("\n");

    const v2Payload = [
        {
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: guild.iconURL({ extension: "png", size: 128 }) ? { type: 11, media: { url: guild.iconURL({ extension: "png", size: 128 }) } } : undefined,
                    components: [
                        { type: 10, content: `## ${shield} Guard: ${type}` }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `> **Yetkili:** ${executorText}\n\n${details}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `> ${iptal} Ceza uygulandı.`
                }
            ]
        }
    ];

    const { MessageFlags } = require("discord.js");
    try {
        await channel.send({
            components: v2Payload,
            flags: [MessageFlags.IsComponentsV2]
        });
    } catch (err) {
        console.error(`[Guard] Log gönderilemedi (Guild: ${guild.id}, Channel: ${channel.name}):`, err.message);
    }
}

function findConfigKeyById(obj, id, currentPath = "") {
    if (!obj) return null;
    if (typeof obj === "string" && obj === id) return currentPath;
    if (Array.isArray(obj)) {
        const index = obj.indexOf(id);
        if (index !== -1) return currentPath ? `${currentPath}.${index}` : `${index}`;
        return null;
    }
    if (typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
            const result = findConfigKeyById(value, id, currentPath ? `${currentPath}.${key}` : key);
            if (result) return result;
        }
    }
    return null;
}

function checkConfigDependency(id, type) {
    const configData = ConfigManager.get(type === "channel" ? "Channels" : "Roles");
    const path = findConfigKeyById(configData, id);
    return path ? (type === "channel" ? `Channels.${path}` : `Roles.${path}`) : null;
}

module.exports = {
    applyPunishment,
    sendGuardLog,
    checkConfigDependency
};
