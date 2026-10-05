const CekilisService = require("../../../Services/Staff/CekilisService");

module.exports = {
    conf: {
        usages: ["çekiliş", "giveaway", "cekilis"],
        description: "Sunucuda çekiliş başlatmanızı, şartlı çekiliş oluşturmanızı, kazananı tekrarlamanızı veya çekilişi bitirmenizi sağlar.",
        category: "Staff",
        usage: ".çekiliş"
    },

    run: async (client, message, args) => {
        await CekilisService.execute(message);
    }
};
