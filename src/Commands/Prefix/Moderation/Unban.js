const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["unban", "unyasakla", "ununderworld", "unban-sistemi"],
        description: "Uzaklaştırılmış bir kullanıcının banını kaldırarak sunucuya tekrar girişini ve 'underworld' cezasını kaldırmanızı sağlar.",
        category: "Moderation",
        usage: ".unban <user_id|mention>"
    },

    run: async (client, message, args) => {
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        let userObj = message.mentions.users.first();
        if (!userObj && args[0]) {
            try { userObj = await client.users.fetch(args[0]); } catch (e) {}
        }
        
        await ModerationService.handleUnban(message, userObj || member);
    },
};

