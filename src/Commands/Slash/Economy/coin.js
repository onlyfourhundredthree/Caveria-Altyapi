const { SlashCommandBuilder } = require("discord.js");
const EconomyService = require("../../../Services/Economy/EconomyService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("coin")
        .setDescription("Mevcut bakiyenizi, mağaza ürünlerini ve sipariş geçmişinizi içeren ekonomi panelini açar.")
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

        await EconomyService.sendEconomyPanel(client, interaction, targetUser, member, guild, interaction.user.id);
    }
};
