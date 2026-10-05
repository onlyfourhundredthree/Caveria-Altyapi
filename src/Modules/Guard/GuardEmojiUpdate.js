const { AuditLogEvent } = require("discord.js");
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (oldEmoji, newEmoji) => {
    const guild = newEmoji.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.EmojiUpdate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== newEmoji.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "emojiUpdate");
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "emojiUpdate", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Emoji Düzenleme Limiti");
        if (oldEmoji.name !== newEmoji.name) await newEmoji.setName(oldEmoji.name).catch(() => { });
        sendGuardLog(guild, executor, "Emoji Düzenleme", `Emoji: **${newEmoji.name}**\nİşlem: **Limit aşıldı, isim geri alındı.**`);
    }
};
