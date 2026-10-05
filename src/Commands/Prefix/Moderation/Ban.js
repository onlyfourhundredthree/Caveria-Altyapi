const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["ban", "yasakla", "banla", "yasak", "underworld", "ban-user"],
        description: "Belirtilen kullanıcıyı sunucudan yasaklar.",
        category: "Moderation",
        usage: ".ban <user_id|mention> <sebep|reason>"
    },

    run: async (client, message, args) => {
        let targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!targetUser) {
            return ModerationService.sendError(message, "Lütfen geçerli bir kullanıcı etiketleyin veya ID girin.");
        }

        let Reason = args.splice(1).join(" ");
        if (!Reason) Reason = "Bir sebep belirtilmemiş.";

        await ModerationService.handleBan(message, targetUser, Reason);
    },
};
