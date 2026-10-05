const { MessageFlags, parseEmoji, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const StaffRating = require("../../Core/Database/StaffRating");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class StaffRatingService {
    static async execute(context, targetMember) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const guildID = context.guild.id;
        const member = targetMember || (isInteraction ? context.member : context.member);

        const allReviews = await StaffRating.find({ guildID, staffID: member.id }).sort({ date: -1 });

        if (allReviews.length === 0) {
            const emptyObj = { content: `${member} kullanıcısı için henüz bir değerlendirme yapılmamış.` };
            if (isInteraction) return context.reply(emptyObj);
            return context.reply(emptyObj);
        }

        const pageSize = 10;
        let currentPage = 0;
        const totalPages = Math.ceil(allReviews.length / pageSize);

        const getLayout = (page) => {
            const start = page * pageSize;
            const end = start + pageSize;
            const currentReviews = allReviews.slice(start, end);

            const panel = new V2PanelBuilder()
                .addAccessory(member.user.displayAvatarURL({ dynamic: true }), `# 🌸 Yetkili Değerlendirmeleri\n> ${member} kullanıcısının değerlendirmeleri listeleniyor.`)
                .addDivider();

            currentReviews.forEach((review, index) => {
                const globalIndex = start + index + 1;
                const stars = (ConfigManager.get("Emojis.toji_star") || "✨").repeat(review.rating || 0);
                const dateStr = `<t:${Math.floor(review.date.getTime() / 1000)}:R>`;

                panel.addText(`### ${globalIndex}. Değerlendirme\n> **Puan:** ${stars} (${review.rating}/5)\n> **İşlem:** \`${review.actionType}\`\n> **Zaman:** ${dateStr}`);

                if (review.comment) {
                    panel.addText(`\`\`\`${review.comment}\`\`\``);
                }

                if (index < currentReviews.length - 1) {
                    panel.addDivider(1);
                }
            });

            panel.addDivider()
                 .addText(`> Toplam **${allReviews.length}** değerlendirme arasından **${start + 1}-${Math.min(end, allReviews.length)}** arası gösteriliyor.\n> Sayfa: \` ${page + 1} / ${totalPages} \``);

            return panel;
        };

        const getButtons = (page) => {
            if (totalPages <= 1) return null;
            
            const prevEmojiRaw = ConfigManager.get("Emojis.toji_leftarrow") || "⬅️";
            const nextEmojiRaw = ConfigManager.get("Emojis.toji_rightarrow") || "➡️";
            
            const prevEmojiObj = prevEmojiRaw.startsWith("<") ? parseEmoji(prevEmojiRaw) : { name: prevEmojiRaw };
            const nextEmojiObj = nextEmojiRaw.startsWith("<") ? parseEmoji(nextEmojiRaw) : { name: nextEmojiRaw };

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("prev_page")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(prevEmojiObj)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("next_page")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(nextEmojiObj)
                    .setDisabled(page >= totalPages - 1)
            );
        };

        const generateMessageOptions = (page) => {
            const panel = getLayout(page);
            const row = getButtons(page);
            
            if (row) {
                panel.addActionRow(row);
            }
            
            return {
                flags: [MessageFlags.IsComponentsV2],
                components: panel.toJSON()
            };
        };

        const replyPayload = generateMessageOptions(currentPage);
        let msg;

        if (isInteraction) {
            replyPayload.fetchReply = true;
            msg = await context.reply(replyPayload);
        } else {
            msg = await context.reply(replyPayload);
        }

        if (totalPages <= 1) return;

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 60000
        });

        collector.on("collect", async (interaction) => {
            if (interaction.customId === "prev_page") currentPage--;
            else if (interaction.customId === "next_page") currentPage++;

            await interaction.update(generateMessageOptions(currentPage));
        });

        collector.on("end", () => {
            const opts = generateMessageOptions(currentPage);
            // Sadece ActionRow olmayan V2Panel komponentlerini tut
            opts.components = opts.components.filter(c => c.type !== 1);
            if (msg.editable) msg.edit({ components: opts.components }).catch(() => { });
        });
    }
}

module.exports = StaffRatingService;
