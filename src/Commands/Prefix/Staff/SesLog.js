const SesLogService = require("../../../Services/Stats/SesLogService");

module.exports = {
    conf: {
        usages: ["seslog", "ses-log", "seslog-sistemi"],
        description: "Kullanıcının sesli kanallarda ne kadar kaldığını ve hangi kanallarda gezdiğini dökümler.",
        category: "Staff",
        usage: ".seslog <user_id|mention>"
    },

    run: async (client, message, args) => {
        const user = message.mentions.members.first() || args[0];
        await SesLogService.execute(message, user);
    }
};
