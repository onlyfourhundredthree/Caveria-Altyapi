const { SlashCommandBuilder } = require('discord.js');
const PermanentRoomService = require("../../../Services/PermanentRoomService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kalicioda")
        .setDescription("Merkezi Kalıcı Oda Yönetim Paneli"),
    async execute(interaction, client) {
        const payload = await PermanentRoomService.getDashboardPayload(client, interaction.member);
        await interaction.reply({ ...payload, ephemeral: false });
    }
};
