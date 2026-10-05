const { SlashCommandBuilder } = require("discord.js");
const RolLogService = require("../../../Services/Staff/RolLogService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rollog")
        .setDescription("Bir kullanıcının geçmiş rol kayıtlarını listeler.")
        .addUserOption(option => option.setName("user").setDescription("Geçmişini görmek istediğiniz kullanıcıyı belirtin.").setRequired(true)),

    execute: async (interaction) => {
        const member = interaction.options.getMember("user");
        await RolLogService.execute(interaction, member);
    }
};
