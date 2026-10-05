const EconomyService = require("../../../Services/Economy/EconomyService");

module.exports = {
    conf: {
        usages: ["coin", "cash", "mağaza", "market", "shop", "bakiye", "money", "cüzdan"],
        description: "Mevcut bakiyenizi, mağaza ürünlerini ve sipariş geçmişinizi içeren ekonomi panelini açar.",
        category: "Users",
        usage: ".coin <user_id|mention>"
    },

    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || (args[0] ? client.users.cache.get(args[0]) : null) || message.author;
        const member = message.guild.members.cache.get(targetUser.id);
        const guild = message.guild;

        await EconomyService.sendEconomyPanel(client, message, targetUser, member, guild, message.author.id);
    }
};
