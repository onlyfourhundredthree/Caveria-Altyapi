const CopyCategoryService = require("../../../Services/Moderation/CopyCategoryService");

module.exports = {
    conf: {
        usages: ["copycategory", "kategorikopyala"],
        description: "Seçilen kategorinin tüm özellikleri ve izinleriyle bir kopyasını hemen altına oluşturur.",
        category: "Moderation",
        usage: ".copycategory <KategoriID>"
    },

    run: async (client, message, args) => {
        await CopyCategoryService.execute(message, args[0]);
    }
};
