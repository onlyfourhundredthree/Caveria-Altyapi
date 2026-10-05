const { AuditLogEvent } = require("discord.js");
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (member) => {
    const guild = member.guild;
    const now = Date.now();

    const auditKick = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
    if (auditKick) {
        const entry = auditKick.entries.first();
        if (entry && entry.target.id === member.id && entry.createdTimestamp > (now - 5000)) {
            const executor = entry.executor;
            const execMember = await guild.members.fetch(executor.id).catch(() => null);

            if (executor.id !== client.user.id && executor.id !== guild.ownerId) {
                const check = await GuardManager.checkLimit(guild.id, executor.id, "memberKick");
                const settings = await GuardManager.getSettings(guild.id);
                if (!GuardManager.isWhitelisted(executor.id, execMember, "memberKick", settings)) {
                    if (check && check.limited) {
                        await applyPunishment(guild, execMember, executor, check.action, "Kick Limiti Aşıldı");
                        sendGuardLog(guild, executor, "Kick İşlemi", `Kullanıcı: **${member.user.tag}**\nİşlem: **${check.action}**\nDurum: **Limit aşıldı.**`);
                    }
                }
            }
        }
    }
};
