const StaffAppInteraction = require("../Interaction/StaffAppInteraction");

module.exports = async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.channel.isThread()) return;
    await StaffAppInteraction.handleThreadMessage(message);
};
