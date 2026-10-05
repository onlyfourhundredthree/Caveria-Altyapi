const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("panel")
        .setDescription("Yetkili Görev & XP Sistemi Yönetim Paneli"),

    async execute(interaction, client) {
        const isOwner = ConfigManager.isOwner(interaction.member);
        
        if (!isOwner) {
            return interaction.reply({ content: "Bu paneli açmak için yeterli yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }
        
        const emojis = ConfigManager.get("Emojis") || {};
        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: interaction.guild.iconURL({ dynamic: true }) || interaction.user.displayAvatarURL() }
                        },
                        components: [
                            {
                                type: 10,
                                content: `## ${emojis.toji_staff || ""} Yönetim Paneli\n**Yetkili sistemini buradan yönetebilirsiniz. Aşağıdaki butonları kullanarak istediğiniz kategoriye gidin.**`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `${emojis.toji_nokta || "•"} **Görev Yönetimi:** Rol bazlı görev havuzunu düzenleyin.\n` +
                            `${emojis.toji_nokta || "•"} **Rütbe Ayarları:** Temel rütbe seviyelerini ve XP şartlarını ayarlayın.\n` +
                            `${emojis.toji_nokta || "•"} **Global Ayarlar:** Sorumluluk rollerini, esnetme kurallarını ve XP çarpanlarını yönetin.\n` +
                            `${emojis.toji_nokta || "•"} **Rütbe Profili & Detay Yönetimi:** Bir rütbenin zorunlu görevlerini, XP çarpanlarını ve limit/ceza ayarlarını tek bir ekrandan yönetin.\n` +
                            `${emojis.toji_nokta || "•"} **En İyi Yetkili:** Haftanın/İki haftanın en iyi yetkilisi sistemini ayarlayın.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_task_mgmt", label: "Görev Yönetimi", style: 1 },
                            { type: 2, custom_id: "panel_rank_mgmt", label: "Rütbe Ayarları", style: 1 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_rank_detail", label: "Rütbe Profili & Detay Yönetimi", style: 3 },
                            { type: 2, custom_id: "panel_claim_settings", label: "Claim Ayarları", style: 1 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_xp_give", label: "XP Dağıt / Ver", style: 3 },
                            { type: 2, custom_id: "panel_coin_give", label: "Coin Dağıt / Ver", style: 3 },
                            { type: 2, custom_id: "panel_staff_sync", label: "Rol Entegrasyonu (Sync)", style: 1 },
                            { type: 2, custom_id: "panel_best_staff", label: "Haftanın En İyi Yetkilisi", style: 2 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_global_resp", label: "Sorumluluk Rolleri", style: 2 },
                            { type: 2, custom_id: "panel_global_stretch", label: "Esnetme Rolleri", style: 2 },
                            { type: 2, custom_id: "panel_global_xpmult", label: "XP Çarpanları", style: 2 }
                        ]
                    }
                ]
            }
        ];

        await interaction.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: componentsV2
        });
    }
}
