const RolLogService = require("../../../Services/Staff/RolLogService");

module.exports = {
    conf: {
        usages: ["rol-log", "role-log", "rollog", "rol-gecmisi", "role-history", "rol-log-sistemi", "rol-log-rol"],
        description: "Bir üyeye yetki veya rol değişimlerinin kim tarafından yapıldığını log halinde sunar.",
        category: "Staff",
        usage: ".rol-log [kullanıcı]"
    },

    run: async (client, message, args) => {
        const member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        await RolLogService.execute(message, member);
    }
};
