const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    conf: {
        usages: ["afk", "afk-sistemi", "afk-sistemi-ayarla", "afk-sistemi-kapat"],
        description: "Klavyeden uzak olduğunuzu belirtmek için AFK moduna girersiniz.",
        category: "Users",
        usage: ".afk [sebep]"
    },


    run: async (client, message, args) => {
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        await GeneralService.handleAfk(message, args, targetMember, message.member);
    }
};
