const CustomRoleService = require("../../../Services/Systems/CustomRoleService");

module.exports = {
    conf: {
        usages: ["rolbilgim", "özelkomutlarım", "kotalarım", "rolverilerim"],
        description: "Kullanabildiğiniz özel rol komutlarını ve limitlerinizi gösterir.",
        category: "Staff",
        usage: ".rolbilgim"
    },
    run: async (client, message, args) => {
        return CustomRoleService.sendRoleInfo(message);
    }
};
