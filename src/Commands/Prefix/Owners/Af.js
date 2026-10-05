const AfService = require("../../../Services/Moderation/AfService");

module.exports = {
    conf: {
        usages: ["af", "amnesty"],
        description: "Suncudaki yasaklı, cezalı veya af bekleyen kullanıcılar için af menüsünü açar.",
        category: "Owners",
        usage: ".af",
        owner: true
    },

    run: async (client, message, args) => {
        await AfService.execute(message);
    }
};
