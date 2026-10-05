const SicilTemizleService = require("../../../Services/Moderation/SicilTemizleService");

module.exports = {
    conf: {
        usages: ["sicil-temizle", "sicilsil", "temizle", "sicil-temizleme", "siciltemizle"],
        description: "İstisnai durumlarda bir kullanıcının geçmişteki tüm ceza kayıtlarını sıfırlar.",
        category: "Owners",
        usage: ".sicil-temizle <user_id|mention>",
        owner: true
    },

    run: async (client, message, args) => {
        const user = message.mentions.users.first() || args[0];
        await SicilTemizleService.execute(message, user);
    }
};
