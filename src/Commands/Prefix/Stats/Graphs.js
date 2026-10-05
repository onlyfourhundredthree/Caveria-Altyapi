const StatService = require("../../../Services/Stats/StatService");

module.exports = {
    conf: {
        usages: ["grafik", "graph", "graphs", "istatistik-grafik", "istatistik-graph", "istatistik-graphs"],
        description: "Sunucudaki son bir haftalık aktiflik verilerini grafikler eşliğinde raporlar.",
        category: "Stats",
        usage: ".grafik [kullanıcı/sunucu]"
    },


    run: async (client, message, args) => {
        let targetMember = null;
        if (args[0] && args[0].toLowerCase() !== "server" && args[0].toLowerCase() !== "sunucu") {
            targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!targetMember) return message.reply("Kullanıcı bulunamadı.");
        }

        await StatService.handleGraphs(message, targetMember);
    }
};
