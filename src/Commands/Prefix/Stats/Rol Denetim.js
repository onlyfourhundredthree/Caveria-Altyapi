const RolDenetimService = require("../../../Services/Staff/RolDenetimService");

module.exports = {
    conf: {
        usages: ["rol-denetim", "role-inspection", "rol-denetim-sistemi", "rol-denetim-rol"],
        description: "Belirli bir roldeki tüm üyelerin o hafta yaptığı toplam aktifliği analiz eder.",
        category: "Stats",
        usage: ".rol-denetim [rol]"
    },

    run: async (client, message, args) => {
        let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || args[0];
        await RolDenetimService.execute(message, role);
    }
};
