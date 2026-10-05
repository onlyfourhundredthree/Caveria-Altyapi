const StaffRatingService = require("../../../Services/Staff/StaffRatingService");

module.exports = {
    conf: {
        usages: ["staffrating", "sr", "değerlendirmeler"],
        description: "Yetkili değerlendirmelerini listeler.",
        category: "Staff",
        usage: ".staffrating [@Kullanıcı/ID]"
    },

    run: async (client, message, args) => {
        const targetMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
        await StaffRatingService.execute(message, targetMember);
    }
};
