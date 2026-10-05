const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const ScheduledMessage = require("../../../Core/Database/ScheduledMessage");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mesajlar")
        .setDescription("Otomatik mesaj yönetim paneli"),

    async execute(interaction, client) {
        const isOwner = ConfigManager.isOwner(interaction.member);
        if (!isOwner) {
            return interaction.reply({ content: "Bu paneli açmak için yeterli yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const messages = await ScheduledMessage.find({ guildID: interaction.guild.id });
        const itemsPerPage = 5;
        const totalPages = Math.ceil(messages.length / itemsPerPage) || 1;
        const paged = messages.slice(0, itemsPerPage);

        let msgStr = messages.length > 0
            ? paged.map((m, i) => {
                const typeInfo = m.isRepeating ? `🔄 Her ${m.intervalHours} Saatte (${m.sentCount}/${m.maxRepetitions || "∞"})` : "⏰ Günlük";
                return `**${i + 1}.** <#${m.channelID}> | \`${String(m.hour).padStart(2, "0")}:${String(m.minute).padStart(2, "0")}\` | ${m.active ? "🟢" : "🔴"}\n> ${typeInfo}\n> ${m.message.length > 50 ? m.message.slice(0, 47) + "..." : m.message}`;
            }).join("\n\n")
            : "Henüz planlanmış bir mesaj bulunmuyor.";

        await interaction.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## 📢 Otomatik Mesajlar\n> **Sayfa 1/${totalPages}** — Toplam ${messages.length} mesaj` },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: msgStr },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_automsg_add", label: "Yeni Ekle", style: 3 },
                            { type: 2, custom_id: "panel_automsg_edit_list", label: "Düzenle", style: 1, disabled: messages.length === 0 },
                            { type: 2, custom_id: "panel_automsg_remove_list", label: "Sil", style: 4, disabled: messages.length === 0 },
                            { type: 2, custom_id: "panel_automsg_toggle_list", label: "Aktif/Pasif", style: 1, disabled: messages.length === 0 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "panel_automsg_prev", label: "◀", style: 2, disabled: true },
                            { type: 2, custom_id: "panel_automsg_next", label: "▶", style: 2, disabled: totalPages <= 1 },
                            { type: 2, custom_id: "panel_automsg_clear_confirm", label: "Tümünü Sil", style: 4, disabled: messages.length === 0 },
                            { type: 2, custom_id: "panel_automsg_refresh", label: "Yenile", style: 2 }
                        ]
                    }
                ]
            }]
        });
    }
};

