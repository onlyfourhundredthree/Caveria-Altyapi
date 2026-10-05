const { AuditLogEvent } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (ban) => {
    const guild = ban.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== ban.user.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "memberBan");
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "memberBan", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Ban Limiti Aşıldı");
        await guild.members.unban(ban.user.id, "Guard: Hatalı Ban Geri Alma").catch(() => { });

        sendGuardLog(guild, executor, "Ban İşlemi", `Kullanıcı: **${ban.user.tag}**\nİşlem: **${check.action}**\nDurum: **Ban geri alındı.**`);
    }
};
