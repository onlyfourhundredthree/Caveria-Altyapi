const { AuditLogEvent } = require("discord.js");
const GuardManager = require("../../Core/Handlers/GuardManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (role) => {
    const guild = role.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== role.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "roleCreate");
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "roleCreate", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Rol Oluşturma Limiti Aşıldı");

        await role.delete("Guard: Limit Aşımı").catch(() => { });

        sendGuardLog(guild, executor, "Rol Oluşturma", `Rol: **${role.name}**\nİşlem: **${check.action}**\nDurum: **Rol Silindi.**`);
    }
};
