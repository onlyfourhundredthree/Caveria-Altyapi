const ManageBotService = require("../../../Services/Systems/ManageBotService");

module.exports = {
    conf: {
        usages: ["manage-bots", "manage-bot", "bot-manage", "bot-manage-panel", "bot-panel"],
        description: "Bot yönetim panelini açar.",
        category: "Owners",
        usage: ".manage-bots",
        owner: true
    },

    run: async (client, message, args) => {
        if (message.deletable) await message.delete().catch(() => {});
        const payload = await ManageBotService.getDashboard(client);
        return message.channel.send(payload);
    },
};
