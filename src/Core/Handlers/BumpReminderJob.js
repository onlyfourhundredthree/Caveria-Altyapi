const BumpReminder = require("../Database/BumpReminder");
const ConfigManager = require("./ConfigManager");

const scheduleBumpReminder = (client, guildID, channelID, remindAt) => {
    const delay = remindAt.getTime() - Date.now();
    
    if (delay <= 0) {
        executeReminder(client, guildID, channelID);
    } else {
        setTimeout(() => executeReminder(client, guildID, channelID), delay);
    }
};

const executeReminder = async (client, guildID, channelID) => {
    try {
        await BumpReminder.deleteOne({ guildID, channelID });
        
        const guild = client.guilds.cache.get(guildID);
        if (!guild) return;
        
        const channel = guild.channels.cache.get(channelID);
        if (!channel) return;
        
        const pingRoles = ConfigManager.get("Roles.Responsibilities.BumpPingRoles") || [];
        if (pingRoles.length === 0) return;
        
        const pingText = pingRoles.map(rID => {
            if (rID.toLowerCase() === "everyone" || rID.toLowerCase() === "@everyone") return "@everyone";
            if (rID.toLowerCase() === "here" || rID.toLowerCase() === "@here") return "@here";
            return `<@&${rID}>`;
        }).join(" ");
        
        await channel.send({
            content: `${pingText}\n\n**Bump zamanı geldi!** Lütfen \`/bump\` komutunu kullanarak sunucumuzu öne çıkarın.`
        });
    } catch (err) {
        console.error("Bump Reminder Error:", err);
    }
};

const initBumpReminders = async (client) => {
    try {
        const reminders = await BumpReminder.find({});
        for (const reminder of reminders) {
            scheduleBumpReminder(client, reminder.guildID, reminder.channelID, reminder.remindAt);
        }
    } catch (err) {
        console.error("Init Bump Reminders Error:", err);
    }
};

module.exports = {
    scheduleBumpReminder,
    initBumpReminders
};
