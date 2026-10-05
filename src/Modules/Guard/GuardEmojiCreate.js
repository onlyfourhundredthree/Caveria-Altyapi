const { AuditLogEvent } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (emoji) => {
    const guild = emoji.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== emoji.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "emojiCreate");
    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "emojiCreate", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Emoji Oluşturma Limiti");
        await emoji.delete("Guard: Limit Aşımı").catch(() => { });
        sendGuardLog(guild, executor, "Emoji Oluşturma", `Emoji: **${emoji.name}**\nİşlem: **Limit aşıldı, emoji silindi.**`);
    }
};
