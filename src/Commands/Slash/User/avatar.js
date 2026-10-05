const { SlashCommandBuilder } = require("discord.js");
const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Sizin veya belirttiğiniz birinin profil fotoğrafını tam boy ve HD kalitede gösterir.")
        .addStringOption((option) =>
            option
                .setName("kişi")
                .setDescription("Sizin veya belirttiğiniz birinin profil fotoğrafını tam boy ve HD kalitede gösterir.")
        ),
    async execute(interaction, client) {
        const memberParam = interaction.options.getString('kişi');
        const userId = memberParam || interaction.user.id;

        const targetUser = await client.users.fetch(userId).catch(() => null);
        if (!targetUser) return interaction.reply({ content: ":x: Böyle bir kullanıcı bulunamadı.", ephemeral: true });

        await targetUser.fetch(); // fetch full user object for banner
        await GeneralService.sendAvatar(client, interaction, targetUser, interaction.user);
    }
};