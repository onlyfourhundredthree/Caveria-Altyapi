const LevelAyarService = require("../../../Services/Developers/LevelAyarService");

module.exports = {
    conf: {
        usages: ["levelayar"],
        description: "Level rol sistemini yönetir (Mesaj ve Ses levelleri)",
        category: "Developers"
    },

    run: async (client, message, args) => {
        await LevelAyarService.execute(message);
    }
};
