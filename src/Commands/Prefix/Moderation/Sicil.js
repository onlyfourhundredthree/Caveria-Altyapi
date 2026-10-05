const SicilService = require("../../../Services/Moderation/SicilService");

module.exports = {
    conf: {
        usages: ["sicil", "cezalar", "cezabilgi", "cezasıl", "cezasil", "cezalarım", "ceza-sorgu", "ceza-sorgula", "ceza-sorgulama"],
        description: "Kullanıcının daha önce aldığı uyarı, ban ve mute gibi tüm cezaların listesini açar.",
        category: "Moderation",
        usage: ".sicil <user_id|mention>"
    },

    run: async (client, message, args) => {
        let memberArg = null;
        let cezaNoArg = null;

        if (args.length === 0) {
            memberArg = null;
        } else if (message.mentions.members.first()) {
            memberArg = message.mentions.members.first();
        } else if (!isNaN(args[0]) && args[0].length >= 15) {
            memberArg = args[0];
        } else if (!isNaN(args[0])) {
            cezaNoArg = args[0];
        } else {
            memberArg = args[0];
        }

        await SicilService.execute(message, memberArg, cezaNoArg);
    }
};
