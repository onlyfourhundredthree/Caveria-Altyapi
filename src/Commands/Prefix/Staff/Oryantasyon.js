const OryantasyonService = require("../../../Services/Staff/OryantasyonService");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const { MessageFlags } = require("discord.js");

module.exports = {
    conf: {
        usages: ["oryantasyon", "oryantasyon-baslat", "oryantasyon-bitir", "orient"],
        description: "Yeni bir yetkili ile aynı ses kanalında minimum 3 dakikalık oryantasyon sürecini başlatır veya bitirir.",
        category: "Staff",
        usage: ".oryantasyon <@kullanıcı>"
    },

    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        
        if (!targetUser) {
            const iptalEmoji = ConfigManager.get("Emojis.toji_iptal") || "❌";
            return message.reply({ content: `${iptalEmoji} **Hata:** Lütfen oryantasyon yapacağınız yeni yetkiliyi etiketleyin veya ID'sini girin. Örn: \`.oryantasyon @Kullanıcı\``, flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        await OryantasyonService.execute(message, targetUser);
    }
};
