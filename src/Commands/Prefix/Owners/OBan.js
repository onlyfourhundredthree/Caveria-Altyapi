const YargiService = require("../../../Services/Moderation/YargiService");

module.exports = {
    conf: {
        usages: ["ownerban", "oban", "owner-ban", "oban-sistemi"],
        description: "Sahiplerin sunucudan bir kullanıcıyı uzaklaştırarak 'ban' cezası uygulamanızı sağlar.",
        category: "Owners",
        usage: ".ownerban <user_id|mention> <reason>",
        owner: true
    },

    run: async (client, message, args) => {
        let user = message.mentions.users.first() || args[0];
        let Reason = args.slice(1).join(" ");
        await YargiService.executeYargi(message, user, Reason);
    }
};
