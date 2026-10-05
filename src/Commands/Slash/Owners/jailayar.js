const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const JailAyarService = require("../../../Services/Systems/JailAyarService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("jailayar")
        .setDescription("Jail sebep ve sürelerini yönetebileceğiniz paneli açar.")
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: "Bu komutu kullanmaya yetkiniz yetmiyor.", flags: [MessageFlags.Ephemeral] });
        }

        const uid = interaction.user.id;
        const payload = JailAyarService.getDashboard(uid, "main");
        
        return interaction.reply(payload);
    }
};
