const { SlashCommandBuilder } = require("discord.js");
const StaffRatingService = require("../../../Services/Staff/StaffRatingService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("staffrating")
        .setDescription("Yetkili değerlendirmelerini listeler.")
        .addUserOption(option => 
            option.setName("kullanici")
                .setDescription("Değerlendirmelerini görmek istediğiniz yetkili (Boş bırakırsanız kendiniz)")
                .setRequired(false)
        ),
    category: "Staff",
    execute: async (interaction) => {
        const targetMember = interaction.options.getMember("kullanici") || interaction.member;
        await StaffRatingService.execute(interaction, targetMember);
    }
};
