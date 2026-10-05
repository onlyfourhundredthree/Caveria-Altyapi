const BanSorgulaService = require("../../../Services/Moderation/BanSorgulaService");

module.exports = {
    conf: {
        usages: ["bansorgula", "ban-sorgula", "ban-sorgu", "ban-sorgu-sistemi"],
        description: "Uzaklaştırılmış bir kullanıcının ban detaylarını, yetkilisini ve tarihini sorgular.",
        category: "Moderation",
        usage: ".bansorgula <user_id|mention>"
    },

    run: async (client, message, args) => {
        let user = message.mentions.users.first() || args[0];
        await BanSorgulaService.execute(message, user);
    }
};
