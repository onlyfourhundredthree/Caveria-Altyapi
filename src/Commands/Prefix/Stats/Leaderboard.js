const LeaderboardService = require("../../../Services/Staff/LeaderboardService");

module.exports = {
    conf: {
        usages: ["sıralama", "leaderboard", "toplist", "toplist-sistemi", "toplist-sıralama", "top"],
        description: "Sunucunun en aktif (mesaj, ses, davet) ilk 10 üyesini sıralı listeyle gösterir.",
        category: "Stats",
        usage: ".sıralama"
    },

    run: async (client, message, args) => {
        await LeaderboardService.execute(message);
    }
};
