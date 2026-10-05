const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["unmute", "unchatmute", "unvoicemute", "unsesmute", "unsustur", "unsessustur", "unvmute", "uncmute", "unmetinsustur", "unchatsustur", "unv-mute", "unc-mute"],
        description: "Konuşma veya ses yasağı olan bir üyenin suskunluğunu süresi dolmadan açar ve 'mute' cezasını kaldırmanızı sağlar.",
        category: "Moderation",
        usage: ".unmute <user_id|mention>"
    },

    run: async (client, message, args) => {
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        let userObj = message.mentions.users.first();
        if (!userObj && args[0]) {
            try { userObj = await client.users.fetch(args[0]); } catch (e) {}
        }
        
        await ModerationService.handleUnmute(message, userObj || member, args[0]);
    },
};
