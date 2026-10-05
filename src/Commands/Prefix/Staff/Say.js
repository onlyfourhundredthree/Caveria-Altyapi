const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    conf: {
        usages: ["say", "say-stats", "say-istatistik", "say-istatistikleri"],
        description: "Sunucudaki toplam üye, aktif, sesli ve taglı kullanıcı sayısını anlık raporlar.",
        category: "Staff",
        usage: ".say"
    },

    run: async (client, message, args) => {
        await GeneralService.sendSayStats(message, message.guild, message.author);
    },
};
