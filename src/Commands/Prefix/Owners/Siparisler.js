const SiparislerService = require("../../../Services/Economy/SiparislerService");

module.exports = {
    conf: {
        usages: ["siparişler", "orders", "teslimat", "order-panel", "order-management"],
        description: "Sunucudaki siparişleri yönetebileceğiniz paneli açar.",
        category: "Economy",
        usage: ".siparişler",
        owner: true
    },

    run: async (client, message, args) => {
        await SiparislerService.execute(message);
    }
};
