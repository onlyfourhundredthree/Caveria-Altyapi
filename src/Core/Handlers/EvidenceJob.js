const Punitives = require("../Database/Punitives");
const EvidenceService = require("../../Services/Moderation/EvidenceService");
const ConfigManager = require("./ConfigManager");

module.exports = function (client) {
    setInterval(async () => {
        try {
            const fiveMinsAgo = Date.now() - 300000;
            const targetTypes = ["Uyarılma", "Ses Susturulma", "Metin Susturulma", "Cezalandırılma", "Yasaklama", "Kalkmaz Yasaklama", "Underworld", "Etkinlik Cezalı"];
            
            const expiredDocs = await Punitives.find({
                EvidencePoolSent: false,
                Evidence: { $size: 0 },
                Type: { $in: targetTypes },
                Date: { $lt: fiveMinsAgo }
            }).limit(50); // limit to 50 at a time to prevent flood

            for (const doc of expiredDocs) {
                // Her ihtimale karşı veritabanı kontrolünü tekrar yapıyoruz (belki o an kanıt ekleniyordur)
                const checkDoc = await Punitives.findOne({ No: doc.No });
                if (!checkDoc || checkDoc.EvidencePoolSent || (checkDoc.Evidence && checkDoc.Evidence.length > 0)) continue;
                
                await EvidenceService.sendToPool(client, checkDoc, "timeout");
            }
        } catch (err) {
            console.error("[EvidenceJob] Error checking timeouts:", err);
        }
    }, 30000); // Her 30 saniyede bir çalışır
};
