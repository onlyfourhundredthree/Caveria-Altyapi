const ModerationService = require("../../../Services/Moderation/ModerationService");

module.exports = {
    conf: {
        usages: ["mute", "chatmute", "voicemute", "sesmute", "sustur", "sessustur", "vmute", "cmute", "metinsustur", "chatsustur", "v-mute", "c-mute"],
        description: "Kullanıcının metin veya ses kanallarını kullanmasını ve 'mute' cezası vermenizi sağlar.",
        category: "Moderation",
        usage: ".mute <user_id|mention>"
    },

    run: async (client, message, args) => {
        let target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || await client.users.fetch(args[0]).catch(() => null);
        
        await ModerationService.handleMute(message, target);
    },
};
