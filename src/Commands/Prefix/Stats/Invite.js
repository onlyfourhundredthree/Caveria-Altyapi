const StatService = require("../../../Services/Stats/StatService");

module.exports = {
    conf: {
        usages: ["davet", "invite", "davet-sistemi", "invite-system"],
        description: "Üyenin veya kendinizin sunucuya kaç kişi davet ettiğini ayrıntılı gösterir.",
        category: "Stats",
        usage: ".davet [kullanıcı]"
    },


    run: async (client, message, args) => {
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
        await StatService.handleInvite(message, member);
    }
};
