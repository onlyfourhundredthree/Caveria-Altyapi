const { AuditLogEvent } = require("discord.js");
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (member) => {
    if (!member.user.bot) return;

    const guild = member.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== member.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const execMember = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const settings = await GuardManager.getSettings(guild.id);
    const isAllowed = GuardManager.isWhitelisted(executor.id, execMember, "botAdd", settings);

    if (!isAllowed) {
        const check = await GuardManager.checkLimit(guild.id, executor.id, "botAdd");

        if (check && check.limited) {
            await applyPunishment(guild, execMember, executor, check.action, "İzinsiz Bot Ekleme");
        }

        await member.kick("Guard: İzinsiz Bot Ekleme").catch(() => { });

        sendGuardLog(guild, executor, "Bot Ekleme", `Bot: **${member.user.tag}**\nİşlem: **Bot Kicklendi + Cezalandırma**`);
    }
};
