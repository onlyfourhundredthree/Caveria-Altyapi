const { SlashCommandBuilder } = require('discord.js');
const RolDenetimService = require("../../../Services/Staff/RolDenetimService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roldenetim")
        .setDescription("Belirli bir roldeki tüm üyelerin o hafta yaptığı toplam aktifliği analiz eder.")
        .addRoleOption(option => option.setName("rol").setDescription("Denetlenecek rol").setRequired(true)),
    execute: async (interaction) => {
        const role = interaction.options.getRole("rol");
        await RolDenetimService.execute(interaction, role);
    }
};
