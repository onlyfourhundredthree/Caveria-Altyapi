const { AuditLogEvent } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (oldGuild, newGuild) => {
    const now = Date.now();

    const audit = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await newGuild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === newGuild.ownerId) return;

    const oldVanity = oldGuild.vanityURLCode;
    const newVanity = newGuild.vanityURLCode;

    if (oldVanity && oldVanity !== newVanity) {
        const settings = await GuardManager.getSettings(newGuild.id);
        if (!GuardManager.isWhitelisted(executor.id, member, "guildUrlUpdate", settings)) {
            await applyPunishment(newGuild, member, executor, "ban", "Vanity URL Değiştirme Girişimi");


            sendGuardLog(newGuild, executor, "Sunucu URL Değişimi", `Eski URL: **${oldVanity}**\nYeni URL: **${newVanity || "Yok"}**\nİşlem: **Kullanıcı Banlandı.**`);
            return;
        }
    }

    const check = await GuardManager.checkLimit(newGuild.id, executor.id, "serverUpdate");
    const settings = await GuardManager.getSettings(newGuild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "serverUpdate", settings)) return;

    if (check && check.limited) {
        await applyPunishment(newGuild, member, executor, check.action, "Sunucu Ayarlarını Değiştirme Limiti");

        if (oldGuild.name !== newGuild.name) await newGuild.setName(oldGuild.name).catch(() => { });
        if (oldGuild.iconURL() !== newGuild.iconURL()) await newGuild.setIcon(oldGuild.iconURL()).catch(() => { });

        sendGuardLog(newGuild, executor, "Sunucu Ayar Değişimi", `İşlem: **${check.action}**\nDurum: **Sunucu adı/ikonu geri alındı.**`);
    }
};
