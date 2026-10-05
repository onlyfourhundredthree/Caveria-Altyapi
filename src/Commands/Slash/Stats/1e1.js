const { SlashCommandBuilder } = require("discord.js");
const OneOnOneSessionService = require("../../../Services/Stats/OneOnOneSessionService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("1e1")
        .setDescription("1E1 Görüşme Başlatır veya Paneli Açar")
        .addUserOption(option => 
            option.setName("hedef")
                .setDescription("Sorgulamak istediğiniz kişi")
                .setRequired(false)
        ),

    run: async (client, interaction) => {
        return OneOnOneSessionService.execute(interaction);
    }
};
