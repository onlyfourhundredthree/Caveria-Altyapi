const ms = require("ms");
const ModerationService = require("../../../Services/Moderation/ModerationService");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["etkinlikcezalı", "etkinlikcezali", "etkinlik-cezali", "etkinlik-cezalı", "eventcezali", "eventcezalı", "event-cezali", "e-cezali", "ecezali"],
        description: "Kullanıcıya Etkinlik Cezalı rolünü verir ve etkinlik cezası uygular.",
        category: "Moderation",
        usage: ".etkinlikcezalı <@kullanıcı> [süre] [sebep]"
    },

    run: async (client, message, args) => {
        let targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!targetUser) {
            return ModerationService.sendError(message, "Lütfen geçerli bir kullanıcı etiketleyin veya ID girin.");
        }

        let duration = null;
        let reasonArgs = args.slice(1);

        if (reasonArgs.length > 0) {
            const first = reasonArgs[0];
            const parsed = ms(first);
            if (parsed && parsed >= 1000) {
                duration = first;
                reasonArgs = reasonArgs.slice(1);
            }
        }

        let reason = reasonArgs.join(" ") || "Etkinlik kuralları ihlali.";

        await ModerationService.handleEventJail(message, targetUser, reason, duration);
    }
};
