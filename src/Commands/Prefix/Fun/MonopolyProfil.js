const { MessageFlags } = require("discord.js");
const MonopolyProfile = require("../../../Core/Database/MonopolyProfile");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["monopoly-profil", "monopolyprofil", "cpoly-profil", "cpolyprofil"],
        description: "Monopoly (Caveriapoly) oyun istatistiklerinizi ve kazandığınız rozetleri görüntüler.",
        category: "Fun",
        usage: ".monopoly-profil [@kullanıcı]"
    },

    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
        
        const profile = await MonopolyProfile.findOne({ userID: targetUser.id }) || {
            userID: targetUser.id,
            playedGames: 0,
            wins: 0,
            totalMoneyEarned: 0,
            propertiesBought: 0,
            bankruptcies: 0
        };

        const winRate = profile.playedGames > 0 ? Math.round((profile.wins / profile.playedGames) * 100) : 0;

        // Badges calculation
        const badges = [];
        if (profile.wins >= 10) badges.push("👑 **Emlak Kralı** (10+ Zafer)");
        if (profile.totalMoneyEarned >= 10000) badges.push("🏦 **Banka Milyoneri** ($10.000+ Servet)");
        if (profile.playedGames >= 25) badges.push("🎲 **Zar Üstadı** (25+ Oyun)");
        if (profile.propertiesBought >= 50) badges.push("🏠 **Emlak Zengini** (50+ Mülk)");

        const badgesStr = badges.length > 0 ? badges.join("\n> ") : "*Henüz rozet kazanılmadı.*";

        const sparkles = ConfigManager.get("Emojis.toji_sparkles") || "✨";
        const hubSparkles = ConfigManager.get("Emojis.toji_hubsparkles") || "✨";

        const components = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: targetUser.displayAvatarURL({ extension: 'png', size: 512 }) }
                        },
                        components: [
                            {
                                type: 10,
                                content: `> ## ${sparkles} MONOPOLY PROFİLİ\n> -# **Kullanıcı:** ${targetUser.toString()} (\`${targetUser.id}\`)`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### ${hubSparkles} **Oyun İstatistikleri:**\n> 🏆 **Kazanılan Zaferler:** \`${profile.wins}\` (Kazanma Oranı: \`%${winRate}\`)\n> 🎲 **Oynanan Oyun:** \`${profile.playedGames}\` | 🔴 **İflas Sayısı:** \`${profile.bankruptcies}\`\n> 💵 **Toplam Kazanılan Para:** \`$${profile.totalMoneyEarned.toLocaleString()}\`\n> 🏠 **Satın Alınan Mülk:** \`${profile.propertiesBought}\``
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### 🎖️ **Kazanılan Rozetler:**\n> ${badgesStr}`
                    }
                ]
            }
        ];

        return message.reply({ flags: [MessageFlags.IsComponentsV2], components }).catch(() => {});
    }
};
