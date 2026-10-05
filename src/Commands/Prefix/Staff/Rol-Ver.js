const RoleService = require("../../../Services/Staff/RoleService");

module.exports = {
    conf: {
        usages: ["rol-ver", "role-add", "rolver", "rol-ver-sistemi"],
        description: "Üyeye veya topluluğa rol vermenizi sağlar.",
        category: "Staff",
        usage: ".rol-ver"
    },

    run: async (client, message, args) => {
        await RoleService.execute(message, "ADD");
    }
};
