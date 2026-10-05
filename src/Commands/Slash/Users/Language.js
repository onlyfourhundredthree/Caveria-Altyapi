const { SlashCommandBuilder } = require("discord.js");
const LM = require("../../../Core/Handlers/LM");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("language")
        .setDescription("Change the bot language / Botun dilini değiştirin.")
        .addStringOption(option => 
            option.setName("lang")
                .setDescription("Select the language / Dili seçin")
                .setRequired(true)
                .addChoices(
                    { name: "Türkçe", value: "tr" },
                    { name: "English", value: "en" }
                )),

    async execute(interaction) {
        const lang = interaction.options.getString("lang");
        const currentLang = await LM.getLanguage(interaction.member, interaction.user.id);

        if (lang === currentLang) {
            return interaction.reply({ content: LM.t("COMMON.LANGUAGE_ALREADY_SET", lang, { lang: lang.toUpperCase() }) || `Language is already set to ${lang.toUpperCase()}`, ephemeral: true });
        }

        await LM.setLanguage(interaction.user.id, lang);
        
        interaction.reply({ content: LM.t("COMMON.LANGUAGE_CHANGED", lang) || `Language successfully changed to ${lang.toUpperCase()}`, ephemeral: true });
    }
};
