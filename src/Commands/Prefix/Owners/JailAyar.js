const { PermissionsBitField } = require("discord.js");
const JailAyarService = require("../../../Services/Systems/JailAyarService");

module.exports = {
    conf: {
        usages: ["jailayar", "jail-ayar", "jail-settings", "jail-config", "jail-panel", "jail-ayarlar", "jail-ayarlari"],
        description: "Sistemdeki jail (karantina) sebep ve sürelerini yönetebileceğiniz paneli açar.",
        category: "Owners",
        usage: ".jail-ayar"
    },

    run: async (client, message, args, embed, prefix) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply("Bu komutu kullanmaya yetkin yetmiyor.");
        }

        const uid = message.author.id;
        const payload = JailAyarService.getDashboard(uid, "main");
        
        return message.reply(payload);
    }
};
