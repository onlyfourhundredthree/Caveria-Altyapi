const Punitives = require("../../Core/Database/Punitives");

module.exports = async (ban) => {
    try {
        const guild = ban.guild;
        const user = ban.user;

        // Discord Audit Log senkronizasyonu için kısa bir bekleme
        await new Promise(r => setTimeout(r, 1000));
        
        // 23 = MEMBER_BAN_REMOVE
        const auditLogs = await guild.fetchAuditLogs({ type: 23, limit: 1 }).catch(() => null);
        let executorId = guild.client.user.id;
        let reason = "Sunucu (Sağ tık / Ayarlar) üzerinden ban kaldırıldı.";

        if (auditLogs) {
            const entry = auditLogs.entries.find(e => e.target && e.target.id === user.id && Date.now() - e.createdTimestamp < 20000);
            if (entry) {
                executorId = entry.executor.id;
                if (entry.reason) reason = entry.reason;
            }
        }

        const activeBans = await Punitives.find({ Member: user.id, Type: { $in: ["Kalkmaz Yasaklama", "Yasaklama", "Underworld"] }, Active: true });
        
        for (const record of activeBans) {
            record.Active = false;
            record.Remover = executorId;
            record.RemoveDate = Date.now();
            record.RemoveReason = reason;
            await record.save();
        }
    } catch (err) {
        console.error("BanRemoveTracker Error:", err);
    }
};
