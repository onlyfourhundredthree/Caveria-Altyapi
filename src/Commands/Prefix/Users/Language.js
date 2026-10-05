const LM = require("../../../Core/Handlers/LM");

module.exports = {
   conf: {
        usages: ["dil", "language", "lang", "dil-sistemi", "language-system"],
        description: "Botun dilini değiştirin. / Change the bot language.",
        category: "Users",
        usage: ".dil <tr|en>"
    },


    run: async (client, message, args) => {
        let lang = args[0] ? args[0].toLowerCase() : null;
        if (lang !== "tr" && lang !== "en") {
            const currentLang = await LM.getLanguage(message.member, message.author.id);
            return message.reply(`Mevcut diliniz / Current language: **${currentLang.toUpperCase()}**\nKullanım / Usage: \`language <tr|en>\``);
        }

        await LM.setLanguage(message.author.id, lang);
        message.reply(LM.t("COMMON.LANGUAGE_CHANGED", lang) || `Language successfully changed to ${lang.toUpperCase()}`);
    }
};
