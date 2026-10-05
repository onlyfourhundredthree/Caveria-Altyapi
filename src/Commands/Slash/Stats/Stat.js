const { SlashCommandBuilder } = require("discord.js");
const StatsService = require("../../../Services/Stats/StatsService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stat")
        .setDescription("Genel sunucu aktifliğinizi (mesaj, ses, kategori) tek bir panelde özetler.")
        .addUserOption(option => 
            option.setName("kullanıcı")
                .setDescription("İstatistiklerine bakmak istediğiniz kullanıcı")
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        const guild = interaction.guild;
        const client = interaction.client;

        await StatsService.sendStatPanel(client, interaction, targetUser, member, guild, interaction.user.id);
    }
};
