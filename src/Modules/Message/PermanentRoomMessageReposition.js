const PermanentRoom = require("../../Core/Database/PermanentRoom");
const PermanentRoomUtils = require("../../Core/Handlers/PermanentRoomUtils");

const cooldowns = new Map();

module.exports = async (message) => {
    if (!message.guild || message.author.bot) return;

    const room = await PermanentRoom.findOne({ channelID: message.channel.id });
    if (!room) return;

    const lastMessages = await message.channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (lastMessages && lastMessages.has(room.panelMessageID)) return;

    const now = Date.now();
    const key = room._id.toString();
    if (cooldowns.has(key) && now - cooldowns.get(key) < 10000) return;
    cooldowns.set(key, now);

    await PermanentRoomUtils.sendControlPanel(message.channel, room);
};
