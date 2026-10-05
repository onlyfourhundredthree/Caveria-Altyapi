const StatService = require("../../../Services/Stats/StatService");

module.exports = {
    conf: {
        usages: ["rank", "seviye", "rank-sistemi", "seviye-sistemi"],
        description: "Sunucudaki aktifliğinize göre kazandığınız XP seviyesini ve rütbe kartını açar.",
        category: "Stats",
        usage: ".rank [kullanıcı]"
    },

    run: async (client, message, args) => {
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
        await StatService.handleRank(message, member);
    },
};
