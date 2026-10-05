const ConfigManager = require("../../Core/Handlers/ConfigManager");
const GiveawaysManager = require("../../Services/Systems/Giveaway/Manager");

module.exports = async (client) => {
    await ConfigManager.init();
    
    const LM = require("../../Core/Handlers/LM");
    LM.init();
    client.config = ConfigManager;

    require("../../Core/Handlers/PermanentRoomJob")(client);
    require("../../Core/Handlers/WeeklyRewardJob")(client);
    require("../../Core/Handlers/WeeklyRespectJob")(client);
    require("../../Core/Handlers/WeeklyXPJob")(client);
    require("../../Core/Handlers/OtorolJob")(client);
    require("../../Core/Handlers/BestStaffJob")(client);
    require("../../Core/Handlers/OneOnOneJob")(client);

    const CoinQuestionSystem = require("../../Services/Systems/CoinQuestionSystem");
    await CoinQuestionSystem.init();

    const MessageScheduler = require("../../Services/Systems/MessageScheduler");
    await MessageScheduler.init();

    client.giveawayManager = new GiveawaysManager(client, {
        default: {
            embedColor: '#00FFFB',
            embedColorEnd: '#850000',
            reaction: (() => {
                const confetti = ConfigManager.get("Emojis").confetti;
                if (!confetti) return "🎉";
                const match = confetti.match(/:(.+:\d+)>/);
                if (match) return match[1];
                const idMatch = confetti.match(/:(\d+)>/);
                if (idMatch) return idMatch[1];
                return confetti;
            })(),
            botsCanWin: false,
            exemptMembers: async (member, giveaway, providedStats = null) => {
                const { extraData } = giveaway;
                if (!extraData) return false;

                const stats = providedStats || await require("../../Core/Database/GiveawayStats").findOne({ giveawayId: giveaway.messageId, userId: member.id });

                if (extraData.staffOnly && !ConfigManager.get("Roles.Ban_Staff").some(role => member.roles.cache.has(role))) return true;
                if (extraData.minMessages && (!stats || stats.messageCount < extraData.minMessages)) return true;
                if (extraData.minVoiceTime && (!stats || stats.voiceTime < extraData.minVoiceTime)) return true;
                if (extraData.minVotes && (!stats || stats.voteCount < extraData.minVotes)) return true;
                if (extraData.minReviews && (!stats || stats.reviewCount < extraData.minReviews)) return true;
                if (extraData.minInvites && (!stats || stats.inviteCount < extraData.minInvites)) return true;

                return false;
            }
        }
    });
};
