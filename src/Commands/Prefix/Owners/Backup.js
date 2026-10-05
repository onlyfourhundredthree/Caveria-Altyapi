const BackupService = require("../../../Services/Systems/BackupService");

module.exports = {
    conf: {
        usages: ["backup", "yedek"],
        description: "Sunucunun yedeğini almanızı ve mevcut yedekleri görüntülemenizi sağlar.",
        category: "Owners",
        usage: ".backup",
        owner: true
    },

    run: async (client, message, args) => {
        const payload = await BackupService.getDashboard(message.guild);
        return message.channel.send(payload);
    },
};
