const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const OneOnOneSession = require("../../../Core/Database/OneOnOneSession");
const StaffRoleSystem = require("../../../Core/Database/StaffRoleSystem");

module.exports = {
    conf: {
        name: "1e1",
        aliases: ["birebir"],
        help: "1E1 Görüşme Başlatır veya Bitirir",
        category: "Stats"
    },
    run: async (client, message, args, prefix) => {
        const OneOnOneSessionService = require("../../../Services/Stats/OneOnOneSessionService");
        return OneOnOneSessionService.execute(message, args);
    }
};
