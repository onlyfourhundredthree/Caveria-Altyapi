const TaskManager = require("../../Core/Handlers/TaskManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (message) => {
    if (message.author.id !== "868528396261543936" || message.channel.id !== "1474857438699065458") return;

    let content = message.content || (message.embeds[0]?.description) || (message.embeds[0]?.title) || "";

    if (!content && message.components?.length > 0) {
        for (const row of message.components) {
            if (!row.components) continue;
            for (const comp of row.components) {
                if (comp.content) content += " " + comp.content;
            }
        }
    }

    const hasKeywords = content.toLowerCase().includes("oy verdi") || content.toLowerCase().includes("voted");

    if (hasKeywords) {
        let voterUser = message.mentions.users.first();
        let userID = voterUser ? voterUser.id : null;

        if (!userID) {
            const idMatch = content.match(/\d{17,19}/);
            userID = idMatch ? idMatch[0] : null;
        }

        if (!userID && message.embeds[0]?.footer?.text) {
            const footerMatch = message.embeds[0].footer.text.match(/\d{17,19}/);
            userID = footerMatch ? footerMatch[0] : null;
        }

        if (userID) {
            const member = await message.guild.members.fetch(userID).catch(() => null);
            if (member) {
                await TaskManager.progressTask(message.guild, member, "VOTE");

                const client = global.bot;
                const activeGiveaways = client.giveawayManager ? client.giveawayManager.giveaways.filter(gw => !gw.ended && gw.extraData?.minVotes) : [];
                const GiveawayStats = require("../../Core/Database/GiveawayStats");
                for (const gw of activeGiveaways) {
                    await GiveawayStats.findOneAndUpdate(
                        { giveawayId: gw.messageId, userId: userID },
                        { $inc: { voteCount: 1 } },
                        { upsert: true }
                    );
                }
            }
        }
    }
};
