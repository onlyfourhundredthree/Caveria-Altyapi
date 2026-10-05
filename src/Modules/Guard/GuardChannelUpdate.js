const { AuditLogEvent } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (oldChannel, newChannel) => {
    const guild = newChannel.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelUpdate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== newChannel.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "channelUpdate");
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "channelUpdate", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Kanal Düzenleme Limiti Aşıldı");


        await newChannel.edit({
            name: oldChannel.name,
            topic: oldChannel.topic,
            nsfw: oldChannel.nsfw,
            rateLimitPerUser: oldChannel.rateLimitPerUser,
            userLimit: oldChannel.userLimit,
            bitrate: oldChannel.bitrate,
            permissionOverwrites: oldChannel.permissionOverwrites.cache
        }, "Guard: Limit Aşımı Geri Alma").catch(() => { });

        sendGuardLog(guild, executor, "Kanal Düzenleme", `Kanal: **${newChannel.name}**\nİşlem: **${check.action}**\nDurum: **Değişiklikler geri alındı.**`);
    }
};
