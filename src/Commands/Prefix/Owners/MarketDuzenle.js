const MarketDuzenleService = require("../../../Services/Economy/MarketDuzenleService");

module.exports = {
    conf: {
        usages: ["marketdüzenle", "editmarket"],
        description: "Ekonomi marketindeki ürünleri düzenler (Sadece Sahipler).",
        category: "Owners",
        usage: ".marketdüzenle",
        owner: true
    },

    run: async (client, message, args) => {
        await MarketDuzenleService.execute(message);
    }
};
