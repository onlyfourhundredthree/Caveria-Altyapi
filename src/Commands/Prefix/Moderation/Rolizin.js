const RolizinService = require("../../../Services/Moderation/RolizinService");

module.exports = {
    conf: {
        usages: ["rolizin", "ri"],
        description: "Rollerin kanallardaki spesifik izinlerini toplu yönetir.",
        category: "Moderation",
        usage: ".rolizin"
    },

    run: async (client, message, args) => {
        await RolizinService.handleRolizin(message, client);
    },
};
