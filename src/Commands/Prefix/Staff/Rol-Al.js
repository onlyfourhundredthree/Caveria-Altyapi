const RoleService = require("../../../Services/Staff/RoleService");

module.exports = {
    conf: {
        usages: ["rol-al", "role-remove", "rolsil", "rol-sil", "rol-al-sistemi"],
        description: "Üyeden veya topluluktan rol almanızı sağlar.",
        category: "Staff",
        usage: ".rol-al"
    },

    run: async (client, message, args) => {
        await RoleService.execute(message, "REMOVE");
    }
};
