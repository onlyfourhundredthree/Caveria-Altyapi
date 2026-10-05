const FindGuildService = require("../../../Services/FindGuildService");

module.exports = {
    conf: {
        usages: ["findguild", "find-guild", "guildfind", "guild-find", "sunucu-bul", "sunucubul", "sunucu-bulma", "sunucubulma"],
        description: "Belirtilen kullanıcının taşıdığı primary guild (klan) ID'sini bulur.",
        category: "Owners",
        usage: ".findguild <user_id|mention>",
        owner: true
    },

    run: async (client, message, args) => {
        const id = args[0] || message.mentions.users.first()?.id;
        if (!id) return message.channel.send({ content: "Lütfen bir kullanıcı ID'si veya mention girin." });

        const payload = await FindGuildService.getPayload(client, id, message.author);
        await message.channel.send(payload);
    },
};
