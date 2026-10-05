const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["unetkinlikcezali", "unetkinlikcezalı", "un-etkinlikcezali", "un-etkinlik-cezali", "uneventcezali", "un-eventcezali", "un-ecezali", "unecezali"],
        description: "Kullanıcının üzerindeki Etkinlik Cezalı cezasını ve rolünü kaldırır.",
        category: "Moderation",
        usage: ".unetkinlikcezali <@kullanıcı>"
    },

    run: async (client, message, args) => {
        let targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!targetUser) {
            return ModerationService.sendError(message, "Lütfen cezasını kaldırmak istediğiniz bir kullanıcı etiketleyin veya ID girin.");
        }

        await ModerationService.handleUnEventJail(message, targetUser);
    }
};
