const { AuditLogEvent, PermissionsBitField } = require("discord.js");
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (oldRole, newRole) => {
    const guild = newRole.guild;
    const now = Date.now();


    const isCriticalChange = !oldRole.permissions.has(PermissionsBitField.Flags.Administrator) && newRole.permissions.has(PermissionsBitField.Flags.Administrator);

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== newRole.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const settings = await GuardManager.getSettings(guild.id);
    const isWhitelisted = GuardManager.isWhitelisted(executor.id, member, "roleUpdate", settings);

    if (isCriticalChange && !isWhitelisted) {
        await newRole.setPermissions(oldRole.permissions, "Guard: İzinsiz Yönetici Verildi");

        await applyPunishment(guild, member, executor, "ban", "İzinsiz Yönetici Rolü Verdi");
        sendGuardLog(guild, executor, "Rol Güncelleme (KRİTİK)", `Rol: **${newRole.name}**\nDurum: **Yönetici izni vermeye çalıştı. İzin geri alındı ve yasaklandı.**`);
        return;
    }

    const check = await GuardManager.checkLimit(guild.id, executor.id, "roleUpdate");
    if (isWhitelisted) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Rol Düzenleme Limiti Aşıldı");

        if (oldRole.name !== newRole.name) await newRole.setName(oldRole.name).catch(() => { });
        if (oldRole.color !== newRole.color) await newRole.setColor(oldRole.color).catch(() => { });
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) await newRole.setPermissions(oldRole.permissions).catch(() => { });

        sendGuardLog(guild, executor, "Rol Düzenleme", `Rol: **${newRole.name}**\nİşlem: **${check.action}**\nDurum: **Değişiklikler geri alındı.**`);
    }
};
