const TaskManager = require("../../Core/Handlers/TaskManager");

module.exports = async (message) => {
    if (message.author.id !== "868528396261543936" || message.channel.id !== "1477377981184872671") return;

    if (!message.embeds || message.embeds.length === 0) return;

    const description = message.embeds[0].description || "";

    const isReview = description.includes("yorum yaptı");
    const isFiveStars = description.includes("⭐⭐⭐⭐⭐");

    if (isReview && isFiveStars) {
        const idMatch = description.match(/https:\/\/dcsv\.me\/user\/(\d{17,19})/);
        const userID = idMatch ? idMatch[1] : null;

        if (userID) {
            const member = await message.guild.members.fetch(userID).catch(() => null);
            if (member) {
                await TaskManager.progressTask(message.guild, member, "REVIEW");

                const client = global.bot;
                const activeGiveaways = client.giveawayManager ? client.giveawayManager.giveaways.filter(gw => !gw.ended && gw.extraData?.minReviews) : [];
                const GiveawayStats = require("../../Core/Database/GiveawayStats");
                for (const gw of activeGiveaways) {
                    await GiveawayStats.findOneAndUpdate(
                        { giveawayId: gw.messageId, userId: userID },
                        { $inc: { reviewCount: 1 } },
                        { upsert: true }
                    );
                }
            }
        }
    }
};
