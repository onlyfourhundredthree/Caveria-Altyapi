const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["uyarı", "warn", "uyari", "uyar"],
        description: "Sunucuda kural ihlali yapan bir kullanıcıya uyarı cezası vermenizi sağlar.",
        category: "Moderation",
        usage: ".uyarı <user_id|mention> <reason>"
    },

    run: async (client, message, args) => {
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        let userObj = message.mentions.users.first();
        if (!userObj && args[0]) {
            try { userObj = await client.users.fetch(args[0]); } catch (e) {}
        }
        
        let reason = args.slice(1).join(" ");
        await ModerationService.handleWarn(message, userObj || member, reason);
    },
};
