const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const Punitives = require("../../Core/Database/Punitives");
const Settings = require("../../../Settings.json");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const client = global.bot;

module.exports = async (ban) => {
    if (ban.guild.id !== Settings.Main.GuildID) return;

    const forceBan = await Punitives.findOne({ Member: ban.user.id, Type: "Kalkmaz Yasaklama", Active: true });
    if (!forceBan) return;

    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove,
    });
    const unbanLog = fetchedLogs.entries.first();

    if (!unbanLog) return;

    const { executor } = unbanLog;

    if (ConfigManager.isOwner(executor)) {
        await Punitives.updateOne({ No: forceBan.No }, { $set: { Active: false, Expried: Date.now(), Remover: executor.id } });
        return;
    }

    await ban.guild.members.ban(ban.user.id, { reason: `Forceban: ${executor.tag}` });

};
