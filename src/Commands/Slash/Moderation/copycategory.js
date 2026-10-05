const { SlashCommandBuilder } = require("discord.js");
const CopyCategoryService = require("../../../Services/Moderation/CopyCategoryService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("copycategory")
        .setDescription("Seçilen kategorinin tüm özellikleri ve izinleriyle bir kopyasını hemen altına oluşturur.")
        .addStringOption(option => 
            option.setName("kategori_id")
                .setDescription("Kopyalanacak kategorinin ID'si")
                .setRequired(true)
        ),
    category: "Moderation",
    execute: async (interaction) => {
        const categoryId = interaction.options.getString("kategori_id");
        await CopyCategoryService.execute(interaction, categoryId);
    }
};
