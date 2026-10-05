const YtClaimService = require("../../../Services/Staff/YtClaimService");
const { MessageFlags } = require("discord.js");

module.exports = {
    conf: {
        usages: ["ytclaim", "claimyt", "yetkiliclaim", "yt-claim", "yetkili-claim"],
        description: "Yeni alınan bir yetkiliyi 6 saat içerisinde kendinize claimlersiniz.",
        category: "Staff",
        usage: ".ytclaim <@kullanıcı>"
    },

    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        
        if (!targetUser) {
            return message.reply({ content: "❌ Lütfen claimlemek istediğiniz yetkiliyi etiketleyin veya ID'sini girin.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        await YtClaimService.execute(message, targetUser);
    }
};
