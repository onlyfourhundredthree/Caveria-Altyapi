const StatHistory = require("../../../Core/Database/StatHistory");
const moment = require("moment");
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("respect")
        .setDescription("Respect komutunu yönetmenizi sağlar.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Respect komutunu yönetmenizi sağlar.")
                .setRequired(true)),

    async execute(interaction) {
        const { user: author, options } = interaction;
        const targetUser = options.getUser("kullanıcı");

        if (targetUser.id === author.id) {
            return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Kendine saygınlık puanı veremezsin!", flags: [MessageFlags.Ephemeral] });
        }

        if (targetUser.bot) {
            return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Botlara saygınlık puanı veremezsin!", flags: [MessageFlags.Ephemeral] });
        }

        const lastActionDoc = await StatHistory.findOne({
            guildID: interaction.guild.id,
            userID: author.id,
            "cooldowns.respect": { $ne: null }
        }).sort({ date: -1 });

        const now = new Date();
        const twelveHours = 12 * 60 * 60 * 1000;
        const lastUsed = lastActionDoc ? lastActionDoc.cooldowns.respect : 0;

        if (now - lastUsed < twelveHours) {
            const timeLeft = twelveHours - (now - lastUsed);
            const duration = moment.duration(timeLeft);
            return interaction.reply({
                content: `${ConfigManager.get("Emojis.toji_iptal") || "✨"} Bu komutu tekrar kullanmak için **${duration.hours()} saat ${duration.minutes()} dakika** beklemelisin.`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const today = moment().format("YYYY-MM-DD");
        await StatHistory.findOneAndUpdate(
            { guildID: interaction.guild.id, userID: author.id, date: today },
            { $set: { "cooldowns.respect": now } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        await StatHistory.findOneAndUpdate(
            { guildID: interaction.guild.id, userID: targetUser.id, date: today },
            { $inc: { respect: 1 } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        const totalRes = await StatHistory.aggregate([
            { $match: { guildID: interaction.guild.id, userID: targetUser.id } },
            { $group: { _id: "$userID", total: { $sum: "$respect" } } }
        ]);

        const total = totalRes[0] ? totalRes[0].total : 0;

        return interaction.reply({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} ${targetUser} kullanıcısının saygınlık puanını artırdınız! Toplam: **${total}**`, flags: [] });
    }
};
