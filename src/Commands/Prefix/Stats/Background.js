const { EmbedBuilder } = require("discord.js");
const UserBanners = require("../../../Core/Database/UserBanners");
const LevelUtils = require("../../../Services/Stats/LevelUtils");
const StatHistory = require("../../../Core/Database/StatHistory");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["arkaplan", "background", "bg", "arka-plan"],
        description: "Sunucuda 50 ve üzeri mesaj veya ses seviyesine sahip kullanıcılar arka planlarını değiştirebilir.",
        category: "Stats",
        usage: ".arkaplan <resim_url> | sıfırla>"
    },


    run: async (client, message, args) => {
        const stats = await StatHistory.aggregate([
            { $match: { guildID: message.guild.id, userID: message.author.id } },
            { $group: { _id: "$userID", msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
        ]);

        const msgXP = stats[0] ? stats[0].msgTotal : 0;
        const voiceXP = stats[0] ? stats[0].voiceTotal : 0;

        const msgLevel = LevelUtils.calculateMessageLevel(msgXP);
        const voiceLevel = LevelUtils.calculateVoiceLevel(voiceXP);

        const whitelist = ["794147003482505216", "343367920874815488"];
        const isOwner = ConfigManager.isOwner(message.member);
        if (msgLevel < 50 && voiceLevel < 50 && !whitelist.includes(message.author.id) && !isOwner) {
            return message.reply(`${ConfigManager.get("Emojis.toji_iptal") || "✨"} Arka plan değiştirebilmek için mesaj veya ses seviyenin en az **50** olması gerekmektedir.\nŞu anki seviyelerin: Mesaj: **${msgLevel}**, Ses: **${voiceLevel}**`);
        }

        if (!args[0]) {
            return message.reply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " Lütfen geçerli bir resim URL'si belirtin veya `sıfırla` yazın.");
        }

        if (args[0].toLowerCase() === "sıfırla" || args[0].toLowerCase() === "reset") {
            await UserBanners.findOneAndDelete({ guildID: message.guild.id, userID: message.author.id });
            return message.reply((ConfigManager.get("Emojis.toji_onay") || "✨") + " Arka plan başarıyla varsayılana sıfırlandı.");
        }

        const url = args[0];
        if (!url.startsWith("http")) {
            return message.reply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " Lütfen geçerli bir URL belirtin.");
        }

        await UserBanners.findOneAndUpdate(
            { guildID: message.guild.id, userID: message.author.id },
            { background: url },
            { upsert: true }
        );

        const embed = new EmbedBuilder()
            .setTitle("Arka Plan Güncellendi")
            .setDescription((ConfigManager.get("Emojis.toji_onay") || "✨") + " Yeni arka planın başarıyla ayarlandı! `.rank` veya `.stat` yazarak kontrol edebilirsin.")
            .setImage(url)
            .setColor("Green");

        message.reply({ embeds: [embed] });
    },
};
