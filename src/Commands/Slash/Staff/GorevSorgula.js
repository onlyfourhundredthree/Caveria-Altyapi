const { SlashCommandBuilder, PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require("discord.js");
const StaffUser = require("../../../Core/Database/StaffUser");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const moment = require("moment");
require("moment-duration-format");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("görevsorgula")
        .setDescription("Bir yetkilinin görev geçmişini ve kazandığı XP'leri sorgular.")
        .addUserOption(option =>
            option.setName("kullanıcı")
                .setDescription("Sorgulanacak yetkiliyi seçin.")
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;
        const guildID = interaction.guild.id;

        const userData = await StaffUser.findOne({ guildID, userID: targetUser.id });

        if (!userData || (!userData.history || userData.history.length === 0)) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> # Hata\n> **${targetUser.username}** kullanıcısına ait herhangi bir görev veya XP geçmişi bulunamadı.` }]
                }],
                ephemeral: true
            });
        }

        const fullHistory = [...userData.history]
            .filter(h => h.action === "ADD_XP")
            .sort((a, b) => b.date - a.date);

        if (fullHistory.length === 0) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> # Hata\n> **${targetUser.username}** kullanıcısının XP geçmişi boş.` }]
                }],
                ephemeral: true
            });
        }

        const pageSize = 10;
        let currentPage = 0;
        const totalPages = Math.ceil(fullHistory.length / pageSize);
        const emojis = ConfigManager.get("Emojis") || {};
        const itemEmoji = emojis.toji_nokta || "-";

        const getPaginationButtons = (page) => {
            if (totalPages <= 1) return [];
            return [new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev_page")
                    .setEmoji((ConfigManager.get("Emojis.toji_leftarrow") || "✨"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("next_page")
                    .setEmoji((ConfigManager.get("Emojis.toji_rightarrow") || "✨"))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            )];
        };

        const getPageSelector = (page) => {
            if (totalPages <= 1) return null;

            const options = [];
            for (let i = 0; i < Math.min(totalPages, 25); i++) {
                options.push({
                    label: `Sayfa ${i + 1}`,
                    description: `${i * pageSize + 1} - ${Math.min((i + 1) * pageSize, fullHistory.length)} arası kayıtlar`,
                    value: i.toString(),
                    default: i === page
                });
            }

            return {
                type: 1,
                components: [{
                    type: 3,
                    custom_id: "page_selector",
                    placeholder: "Gitmek istediğiniz sayfayı seçin",
                    options: options
                }]
            };
        };

        const getGorevLayout = (page) => {
            const start = page * pageSize;
            const end = start + pageSize;
            const currentItems = fullHistory.slice(start, end);

            const historyLines = currentItems.map((item, index) => {
                const dateStr = moment(item.date).format("DD.MM.YYYY HH:mm");
                const typeEmoji = item.reason.includes("TASK_COMPLETED") ? (ConfigManager.get("Emojis.toji_onay") || "✨") : "💰";
                const cleanReason = (item.reason || "Bilinmiyor").replace("TASK_COMPLETED: ", "");
                return `\`${start + index + 1}.\` **[${typeEmoji}]** \`${dateStr}\`\n┕ \`${item.amountXP.toFixed(1)} XP\` - *${cleanReason}*`;
            });

            return [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 11,
                                media: { url: targetUser.displayAvatarURL({ extension: 'png' }) },
                            },
                            components: [
                                {
                                    type: 10,
                                    content: `## ${targetUser.globalName || targetUser.username} | Görev & XP Özeti\n${itemEmoji} ${targetUser.toString()} kullanıcısının yetkili faaliyet verileri listelenmektedir.`
                                }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `### İstatistik Paneli\n${itemEmoji} **Toplam XP:** \` ${userData.totalXP.toFixed(1)} \` XP\n${itemEmoji} **Tamamlanan Görevler:** \` ${userData.completedTasks} \` Adet\n${itemEmoji} **Toplam Kayıt Sayısı:** \` ${fullHistory.length} \``
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `### Geçmiş İşlemler\n${historyLines.join("\n") || "Kayıt bulunamadı."}\n\n> Sayfa: \` ${page + 1} / ${totalPages} \``
                        },
                        getPageSelector(page)
                    ].filter(Boolean)
                }
            ];
        };

        const response = await interaction.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [...getGorevLayout(currentPage), ...getPaginationButtons(currentPage)],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            time: 300000
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "Bu işlemi sadece komutu kullanan kişi yapabilir.", ephemeral: true });
            }

            if (i.isButton()) {
                if (i.customId === "prev_page") currentPage--;
                else if (i.customId === "next_page") currentPage++;
            } else if (i.isStringSelectMenu()) {
                if (i.customId === "page_selector") {
                    currentPage = parseInt(i.values[0]);
                }
            }

            await i.update({
                components: [...getGorevLayout(currentPage), ...getPaginationButtons(currentPage)]
            });
        });

        collector.on("end", () => {
            interaction.editReply({ components: getGorevLayout(currentPage) }).catch(() => { });
        });
    }
};
