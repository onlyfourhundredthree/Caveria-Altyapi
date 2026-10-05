const { SlashCommandBuilder, MessageFlags, PermissionsBitField } = require('discord.js');
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("partner")
        .setDescription("Partner yöneticisi kontrol paneli."),
    async execute(interaction, client) {
        if (
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !ConfigManager.isOwner(interaction.member)
        ) {
            const Emojis = ConfigManager.get('Emojis') || {};
            const iptal = Emojis.toji_iptal || "✨";
            return interaction.reply({ content: `${iptal} Bu paneli kullanmak için yeterli yetkiye sahip değilsiniz.`, ephemeral: true });
        }

        const botAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        const Emojis = ConfigManager.get('Emojis') || {};

        const parseEmoji = (raw, fallback) => {
            if (!raw || typeof raw !== 'string' || raw.trim() === '') return { name: fallback };
            const m = raw.match(/<a?:(.+):(\d+)>/);
            if (m) return { name: m[1], id: m[2] };
            return { name: raw };
        };

        const statEmoji = parseEmoji(Emojis.toji_staff, "📊");
        const banEmoji = parseEmoji(Emojis.toji_iptal, "🔨");
        const partnerEmoji = parseEmoji(Emojis.toji_partner, "🤝");
        const setupEmoji = parseEmoji(Emojis.toji_ticket, "📨");
        const editEmoji = parseEmoji(Emojis.pr_edit, "✏️");

        const components = [
            {
                type: 17,
                spoiler: false,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: botAvatar }
                        },
                        components: [
                            {
                                type: 10,
                                content: "> ## Partner Kontrol Paneli\n> -# **Bu sistem partner sorumlularına ve yöneticilere aittir.**\n> -# Aşağıdaki seçenekleri kullanarak tüm partner işlemlerini tek bir arayüzden yönetebilirsiniz."
                            }
                        ]
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 1
                    },
                    {
                        type: 10,
                        content: "### İşlem Menüsü & Komutlar"
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Partner Stat Düzenleme:**\nBelirtilen kullanıcının haftalık ve genel partner geçmişine manuel olarak partner sayısı (stat) eklemenizi veya çıkarmanızı sağlar (Örn: 1 veya -1).\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 1,
                            custom_id: "partner_panel_stat",
                            label: "Stat Düzenle",
                            emoji: statEmoji
                        }
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Partner Ban (Yasaklama/Kaldırma):**\nBir sunucuyu sadace davet linki girerek partner sisteminden süresiz yasaklayabilir veya yasağını açabilirsiniz.\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 4,
                            custom_id: "partner_panel_ban",
                            label: "Ban / Unban",
                            emoji: banEmoji
                        }
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Yasaklı Sunucular Listesi:**\nPartnerlik sisteminden yasaklanmış olan (kara listedeki) bütün sunucuları görebilir ve yönetebilirsiniz.\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 2,
                            custom_id: "partner_panel_list",
                            label: "Listeyi Aç",
                            emoji: partnerEmoji
                        }
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Türkçe Partner Paneli Kur:**\nŞu anda bulunduğunuz kanala Türkçe partner bilgilendirmesini ve \"🇹🇷 Partner Yap\" butonunu gönderir.\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 3,
                            custom_id: "partner_panel_setup_tr",
                            label: "TR Panel Kur",
                            emoji: setupEmoji
                        }
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Global Partner Panel Setup:**\nSends the English partner information and \"🌐 Apply for Global Partner\" button to the current channel.\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 1,
                            custom_id: "partner_panel_setup_global",
                            label: "Global Panel Setup",
                            emoji: setupEmoji
                        }
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Partner Mesajını Düzenle:**\nPartnerlik tamamlandığında log kanalına ve kullanıcıya atılan metni düzenleyin.\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 1,
                            custom_id: "partner_edit_message",
                            label: "Mesajı Düzenle",
                            emoji: editEmoji
                        }
                    },
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: "**Reklam Metnini Düzenle:**\nPartner yetkililerinin bizim sunucumuzu başka sunucularda paylaşması gereken reklam metnini ayarlayın.\n*Kullananlar: Yalnızca Yöneticiler*"
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 1,
                            custom_id: "partner_edit_ad",
                            label: "Reklam Metnini Düzenle",
                            emoji: editEmoji
                        }
                    }
                ]
            }
        ];

        await interaction.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: components
        });
    }
};
