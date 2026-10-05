const client = global.bot;
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Punitives = require("../../Core/Database/Punitives");

module.exports = async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    if (newState.channelId || oldState.channelId) {
        const data = await Punitives.findOne({ Member: member.id, Type: "Ses Susturulma", Active: true });
        if (data) {
            if (newState.channel?.parentId === "1473778406200971399") return;

            const expireTime = data.Duration || data.Expried;
            const isExpired = expireTime ? Date.now() >= expireTime : false;

            if (isExpired) {
                if (member.voice && member.voice.channel && member.voice.serverMute) {
                    await member.voice.setMute(false, "Ses mutesi süresi doldu.").catch(() => {});
                }
                await Punitives.updateOne({ No: data.No }, { $set: { Active: false, Remover: client?.user?.id || "System" } });
            } else {
                // Aktif bir ses mutesi var: Eğer kullanıcı sesteyse ve birisi sağ tık ile mutesini açarsa (serverMute === false) ANINDA geri mute at!
                if (member.voice && member.voice.channel && !member.voice.serverMute) {
                    await member.voice.setMute(true, "Aktif ses mutesi bulunuyor (sağ tık ile açma engellendi).").catch(() => {});
                }
            }
        }
    }
};
