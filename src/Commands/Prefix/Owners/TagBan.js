const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const TagBanService = require("../../../Services/TagBanService");

module.exports = {
    conf: {
        usages: ["tagban", "yasaklı-tag", "tag-ban", "tag-ban-panel", "tagban-panel"],
        description: "Sunucu etiketi (guildtag) yasaklama panelini açar.",
        category: "Owners",
        usage: ".tagban",
        owner: true
    },

    async execute(client, message, args) {
        if (!ConfigManager.isOwner(message.member)) return;

        const payload = await TagBanService.getPayload(client);
        await message.reply(payload);
    }
};
