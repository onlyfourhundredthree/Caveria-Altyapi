const MuzikService = require("../../../Services/Systems/MuzikService");

module.exports = {
    conf: {
        usages: ["müzik", "muzik", "music", "radyo"],
        description: "Gelişmiş Müzik ve Playlist Yönetim Paneli",
        category: "Owners",
        usage: ".müzik",
        owner: true
    },
    run: async (client, message, args) => {
        await MuzikService.execute(message);
    }
};
