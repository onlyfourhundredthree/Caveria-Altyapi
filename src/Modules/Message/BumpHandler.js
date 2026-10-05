const TaskManager = require("../../Core/Handlers/TaskManager");
const StaffTasks = require("../../Core/Database/StaffTasks");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const moment = require("moment");

module.exports = async (message) => {
    if (!message.guild || !message.author.bot) return;

    const IS_BUMP_SUCCESS = (message.author.id === "302050872383242240" && message.embeds.length > 0 && (message.embeds[0].description?.includes("Öne çıkarma başarılı!")));

    if (IS_BUMP_SUCCESS) {
        const interactionUser = message.interaction?.user || message.mentions.users.first();
        if (!interactionUser) return;

        const member = await message.guild.members.fetch(interactionUser.id).catch(() => null);
        if (member) {
            await TaskManager.progressTask(message.guild, member, "BUMP");
        }

        await StaffTasks.findOneAndUpdate(
            { guildID: message.guild.id, userID: interactionUser.id },
            { $inc: { bumps: 1 } },
            { upsert: true, setDefaultsOnInsert: true }
        );

        const StatHistory = require("../../Core/Database/StatHistory");
        const today = moment().format("YYYY-MM-DD");
        await StatHistory.findOneAndUpdate(
            { guildID: message.guild.id, userID: interactionUser.id, date: today },
            { $inc: { bump: 1 } },
            { upsert: true, setDefaultsOnInsert: true }
        ).catch(err => console.error("StatHistory Bump Update Error:", err));

        const logChannelID = ConfigManager.get("Channels.BumpLog");
        const logChannel = logChannelID
            ? message.guild.channels.cache.get(logChannelID)
            : message.guild.channels.cache.find(c => c.name === "bump-log");

        if (logChannel) {
            logChannel.send(`${ConfigManager.get("Emojis.toji_onay") || "✨"} ${interactionUser} bir bump attı! Toplam bump görevi +1 ilerletildi.`);
        }

        const pingRoles = ConfigManager.get("Roles.Responsibilities.BumpPingRoles") || [];
        if (pingRoles.length > 0) {
            const BumpReminder = require("../../Core/Database/BumpReminder");
            const { scheduleBumpReminder } = require("../../Core/Handlers/BumpReminderJob");
            
            const remindAt = new Date(Date.now() + 2 * 60 * 60 * 1000); 
            
            await BumpReminder.findOneAndUpdate(
                { guildID: message.guild.id, channelID: message.channel.id },
                { remindAt },
                { upsert: true }
            ).catch(err => console.error("BumpReminder Save Error:", err));

            scheduleBumpReminder(message.client, message.guild.id, message.channel.id, remindAt);
            message.channel.send({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} Teşekkürler ${interactionUser}! Bump işlemin kaydedildi. **2 saat** sonra tekrar hatırlatacağım.` }).catch(() => {});
        } else {
            message.channel.send({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} Teşekkürler ${interactionUser}! Bump işlemin başarıyla kaydedildi.` }).catch(() => {});
        }
    }
};
