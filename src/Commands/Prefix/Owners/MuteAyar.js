const { PermissionsBitField } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const MuteAyarService = require("../../../Services/Systems/MuteAyarService");

module.exports = {
    conf: {
        usages: ["muteayar", "mute-ayar", "mute-settings", "mute-config", "mute-panel", "mute-ayarlar", "mute-ayarlari"],
        description: "Sistemdeki mute sebep ve sürelerini yönetebileceğiniz paneli açar.",
        category: "Owners",
        usage: ".mute-ayar"
    },

    run: async (client, message, args, embed, prefix) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return message.reply("Bu komutu kullanmaya yetkin yetmiyor.");
        }

        const uid = message.author.id;
        const payload = MuteAyarService.getDashboard(uid, "main");
        
        return message.reply(payload);
    }
};
