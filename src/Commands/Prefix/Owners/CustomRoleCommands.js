const CustomRoleService = require("../../../Services/Systems/CustomRoleService");

module.exports = {
    conf: {
        usages: ["özel-komut", "ökomut", "custom-command", "custom-role", "custom-role-command", "custom-role-commands", "custom-roles", "custom-roles-command", "custom-roles-commands", "özelkomut", "özelkomutlar", "özel-komutlar", "özel-komut-komutları", "özel-komut-komutlari"],
        description: "Sunucuda özel komutlar oluşturmanızı ve mevcut özel komutları görüntülemenizi sağlar.",
        category: "Owners",
        usage: ".özel-komut",
        owner: true
    },

    run: async (client, message, args) => {
        const payload = await CustomRoleService.getDashboard(client, message.guild);
        return message.channel.send(payload);
    },
};
