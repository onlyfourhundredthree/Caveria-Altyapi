const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const ScheduledMessage = require("../../Core/Database/ScheduledMessage");

module.exports = async (interaction) => {
    const cid = interaction.customId;
    if (!cid || !cid.startsWith("panel_automsg")) return;
    if (!interaction.guild) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    if (!isOwner) return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });

    const emojis = ConfigManager.get("Emojis") || {};

    const sendPanel = async (page = 0) => {
        const messages = await ScheduledMessage.find({ guildID: interaction.guild.id });
        const itemsPerPage = 5;
        const totalPages = Math.ceil(messages.length / itemsPerPage) || 1;
        const cp = Math.min(page, totalPages - 1);
        const start = cp * itemsPerPage;
        const paged = messages.slice(start, start + itemsPerPage);

        let msgStr = messages.length > 0
            ? paged.map((m, i) => {
                const typeInfo = m.isRepeating ? `🔄 Her ${m.intervalHours} Saatte (${m.sentCount}/${m.maxRepetitions || "∞"})` : "⏰ Günlük";
                return `**${start + i + 1}.** <#${m.channelID}> | \`${String(m.hour).padStart(2, "0")}:${String(m.minute).padStart(2, "0")}\` | ${m.active ? "🟢" : "🔴"}\n> ${typeInfo}\n> ${m.message.length > 50 ? m.message.slice(0, 47) + "..." : m.message}`;
            }).join("\n\n")
            : "Henüz planlanmış bir mesaj bulunmuyor.";

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## 📢 Otomatik Mesajlar\n> **Sayfa ${cp + 1}/${totalPages}** — Toplam ${messages.length} mesaj` },
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
                            { type: 2, custom_id: "panel_automsg_prev", label: "◀", style: 2, disabled: cp === 0 },
                            { type: 2, custom_id: "panel_automsg_next", label: "▶", style: 2, disabled: cp + 1 === totalPages },
                            { type: 2, custom_id: "panel_automsg_clear_confirm", label: "Tümünü Sil", style: 4, disabled: messages.length === 0 },
                            { type: 2, custom_id: "panel_automsg_refresh", label: "Yenile", style: 2 }
                        ]
                    }
                ]
            }]
        };
    };

    try {
        if (cid === "panel_automsg_refresh") {
            await interaction.deferUpdate();
            return interaction.editReply(await sendPanel(0));
        }

        if (cid === "panel_automsg_add") {
            const modal = new ModalBuilder().setCustomId("panel_automsg_add_modal").setTitle("Yeni Otomatik Mesaj");
            const channelInput = new TextInputBuilder().setCustomId("channel").setLabel("Kanal ID").setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("1466881546337255447");
            const timeInput = new TextInputBuilder().setCustomId("time").setLabel("Saat (SS:DD)").setStyle(TextInputStyle.Short).setRequired(true).setValue("12:00").setMaxLength(5);
            const msgInput = new TextInputBuilder().setCustomId("message").setLabel("Mesaj İçeriği").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1800);
            const intervalInput = new TextInputBuilder().setCustomId("interval").setLabel("Tekrar aralığı (saat, 0=günlük)").setStyle(TextInputStyle.Short).setRequired(false).setValue("0");
            const maxRepInput = new TextInputBuilder().setCustomId("max_rep").setLabel("Tekrar Sayısı (0=Sınırsız)").setStyle(TextInputStyle.Short).setRequired(false).setValue("0");

            modal.addComponents(
                new ActionRowBuilder().addComponents(channelInput),
                new ActionRowBuilder().addComponents(timeInput),
                new ActionRowBuilder().addComponents(msgInput),
                new ActionRowBuilder().addComponents(intervalInput),
                new ActionRowBuilder().addComponents(maxRepInput)
            );
            return interaction.showModal(modal);
        }

        if (cid === "panel_automsg_add_modal") {
            const channelId = interaction.fields.getTextInputValue("channel").trim();
            const timeStr = interaction.fields.getTextInputValue("time").trim();
            const [hourStr, minuteStr] = timeStr.includes(":") ? timeStr.split(":") : [timeStr.slice(0,2), timeStr.slice(-2)];
            const hour = parseInt(hourStr);
            const minute = parseInt(minuteStr);
            const message = interaction.fields.getTextInputValue("message").trim();
            const interval = parseInt(interaction.fields.getTextInputValue("interval") || "0");
            const maxRep = parseInt(interaction.fields.getTextInputValue("max_rep") || "0");

            if (isNaN(hour) || hour < 0 || hour > 23) return interaction.reply({ content: "Geçersiz saat.", flags: [MessageFlags.Ephemeral] });
            if (isNaN(minute) || minute < 0 || minute > 59) return interaction.reply({ content: "Geçersiz dakika.", flags: [MessageFlags.Ephemeral] });
            if (isNaN(maxRep) || maxRep < 0) return interaction.reply({ content: "Geçersiz tekrar sayısı.", flags: [MessageFlags.Ephemeral] });

            await ScheduledMessage.create({
                guildID: interaction.guild.id,
                channelID: channelId,
                hour, minute,
                message,
                isRepeating: interval > 0,
                intervalHours: interval || 0,
                maxRepetitions: maxRep || 0,
                active: true
            });

            return interaction.reply({ content: "✅ Mesaj eklendi.", flags: [MessageFlags.Ephemeral] });
        }

        if (cid === "panel_automsg_edit_list" || cid === "panel_automsg_remove_list" || cid === "panel_automsg_toggle_list") {
            const messages = await ScheduledMessage.find({ guildID: interaction.guild.id });
            if (messages.length === 0) return interaction.reply({ content: "Mesaj yok.", flags: [MessageFlags.Ephemeral] });

            const action = cid.includes("edit") ? "edit" : cid.includes("remove") ? "remove" : "toggle";
            const options = messages.map((m, i) => ({
                label: `<#${m.channelID}> ${String(m.hour).padStart(2, "0")}:${String(m.minute).padStart(2, "0")}`.slice(0, 100),
                value: `panel_automsg_${action}_${m._id}`,
                description: `${m.active ? "🟢" : "🔴"} ${m.message.slice(0, 50)}`
            })).slice(0, 25);

            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [{
                    type: 17,
                    components: [
                        { type: 10, content: action === "edit" ? "Düzenlemek için mesaj seç" : action === "remove" ? "Silmek için mesaj seç" : "Aktif/Pasif için mesaj seç" },
                        { type: 1, components: [{ type: 3, custom_id: `panel_automsg_${action}_select`, placeholder: "Mesaj seçin", options }] }
                    ]
                }]
            });
        }

        if (cid.startsWith("panel_automsg_edit_select")) {
            const msgId = interaction.values[0].replace("panel_automsg_edit_", "");
            const modal = new ModalBuilder().setCustomId(`panel_automsg_edit_modal_${msgId}`).setTitle("Mesajı Düzenle");
            const msgInput = new TextInputBuilder().setCustomId("message").setLabel("Yeni mesaj içeriği").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1800);
            modal.addComponents(new ActionRowBuilder().addComponents(msgInput));
            return interaction.showModal(modal);
        }

        if (cid.startsWith("panel_automsg_edit_modal_")) {
            const msgId = cid.replace("panel_automsg_edit_modal_", "");
            const message = interaction.fields.getTextInputValue("message").trim();
            await ScheduledMessage.findByIdAndUpdate(msgId, { $set: { message } });
            return interaction.reply({ content: "✅ Düzenlendi.", flags: [MessageFlags.Ephemeral] });
        }

        if (cid.startsWith("panel_automsg_remove_select")) {
            const msgId = interaction.values[0].replace("panel_automsg_remove_", "");
            await ScheduledMessage.findByIdAndDelete(msgId);
            return interaction.reply({ content: "✅ Silindi.", flags: [MessageFlags.Ephemeral] });
        }

        if (cid.startsWith("panel_automsg_toggle_select")) {
            const msgId = interaction.values[0].replace("panel_automsg_toggle_", "");
            const msg = await ScheduledMessage.findById(msgId);
            if (msg) {
                msg.active = !msg.active;
                await msg.save();
            }
            return interaction.reply({ content: `✅ Durum değiştirildi.`, flags: [MessageFlags.Ephemeral] });
        }

        if (cid === "panel_automsg_prev" || cid === "panel_automsg_next") {
            const messages = await ScheduledMessage.find({ guildID: interaction.guild.id });
            const itemsPerPage = 5;
            const totalPages = Math.ceil(messages.length / itemsPerPage) || 1;
            let currentPage = 0;
            const content = interaction.message.components?.[0]?.components?.find(c => c.type === 10 && c.content?.includes("Sayfa"))?.content || "";
            const pageMatch = content.match(/Sayfa (\d+)\/(\d+)/);
            if (pageMatch) currentPage = parseInt(pageMatch[1]) - 1;

            let newPage = cid === "panel_automsg_prev" ? currentPage - 1 : currentPage + 1;
            newPage = Math.max(0, Math.min(newPage, totalPages - 1));

            await interaction.deferUpdate();
            return interaction.editReply(await sendPanel(newPage));
        }

        if (cid === "panel_automsg_clear_confirm") {
            await ScheduledMessage.deleteMany({ guildID: interaction.guild.id });
            return interaction.reply({ content: "✅ Tüm mesajlar silindi.", flags: [MessageFlags.Ephemeral] });
        }

    } catch (err) {
        console.error("[AutoMessage]", err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Bir hata oluştu.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }
};
