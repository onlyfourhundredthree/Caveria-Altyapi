const YargiService = require("../../../Services/Moderation/YargiService");

module.exports = {
   conf: {
        usages: ["ownerunban", "ownerunyargı", "ownerunyargi", "ownerunyargı-sistemi", "ownerunyargi-sistemi"],
        description: "Sahiplerin sunucudan uzaklaştırılmış bir kullanıcının banını kaldırarak sunucuya tekrar girişini ve 'ban' cezasını kaldırmanızı sağlar.",
        category: "Owners",
        usage: ".ownerunban <user_id|mention>",
        owner: true
    },

    run: async (client, message, args) => {
        let user = message.mentions.users.first() || args[0];
        let Reason = args.slice(1).join(" ");
        await YargiService.executeUnYargi(message, user, Reason);
    }
};
