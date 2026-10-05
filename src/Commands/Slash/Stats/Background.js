const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const UserBanners = require("../../../Core/Database/UserBanners");
const LevelUtils = require("../../../Services/Stats/LevelUtils");


module.exports = {
    data: new SlashCommandBuilder()
        .setName("arka-plan")
        .setDescription("Arka-plan komutunu yönetmenizi sağlar.")
        .addStringOption(option =>
            option.setName("url")
                .setDescription("Arka-plan komutunu yönetmenizi sağlar.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const url = interaction.options.getString("url");
        const guildID = interaction.guild.id;
        const userID = interaction.user.id;

        const StatHistory = require("../../../Core/Database/StatHistory");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
        const stats = await StatHistory.aggregate([
            { $match: { guildID, userID } },
            { $group: { _id: "$userID", msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
        ]);

        const msgXP = stats[0] ? stats[0].msgTotal : 0;
        const voiceXP = stats[0] ? stats[0].voiceTotal : 0;

        const msgLevel = LevelUtils.calculateMessageLevel(msgXP);
        const voiceLevel = LevelUtils.calculateVoiceLevel(voiceXP);

        const whitelist = ["794147003482505216", "343367920874815488"];
        const isOwner = ConfigManager.isOwner(interaction.member);
        if (msgLevel < 50 && voiceLevel < 50 && !whitelist.includes(interaction.user.id) && !isOwner) {
            return interaction.reply({
                content: `${ConfigManager.get("Emojis.toji_iptal") || "✨"} Arka plan değiştirebilmek için mesaj veya ses seviyenin en az **50** olması gerekmektedir.\nŞu anki seviyelerin: Mesaj: **${msgLevel}**, Ses: **${voiceLevel}**`,
                ephemeral: true
            });
        }

        if (url.toLowerCase() === "sıfırla" || url.toLowerCase() === "reset") {
            await UserBanners.findOneAndDelete({ guildID, userID });
            return interaction.reply({ content: (ConfigManager.get("Emojis.toji_onay") || "✨") + " Arka plan başarıyla varsayılana sıfırlandı.", ephemeral: true });
        }

        if (!url.startsWith("http")) {
            return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Lütfen geçerli bir resim URL'si belirtin.", ephemeral: true });
        }

        await UserBanners.findOneAndUpdate(
            { guildID, userID },
            { background: url },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setTitle("Arka Plan Güncellendi")
            .setDescription("Arka-plan komutunu yönetmenizi sağlar.")
            .setImage(url)
            .setColor("Green");

        await interaction.reply({ embeds: [embed] });
    },
};
