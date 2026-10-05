const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const StaffRating = require("../Database/StaffRating");
const ConfigManager = require("./ConfigManager");

class RatingManager {

    static async sendRatingRequest(guild, user, staff, actionType, channel = null) {
        const actionNames = {
            "PARTNERSHIP": "Partnerlik",
            "TICKET": "Destek Talebi"
        };

        const actionName = actionNames[actionType] || "İşlem";
        const adminAvatar = staff.displayAvatarURL({ dynamic: true, size: 256 });

        const ratingV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: adminAvatar }
                        },
                        components: [
                            {
                                type: 10,
                                content: `> ## 🌸 Yetkili Puanlama\n> -# Merhaba ${user}, **${staff.tag}** isimli yetkili ile **${actionName}** işlemini tamamladınız.\n> -# Lütfen önce puanınızı seçin, ardından isterseniz yorum ekleyip değerlendirmeyi tamamlayın.`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: `rate_select_${staff.id}_${actionType}_${guild.id}`,
                                placeholder: "Puanınızı seçin (1-5 Yıldız)",
                                options: [
                                    { label: "⭐", value: "1", description: "Çok Kötü" },
                                    { label: "⭐⭐", value: "2", description: "Kötü" },
                                    { label: "⭐⭐⭐", value: "3", description: "Orta" },
                                    { label: "⭐⭐⭐⭐", value: "4", description: "İyi" },
                                    { label: "⭐⭐⭐⭐⭐", value: "5", description: "Mükemmel" }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        try {
            if (channel) {
                await channel.send({ components: ratingV2, flags: [MessageFlags.IsComponentsV2] });
            } else {
                await user.send({ components: ratingV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
            }
        } catch (err) {
            console.error("[RatingManager] Error sending rating request:", err);
        }
    }


    static async handleInteraction(interaction) {
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith("rate_select_")) {
            const parts = interaction.customId.split("_");
            const staffID = parts[2];
            const actionType = parts[3];
            const guildID = parts[4];
            const ratingValue = parseInt(interaction.values[0]);

            await StaffRating.findOneAndUpdate(
                { guildID, staffID, userID: interaction.user.id, actionType },
                { rating: ratingValue, date: new Date() },
                { upsert: true }
            );

            const stars = "⭐".repeat(ratingValue);

            const nextStepV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## ⭐ Puan Seçildi: ${stars}\n> -# Değerlendirmeyi tamamlamak için bir seçim yapın.`
                        },
                        {
                            type: 1,
                            components: [
                                { type: 2, custom_id: `rate_comment_${staffID}_${actionType}_${guildID}`, label: "✍️ Yorum Ekle", style: 2 },
                                { type: 2, custom_id: `rate_finish_${staffID}_${actionType}_${guildID}`, label: "✅ Değerlendirmeyi Bitir", style: 3 }
                            ]
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 3,
                                    custom_id: `rate_select_${staffID}_${actionType}_${guildID}`,
                                    placeholder: "Puanı Değiştir",
                                    options: [
                                        { label: "⭐", value: "1", default: ratingValue === 1 },
                                        { label: "⭐⭐", value: "2", default: ratingValue === 2 },
                                        { label: "⭐⭐⭐", value: "3", default: ratingValue === 3 },
                                        { label: "⭐⭐⭐⭐", value: "4", default: ratingValue === 4 },
                                        { label: "⭐⭐⭐⭐⭐", value: "5", default: ratingValue === 5 }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ];

            await interaction.update({ components: nextStepV2, flags: [MessageFlags.IsComponentsV2] });
        }

        if (interaction.isButton() && interaction.customId.startsWith("rate_comment_")) {
            const parts = interaction.customId.split("_");
            const staffID = parts[2];
            const actionType = parts[3];
            const guildID = parts[4];

            const modal = new ModalBuilder()
                .setCustomId(`rate_modal_${staffID}_${actionType}_${guildID}`)
                .setTitle("Yetkili Değerlendirme Yorumu");

            const commentInput = new TextInputBuilder()
                .setCustomId("rating_comment")
                .setLabel("Yorumunuzu Yazın")
                .setPlaceholder("Yetkili hakkında görüşlerinizi belirtebilirsiniz...")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(500);

            modal.addComponents(new ActionRowBuilder().addComponents(commentInput));
            await interaction.showModal(modal);
        }

        if (interaction.isButton() && interaction.customId.startsWith("rate_finish_")) {
            const parts = interaction.customId.split("_");
            const staffID = parts[2];
            const actionType = parts[3];
            const guildID = parts[4];

            const data = await StaffRating.findOne({ guildID, staffID, userID: interaction.user.id, actionType });
            if (!data || !data.rating) {
                return interaction.reply({ content: "Önce bir yıldız seçmelisiniz!", ephemeral: true });
            }

            const successV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## ✅ Değerlendirme Başarıyla Tamamlandı\n> -# Puan: **${"⭐".repeat(data.rating)}**\n> -# Yorum: \`${data.comment || "Yorum eklenmedi"}\``
                        }
                    ]
                }
            ];

            await interaction.update({ components: successV2, flags: [MessageFlags.IsComponentsV2] });
            await this.sendLog(guildID, interaction.user, staffID, actionType, data.rating, data.comment);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith("rate_modal_")) {
            const parts = interaction.customId.split("_");
            const staffID = parts[2];
            const actionType = parts[3];
            const guildID = parts[4];
            const comment = interaction.fields.getTextInputValue("rating_comment");

            const data = await StaffRating.findOneAndUpdate(
                { guildID, staffID, userID: interaction.user.id, actionType },
                { comment: comment, date: new Date() },
                { upsert: true, new: true }
            );

            const stars = data.rating ? "⭐".repeat(data.rating) : "Puan Seçilmedi";

            const postCommentV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## ✍️ Yorumunuz Eklendi\n> -# Puan: **${stars}**\n> -# Yorum: \`${comment}\`\n\n> -# İşlemi bitirmek için lütfen aşağıdaki butona basın.`
                        },
                        {
                            type: 1,
                            components: [
                                { type: 2, custom_id: `rate_finish_${staffID}_${actionType}_${guildID}`, label: "✅ Değerlendirmeyi Tamamla ve Gönder", style: 3 },
                                { type: 2, custom_id: `rate_comment_${staffID}_${actionType}_${guildID}`, label: "✍️ Yorumu Düzenle", style: 2 }
                            ]
                        }
                    ]
                }
            ];

            if (!data.rating) {
                postCommentV2[0].components.push({
                    type: 1,
                    components: [
                        {
                            type: 3,
                            custom_id: `rate_select_${staffID}_${actionType}_${guildID}`,
                            placeholder: "Lütfen bir puan seçin!",
                            options: [
                                { label: "⭐", value: "1" },
                                { label: "⭐⭐", value: "2" },
                                { label: "⭐⭐⭐", value: "3" },
                                { label: "⭐⭐⭐⭐", value: "4" },
                                { label: "⭐⭐⭐⭐⭐", value: "5" }
                            ]
                        }
                    ]
                });
            }

            await interaction.update({ components: postCommentV2, flags: [MessageFlags.IsComponentsV2] });
        }
    }

    static async sendLog(guildID, user, staffID, actionType, rating, comment = "Yorum yok") {
        const guild = global.bot.guilds.cache.get(guildID);
        if (!guild) return;

        const logChannelId = ConfigManager.get("Channels.StaffRating");
        const logChannel = logChannelId ? guild.channels.cache.get(logChannelId) : guild.channels.cache.find(ch => ch.name === "staff-rating");

        if (logChannel) {
            const staff = await guild.members.fetch(staffID).catch(() => null);
            const stars = rating ? "⭐".repeat(rating) : "Puanlanmadı";

            const logV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 11,
                                media: { url: user.displayAvatarURL({ dynamic: true }) }
                            },
                            components: [
                                {
                                    type: 10,
                                    content: `> ## 🌸 Yeni Yetkili Puanlaması\n> -# **${staff ? staff.user.tag : staffID}** hakkında bir değerlendirme yapıldı.`
                                }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `> **Kullanıcı:** ${user} (\`${user.id}\`)\n` +
                                `> **Yetkili:** ${staff ? staff.user : `<@${staffID}>`} (\`${staffID}\`)\n` +
                                `> **İşlem:** \`${actionType}\`\n` +
                                `> **Puan:** ${stars} (\`${rating || 0}/5\`)`
                        },
                        {
                            type: 10,
                            content: `> **Yorum:**\n\`\`\`${comment}\`\`\``
                        }
                    ]
                }
            ];

            logChannel.send({ components: logV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
        }
    }
}

module.exports = RatingManager;
