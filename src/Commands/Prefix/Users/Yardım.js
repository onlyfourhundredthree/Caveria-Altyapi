const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    conf: {
        usages: ["yardım", "help", "syardım", "syardim", "staffhelp", "staffyardım", "staff-yardım"],
        description: "Yardım ve yetkili yardım bilgilerini gösterir.",
        category: "Users",
        usage: ".yardım / .syardım"
    },


    run: async (client, message, args) => {
        await GeneralService.handleHelp(message);
    }
};
