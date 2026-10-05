const MentionNotifications = require("../../Core/Database/MentionNotifications");

module.exports = async (message) => {
    try {
        if (!message.guild) return;
        if (message.author.bot) return;
        if (message.mentions.users.size === 0) return;

        const mentionedUsers = message.mentions.users
            .filter(u => !u.bot && u.id !== message.author.id)
            .map(u => u.id);

        if (mentionedUsers.length === 0) return;

        await MentionNotifications.create({
            messageID: message.id,
            guildID: message.guild.id,
            channelID: message.channel.id,
            authorID: message.author.id,
            authorTag: message.author.tag,
            authorAvatar: message.author.displayAvatarURL({ dynamic: true }),
            content: message.content || "",
            mentionedUsers
        });
    } catch (error) {
        console.error("[MentionTracker] Etiket kaydı sırasında hata:", error);
    }
};
