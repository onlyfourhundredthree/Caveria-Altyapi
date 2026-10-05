const Punitives = require("../../Core/Database/Punitives");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { AuditLogEvent } = require("discord.js");

module.exports = async (ban) => {
    try {
        if (!ban || !ban.guild || !ban.user) return;

        const guild = ban.guild;
        const user = ban.user;

        const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
        if (!audit) return;
        const entry = audit.entries.first();

        if (!entry || entry.target.id !== user.id || entry.createdTimestamp < (Date.now() - 10000)) return;

        const executor = entry.executor;
        const reason = entry.reason || "Sebep belirtilmemiş (Sağ Tık / Dışarıdan Ban)";

        if (executor.id === require("../../Services/Systems/Giveaway/index").client?.user?.id || executor.id === ban.client.user.id) return;
        if (executor.bot) return; 

        const checkBan = await Punitives.findOne({ Member: user.id, Type: "Yasaklama", Active: true });
        if (checkBan) return;

        const lastPunitive = await Punitives.findOne().sort({ No: -1 });
        const newNo = lastPunitive ? lastPunitive.No + 1 : 1;

        await new Punitives({
            No: newNo,
            Member: user.id,
            Staff: executor.id,
            Type: "Yasaklama",
            Reason: reason,
            Duration: null,
            Date: Date.now(),
            Expried: null,
            Remover: null,
            Active: true,
            LastPunishType: null
        }).save();

    } catch (e) {
        console.error("RightClickBanLog Hatası: ", e);
    }
};
