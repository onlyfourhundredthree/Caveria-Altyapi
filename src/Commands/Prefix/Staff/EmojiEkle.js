const EmojiService = require("../../../Services/Systems/EmojiService");

module.exports = {
    conf: {
        usages: ["emojiekle", "emoji-ekle", "addemoji", "add-emoji", "emojiekle-sistemi"],
        description: "Dış kaynaklı bir emojiyi URL veya isimle sunucuya pratikçe ekler.",
        category: "Staff",
        usage: ".emojiekle <link> <isim>"
    },

    run: async (client, message, args) => {
        const link = args[0];
        const name = args[1];
        await EmojiService.execute(message, link, name, message.attachments);
    }
};
