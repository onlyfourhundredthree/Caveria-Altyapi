const { AuditLogEvent } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (channel) => {
    const guild = channel.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== channel.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "channelCreate");
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "channelCreate", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Kanal Oluşturma Limiti Aşıldı");

        await channel.delete("Guard: Limit Aşımı").catch(() => { });

        sendGuardLog(guild, executor, "Kanal Oluşturma", `Kanal: **${channel.name}**\nİşlem: **${check.action}**\nDurum: **Kanal Silindi.**`);
    }
};
