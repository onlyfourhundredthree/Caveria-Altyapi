const { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } = require("discord.js");
const TwitterService = require("../../../Services/Systems/TwitterService");

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("Takip Et/Bırak")
        .setType(ApplicationCommandType.User),

    async execute(interaction, client) {
        const target = interaction.targetUser;
        if (!target) return interaction.reply({ content: "Kullanıcı bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const result = await TwitterService.toggleFollow(interaction.guild.id, interaction.user.id, target.id);
        await interaction.reply({ content: result.message, flags: [MessageFlags.Ephemeral] });
    }
};
