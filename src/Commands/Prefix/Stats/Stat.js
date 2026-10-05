const StatsService = require("../../../Services/Stats/StatsService");

module.exports = {
    conf: {
        usages: ["stat", "istatistik", "istatistik-sistemi"],
        description: "Genel sunucu aktifliğinizi (mesaj, ses, kategori) tek bir panelde özetler.",
        category: "Stats",
        usage: ".stat [kullanıcı]"
    },

    run: async (client, message, args) => {
        const guild = message.guild;
        const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
        const member = guild.members.cache.get(targetUser.id);

        await StatsService.sendStatPanel(client, message, targetUser, member, guild, message.author.id);
    }
};
