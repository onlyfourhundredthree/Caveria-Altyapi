const { SlashCommandBuilder } = require("discord.js");
const YetkiTasiService = require("../../../Services/Staff/YetkiTasiService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("yetkitasi")
        .setDescription("Bir kullanıcının yetkilerini başka bir kullanıcıya taşır.")
        .addUserOption(option => 
            option.setName("kaynak_kullanici")
                .setDescription("Yetkileri alınacak kaynak kullanıcı")
                .setRequired(true)
        )
        .addUserOption(option => 
            option.setName("hedef_kullanici")
                .setDescription("Yetkilerin verileceği hedef kullanıcı")
                .setRequired(true)
        ),
    category: "Staff",
    execute: async (interaction) => {
        const sourceId = interaction.options.getUser("kaynak_kullanici").id;
        const targetId = interaction.options.getUser("hedef_kullanici").id;
        await YetkiTasiService.execute(interaction, sourceId, targetId);
    }
};
