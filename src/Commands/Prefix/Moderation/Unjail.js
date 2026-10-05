const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["unjail", "uncezali", "uncezalı", "unkarantina", "unjail-sistemi"],
        description: "Cezalı alanında bulunan bir üyeyi normal sunucu haklarına geri kavuşturur ve 'jail' cezasını kaldırmanızı sağlar.",
        category: "Moderation",
        usage: ".unjail <user_id|mention>"
    },

    run: async (client, message, args) => {
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        let userObj = message.mentions.users.first();
        if (!userObj && args[0]) {
            try { userObj = await client.users.fetch(args[0]); } catch (e) {}
        }
        
        await ModerationService.handleUnjail(message, userObj || member);
    },
};
