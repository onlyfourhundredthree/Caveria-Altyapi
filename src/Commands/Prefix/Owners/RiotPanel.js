const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["riot-panel", "riot-accounts", "game-accounts", "riot-accounts-panel", "game-accounts-panel"],
        description: "Düzenlenecek.",
        category: "Owners",
        usage: ".riot-panel",
        owner: true
    },

    run: async (client, message, args) => {
        const emojis = ConfigManager.get("Emojis") || {};
        const guildIcon = message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();

        const lolEmojiId = (emojis.riot_lol?.match(/\d+/) || [""])[0];
        const valoEmojiId = (emojis.riot_valo?.match(/\d+/) || [""])[0];
        const clipboardId = (emojis.riot_clipboard?.match(/\d+/) || [""])[0];

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
                                content: `## ${emojis.toji_info || "📌"} Oyun Hesapları Yönetimi\n\nSunucu içerisindeki veritabanımıza **Riot Games** hesaplarınızı bağlayarak oyun içerisindeki istatistiklerinizi discord profiliniz ile entegre edebilirsiniz.\n\n### ❓ Nasıl Bağlanır?\n${emojis.toji_nokta || "-"} Aşağıdaki **Menüden** bağlamak istediğiniz platformu seçin.\n${emojis.toji_nokta || "-"} Açılan ekrana **Riot ID'nizi** *(İsim#Etiket)* formatında girin.\n${emojis.toji_nokta || "-"} Gerekli doğrulama adımını geçerek hesabınızı başarıyla bağlayın!\n\n> *Bağlı hesaplarınızı detaylıca yönetmek ve incelemek için aşağıdaki **Hesaplarım** butonunu kullanabilirsiniz.*`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "game_select_platform",
                                placeholder: "Hangi hesabını bağlamak istiyorsun?",
                                options: [
                                    { label: "League of Legends", description: "LoL hesabını Profil Avatarı yöntemiyle bağla...", value: "game_lol", emoji: lolEmojiId ? { id: lolEmojiId } : undefined },
                                    { label: "VALORANT", description: "Valorant hesabını Oyuncu Kartı yöntemiyle bağla...", value: "game_valo", emoji: valoEmojiId ? { id: valoEmojiId } : undefined }
                                ]
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "game_manage_accounts", label: "Hesaplarım", style: 2, emoji: clipboardId ? { id: clipboardId } : undefined }
                        ]
                    }
                ]
            }
        ];

        await message.channel.send({
            components: componentsV2,
            flags: [MessageFlags.IsComponentsV2]
        });

        message.delete().catch(() => { });
    }
};
