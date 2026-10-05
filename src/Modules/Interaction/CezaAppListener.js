const { EmbedBuilder } = require("discord.js");
const Punitives = require("../../Core/Database/Punitives");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (interaction) => {
    if (!interaction.isButton()) return;

    const customIds = ["ceza_sure", "ceza_sebep", "ceza_itiraz"];
    if (!customIds.includes(interaction.customId)) return;

    if (interaction.customId === "ceza_itiraz") {
        return interaction.reply({
            content: `Cezanıza itiraz etmek için destek talebi kanalını kullanabilirsiniz.`,
            ephemeral: true
        });
    }

    // Fetch any active punishments
    const punishment = await Punitives.findOne({
        Member: interaction.user.id,
        Active: true,
        Type: { $in: ["Underworld", "Cezalı", "Karantina", "Jail", "Cezalandırılma", "Metin Susturulma", "Ses Susturulma", "Yasaklama", "Uyarılma", "Yetkili Uyarı", "Sözlü Uyarı"] }
    }).sort({ Date: -1 });

    if (!punishment) {
        return interaction.reply({
            content: "Sistemde aktif bir cezanız bulunmamaktadır.",
            ephemeral: true
        });
    }

    if (interaction.customId === "ceza_sure") {
        if (!punishment.Duration) {
            return interaction.reply({
                content: `Cezanız **Süresiz** olarak belirlenmiştir. Yetkililer tarafından kaldırılana kadar devam edecektir.`,
                ephemeral: true
            });
        }

        const now = Date.now();
        const durationTime = new Date(punishment.Duration).getTime(); // Ensure it's timestamp

        if (durationTime <= now) {
            return interaction.reply({
                content: `Cezanızın süresi dolmuş görünmektedir. Lütfen yetkililerle iletişime geçin.`,
                ephemeral: true
            });
        }

        const timestampToken = Math.floor(durationTime / 1000);
        return interaction.reply({
            content: `Cezanız <t:${timestampToken}:R> sona erecek. (<t:${timestampToken}:F>)`,
            ephemeral: true
        });
    }

    if (interaction.customId === "ceza_sebep") {
        return interaction.reply({
            content: `Ceza Türü: **${punishment.Type}**\nCeza Sebebi: **${punishment.Reason || "Belirtilmemiş"}**`,
            ephemeral: true
        });
    }
};
