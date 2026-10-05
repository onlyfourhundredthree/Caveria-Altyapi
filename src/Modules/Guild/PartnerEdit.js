const partnerCounter = require("../Message/PartnerCounter");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author.bot) return;

    const partnerChannels = [
        ConfigManager.get("Channels.Partner"),
        ConfigManager.get("Channels.PartnerTR"),
        ConfigManager.get("Channels.PartnerEN"),
        ConfigManager.get("Channels.PartnerGlobal")
    ].filter(id => Boolean(id) && typeof id === "string");

    if (!partnerChannels.includes(newMessage.channel.id)) return;

    const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/([a-zA-Z0-9-]+)/;

    const oldContent = oldMessage.content || "";
    const newContent = newMessage.content || "";

    const oldMatch = oldContent.match(inviteRegex);
    const newMatch = newContent.match(inviteRegex);

    if (!oldMatch && newMatch) {
        partnerCounter(newMessage);
    }
};
