const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["lobi-panel", "lobi", "lobby", "lobby-panel"],
        description: "Oyuncu bulma sistemi, düzenlenecek.",
        category: "Owners",
        usage: ".lobi-panel",
        owner: true
    },

    run: async (client, message, args) => {
        const emojis = ConfigManager.get("Emojis") || {};
        const guildIcon = message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();

        const createId = (emojis.toji_create?.match(/\d+/) || [""])[0];
        const infoId = (emojis.toji_info?.match(/\d+/) || [""])[0];
        const trashId = (emojis.riot_trash?.match(/\d+/) || [""])[0];

        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: guildIcon }
                        },
                        components: [
                            {
                                type: 10,
                                content: `## ${emojis.lobby_crown || "👑"} Oyuncu & Lobi Bulma Sistemi\n\nOyun arkadaşı mı arıyorsun? Yoksa takımının eksik rolünü tamamlayacak o efsane oyuncuyu mu? **Doğru yerdesin.**\n\n### 📌 Neler Yapabilirsin?\n${emojis.toji_nokta || "-"} **Lobi Kurarak** aradığın kriterleri (Rank, Rol, Ajan vb.) belirtebilir ve yeteneklerinden faydalanabilirsin.\n\n> *Açtığın lobiler sana özel belirlenen Lobi kanalına gönderilir ve orada **5 dakika** boyunca aktif kalır (Dilersen yeniden güncelleyerek süresini uzatabilirsin).*`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "lobby_create", label: "Lobi Kur / Güncelle", style: 3, emoji: createId ? { id: createId } : { name: "➕" } },
                            { type: 2, custom_id: "lobby_delete", label: "Lobimi İptal Et", style: 4, emoji: trashId ? { id: trashId } : { name: "🗑️" } }
                        ]
                    }
                ]
            }
        ];

        await message.channel.send({ components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
        if (message.deletable) await message.delete().catch(() => { });
    }
};
