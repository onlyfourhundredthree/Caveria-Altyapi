const ClaimsService = require("../../../Services/Staff/ClaimsService");

module.exports = {
    conf: {
        usages: ["claims", "claimlerim"],
        description: "Aktif claimlerinizi görüntüleyin.",
        category: "Staff",
        usage: ".claims"
    },

    run: async (client, message, args) => {
        await ClaimsService.execute(message);
    }
};
