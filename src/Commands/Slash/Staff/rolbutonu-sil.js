const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const RoleButton = require("../../../Core/Database/RoleButton");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolbutonu-sil")
        .setDescription("Daha önce oluşturulmuş bir rol butonu kuralını siler.")
        .addStringOption(o => o.setName("custom_id").setDescription("Silinecek butonun özel kimliği (rolebtn_ hariç)").setRequired(true)),

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });
        }

        const customId = interaction.options.getString("custom_id").replace("rolebtn_", "").trim();

        const deleted = await RoleButton.findOneAndDelete({ guildID: interaction.guild.id, customId });

        if (!deleted) {
            return interaction.reply({ content: `❌ \`${customId}\` ID'sine sahip bir buton kuralı bulunamadı.`, flags: [MessageFlags.Ephemeral] });
        }

        return interaction.reply({
            content: `✅ \`${customId}\` ID'li rol butonu kuralı başarıyla silindi. Eğer mesajlardaki butonlar duruyorsa artık işlevsiz kalacaklardır.`,
            flags: [MessageFlags.Ephemeral]
        });
    }
};
