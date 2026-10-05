const { AuditLogEvent } = require("discord.js");
const GuardManager = require("../../Core/Handlers/GuardManager");
const { applyPunishment, sendGuardLog } = require("../../Core/Handlers/GuardUtils");

module.exports = async (channel) => {
    const guild = channel.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.createdTimestamp < (now - 5000)) return;


    const createdWebhook = entry.target;
    if (createdWebhook && createdWebhook.channelId !== channel.id) return; 

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    const check = await GuardManager.checkLimit(guild.id, executor.id, "webhookUpdate");
    const settings = await GuardManager.getSettings(guild.id);
    const isWhitelisted = GuardManager.isWhitelisted(executor.id, member, "channelUpdate", settings);

    if (isWhitelisted) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "İzinsiz Webhook Açma");
        if (createdWebhook) await createdWebhook.delete("Guard: İzinsiz Webhook").catch(() => { });
        sendGuardLog(guild, executor, "Webhook Oluşturma", `Kanal: **${channel.name}**\nİşlem: **Webhook silindi ve yetkili cezalandırıldı.**`);
    }
};
