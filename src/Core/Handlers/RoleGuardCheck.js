const ConfigManager = require("./ConfigManager");
const Utils = require("../../Services/Stats/LevelUtils");
const StatHistory = require("../Database/StatHistory");

module.exports = (client) => {
    setInterval(async () => {
        if (!ConfigManager.get("Level.RoleGuard")) return;

        const guild = client.guilds.cache.get(client.settings?.Main?.GuildID || ConfigManager.get("GuildID"));
        if (!guild) return;

        const voiceRanks = ConfigManager.get("Roles.VoiceRanks") || [];
        const messageRanks = ConfigManager.get("Roles.MessageRanks") || [];

        const members = guild.members.cache;

        for (const [id, member] of members) {
            if (member.user.bot) continue;

            const stats = await StatHistory.aggregate([
                { $match: { guildID: guild.id, userID: member.id } },
                { $group: { _id: "$userID", msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
            ]);

            const voiceXP = stats[0] ? stats[0].voiceTotal : 0;
            const msgXP = stats[0] ? stats[0].msgTotal : 0;

            const voiceLevel = Utils.calculateVoiceLevel(voiceXP);
            const msgLevel = Utils.calculateMessageLevel(msgXP);

            const memberVoiceRoles = voiceRanks.filter(r => member.roles.cache.has(r.Role));
            for (const rData of memberVoiceRoles) {
                if (voiceLevel < rData.Level) {
                    await member.roles.remove(rData.Role).catch(() => null);
                }
            }

            const memberMsgRoles = messageRanks.filter(r => member.roles.cache.has(r.Role));
            for (const rData of memberMsgRoles) {
                if (msgLevel < rData.Level) {
                    await member.roles.remove(rData.Role).catch(() => null);
                }
            }
        }

    }, 1000 * 60 * 15); 
};

