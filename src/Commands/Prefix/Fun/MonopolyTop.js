const { MessageFlags } = require("discord.js");
const MonopolyProfile = require("../../../Core/Database/MonopolyProfile");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["monopoly-top", "monopolytop", "cpoly-top", "cpolytop"],
        description: "Sunucudaki en çok Monopoly zaferi kazanan oyuncuların sıralamasını gösterir.",
        category: "Fun",
        usage: ".monopoly-top"
    },

    run: async (client, message, args) => {
        const topProfiles = await MonopolyProfile.find().sort({ wins: -1, totalMoneyEarned: -1 }).limit(10);

        const sparkles = ConfigManager.get("Emojis.toji_sparkles") || "✨";
        const hubSparkles = ConfigManager.get("Emojis.toji_hubsparkles") || "✨";

        if (!topProfiles || topProfiles.length === 0) {
            return message.reply("⚠️ Henüz kayıtlı Monopoly sıralama verisi bulunmuyor.").catch(() => {});
        }

        const leaderboardLines = await Promise.all(
            topProfiles.map(async (p, idx) => {
                let u = client.users.cache.get(p.userID);
                if (!u) u = await client.users.fetch(p.userID).catch(() => null);

                const medal = idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : `**${idx + 1}.**`));
                const userTag = u ? u.toString() : `<@${p.userID}>`;
                return `> ${medal} ${userTag} — **${p.wins} Zafer** | \`$${p.totalMoneyEarned.toLocaleString()}\` kazanıldı (\`${p.playedGames}\` Maç)`;
            })
        );

        const components = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `> ## ${sparkles} MONOPOLY LİDERLİK SIRALAMASI 🏆\n> -# Sunucudaki en başarılı Monopoly emlak kralları sıralaması:`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: leaderboardLines.join("\n")
                    }
                ]
            }
        ];

        return message.reply({ flags: [MessageFlags.IsComponentsV2], components }).catch(() => {});
    }
};
