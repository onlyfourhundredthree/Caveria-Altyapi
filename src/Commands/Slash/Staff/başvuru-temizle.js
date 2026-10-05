const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const StaffApp = require("../../../Core/Database/StaffApp");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("başvuru-temizle")
        .setDescription("Kullanıcının tüm başvurularını temizler.")
        .addUserOption(o => o.setName("kullanıcı").setDescription("Başvuruları temizlenecek kullanıcı").setRequired(true)),

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });
        }

        const user = interaction.options.getUser("kullanıcı");
        const result = await StaffApp.updateMany(
            { guildID: interaction.guild.id, userID: user.id, status: { $in: ["active", "completed"] } },
            { $set: { status: "cancelled" } }
        );

        return interaction.reply({
            content: result.modifiedCount > 0
                ? `✅ ${user} kullanıcısının **${result.modifiedCount}** başvurusu iptal edildi.`
                : `⚠️ ${user} kullanıcısının aktif/tamamlanmış başvurusu bulunamadı.`,
            flags: [MessageFlags.Ephemeral]
        });
    }
};
