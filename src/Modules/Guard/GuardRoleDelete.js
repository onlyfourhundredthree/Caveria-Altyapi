const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const GuardUtils = require("../../Core/Handlers/GuardUtils"); 
const { applyPunishment, sendGuardLog } = GuardUtils;

module.exports = async (role) => {
    const guild = role.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== role.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    // Config Koruması (Guard kapalı olsa bile çalışır)
    const configPath = GuardUtils.checkConfigDependency(role.id, "role");
    if (configPath) {
        const newRole = await guild.roles.create({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            position: role.position,
            mentionable: role.mentionable,
            reason: `Guard: Config Dependent Role Deleted`
        });
        
        const pathParts = configPath.split('.');
        const mainKey = pathParts.shift(); // "Roles"
        const nestedPath = pathParts.join('.');
        
        await ConfigManager.updateNested(mainKey, nestedPath, newRole.id, "Guard (Auto-Restore)");
        
        const warningEmbed = new EmbedBuilder()
            .setTitle("⚠️ Sistem Uyarı: Rol Koruması")
            .setColor("Red")
            .setDescription(`Silmeye çalıştığınız **@${role.name}** rolü botun sistem ayarlarında (\`${configPath}\`) kullanıldığı için silinmesi engellendi ve yeniden oluşturuldu.\nEğer bu rolü gerçekten silmek istiyorsanız, öncelikle sistem yapılandırmasından kaldırmanız veya değiştirmeniz gerekmektedir.`);
            
        if (member) await member.send({ embeds: [warningEmbed] }).catch(() => {});
        sendGuardLog(guild, executor, "Rol Silme (Config Koruması)", `Rol: **${role.name}**\nDurum: **Config'de (${configPath}) bulunduğu için anında geri yüklendi.**`);
        return; // Config koruması devreye girdiyse normal limitlere dahil etme.
    }

    const check = await GuardManager.checkLimit(guild.id, executor.id, "roleDelete");
    
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "roleDelete", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Rol Silme Limiti Aşıldı");

        const newRole = await guild.roles.create({
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            permissions: role.permissions,
            position: role.position,
            mentionable: role.mentionable,
            reason: "Guard: Silinen Rol Geri Yüklendi"
        });

        const GuildBackup = require("../../Core/Database/GuildBackup");
        const latestBackup = await GuildBackup.findOne({ guildID: guild.id }).sort({ createdAt: -1 }).lean();
        if (latestBackup) {
            const backupRole = latestBackup.roles.find(r => r.id === role.id);
            if (backupRole && backupRole.members && backupRole.members.length > 0) {
                let restoredCount = 0;
                for (const memberId of backupRole.members) {
                    const m = await guild.members.fetch(memberId).catch(() => null);
                    if (m) {
                        await m.roles.add(newRole.id, "Guard: Rol kurtarıldı, eski sahiplerine dağıtılıyor").catch(() => {});
                        restoredCount++;
                    }
                }
                sendGuardLog(guild, executor, "Rol Silme", `Rol: **${role.name}**\nİşlem: **${check.action}**\nDurum: **Geri Oluşturuldu ve ${restoredCount} kişiye geri verildi.**`);
                return;
            }
        }

        sendGuardLog(guild, executor, "Rol Silme", `Rol: **${role.name}**\nİşlem: **${check.action}**\nDurum: **Rol Geri Oluşturuldu.**`);
    }
};
