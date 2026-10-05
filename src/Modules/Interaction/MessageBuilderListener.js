const {
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder
} = require('discord.js');
const MessageBuilderCache = require("../../Core/Handlers/MessageBuilderCache");
const Settings = require("../../../Settings.json");

module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("mb_")) return;

    if (!interaction.member.permissions.has("Administrator")) {
        if (interaction.isRepliable()) return interaction.reply({ content: "Bu menüyü kullanma yetkiniz yok.", ephemeral: true });
        return;
    }

    const draft = MessageBuilderCache.getDraft(interaction.user.id);

    // Sadece ana paneldeki genel butonları korumamız yeterli.
    // Diğerleri (Select menüler vb.) ephemeral olduğu için zaten Discord tarafından başkasına kapalıdır.
    const dashboardButtons = [
        "mb_add_component", "mb_container_color", "mb_edit_component", 
        "mb_delete_component", "mb_move_up", "mb_move_down", "mb_clear", "mb_send", "mb_code_export"
    ];

    if (dashboardButtons.includes(interaction.customId)) {
        if (interaction.message && interaction.message.id) {
            if (draft.dashboardId && draft.dashboardId !== interaction.message.id) {
                if (interaction.isRepliable()) return interaction.reply({ content: "Bu menü size ait değil veya süresi dolmuş. Lütfen kendi panelinizi kullanın.", ephemeral: true });
                return;
            }
        }
    }
    if (!draft.previewId && !["mb_select_channel"].includes(interaction.customId)) {
        if (interaction.isRepliable()) return interaction.reply({ content: "⏰ Oluşturucu süresi dolmuş. `/mesaj-oluştur` ile yeniden başlat.", ephemeral: true });
        return;
    }

    // ══════════════════════════════════════
    //  BİLEŞEN EKLE → Tür Seçim Menüsü
    // ══════════════════════════════════════
    if (interaction.customId === "mb_add_component" && interaction.isButton()) {
        const select = new StringSelectMenuBuilder()
            .setCustomId("mb_select_type")
            .setPlaceholder("Eklenecek bileşen türünü seç...")
            .addOptions([
                { label: "📝 Metin (Text Display)", value: "text_display", description: "Markdown destekli metin bloğu" },
                { label: "📋 Bölüm (Section + Aksesuar)", value: "section", description: "Metin + Thumbnail veya Buton aksesuar" },
                { label: "➖ Ayırıcı (Separator)", value: "separator", description: "Çizgi veya boşluk" },
                { label: "🖼️ Medya Galerisi", value: "media_gallery", description: "1-10 arası görsel galerisi" },
                { label: "📎 Dosya (File)", value: "file", description: "Dosya bileşeni (attachment URL)" },
                { label: "🔳 Buton Satırı (Action Row)", value: "action_row", description: "Link veya interaktif butonlar" }
            ]);
        return interaction.reply({ content: "Eklemek istediğin bileşen türünü seç:", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
    }

    // ══════════════════════════════════════
    //  BİLEŞEN TÜRÜ SEÇİLDİ → Modal Aç
    // ══════════════════════════════════════
    if (interaction.customId === "mb_select_type" && interaction.isStringSelectMenu()) {
        const type = interaction.values[0];

        if (type === "text_display") {
            return interaction.showModal(buildModal("mb_modal_text", "Metin Ekle (Text Display)", [
                { id: "td_content", label: "Metin (Markdown destekli)", style: "paragraph", required: true, placeholder: "## Başlık\\nBuraya metin yaz..." }
            ]));
        }

        if (type === "section") {
            return interaction.showModal(buildModal("mb_modal_section", "Bölüm Ekle (Section)", [
                { id: "sec_text", label: "Bölüm Metni (Markdown)", style: "paragraph", required: true },
                { id: "sec_text2", label: "2. Metin (isteğe bağlı)", style: "short", required: false, placeholder: "Bölümde 2. satır metni" },
                { id: "sec_acc_type", label: "Aksesuar (thumbnail / button)", style: "short", required: true, value: "thumbnail" },
                { id: "sec_acc_value", label: "Resim URL / Buton Yazısı", style: "short", required: true, placeholder: "https://... veya Buton etiketi" },
                { id: "sec_acc_extra", label: "Buton URL / Custom ID (isteğe bağlı)", style: "short", required: false, placeholder: "https://... veya özel ID" }
            ]));
        }

        if (type === "separator") {
            return interaction.showModal(buildModal("mb_modal_separator", "Ayırıcı Ekle (Separator)", [
                { id: "sep_divider", label: "Çizgi gösterilsin mi? (evet / hayır)", style: "short", required: true, value: "evet" },
                { id: "sep_spacing", label: "Boşluk (kucuk / buyuk)", style: "short", required: true, value: "kucuk" }
            ]));
        }

        if (type === "media_gallery") {
            return interaction.showModal(buildModal("mb_modal_media", "Medya Galerisi Ekle", [
                { id: "mg_urls", label: "Görsel URL'leri (her satıra bir tane)", style: "paragraph", required: true, placeholder: "https://example.com/img1.png\\nhttps://example.com/img2.png" },
                { id: "mg_descs", label: "Açıklamalar (isteğe bağlı, satır satır)", style: "paragraph", required: false }
            ]));
        }

        if (type === "file") {
            return interaction.showModal(buildModal("mb_modal_file", "Dosya Ekle (File)", [
                { id: "f_url", label: "Dosya URL'si (attachment:// veya https://)", style: "short", required: true, placeholder: "https://example.com/file.pdf" },
                { id: "f_spoiler", label: "Spoiler mi? (evet / hayır)", style: "short", required: false, value: "hayır" }
            ]));
        }

        if (type === "action_row") {
            return interaction.showModal(buildModal("mb_modal_actionrow", "Buton Ekle (Action Row)", [
                { id: "ar_label", label: "Buton Yazısı", style: "short", required: true },
                { id: "ar_url", label: "Buton URL veya Custom ID", style: "short", required: false, placeholder: "https://... veya özel ID" },
                { id: "ar_style", label: "Stil (1:Mavi 2:Gri 3:Yeşil 4:Kırmızı 5:Link)", style: "short", required: true, value: "2" },
                { id: "ar_emoji", label: "Emoji (isteğe bağlı)", style: "short", required: false }
            ]));
        }

        return interaction.reply({ content: "Bilinmeyen bileşen türü.", ephemeral: true });
    }

    // ══════════════════════════════════════
    //  CONTAINER RENGİ
    // ══════════════════════════════════════
    if (interaction.customId === "mb_container_color" && interaction.isButton()) {
        const colorHex = draft.containerColor !== null ? `#${draft.containerColor.toString(16).padStart(6, '0')}` : "";
        return interaction.showModal(buildModal("mb_modal_color", "Container Accent Rengi", [
            { id: "color_hex", label: "HEX Renk (boş = renk yok)", style: "short", required: false, value: colorHex, placeholder: "#5865F2" }
        ]));
    }

    // ══════════════════════════════════════
    //  CONTAINER SPOILER TOGGLE
    // ══════════════════════════════════════
    if (interaction.customId === "mb_container_spoiler" && interaction.isButton()) {
        draft.containerSpoiler = !draft.containerSpoiler;
        await updatePreview(interaction);
        await updateDashboard(interaction);
        return interaction.reply({ content: `🔒 Container spoiler: **${draft.containerSpoiler ? "Açık" : "Kapalı"}**`, ephemeral: true });
    }

    // ══════════════════════════════════════
    //  DÜZENLE → Bileşen Seç
    // ══════════════════════════════════════
    if (interaction.customId === "mb_edit_component" && interaction.isButton()) {
        if (draft.components.length === 0) return interaction.reply({ content: "Düzenlenecek bileşen yok.", ephemeral: true });
        return interaction.reply({ content: "Düzenlenecek bileşeni seç:", components: [buildComponentSelect("mb_select_edit", draft)], ephemeral: true });
    }

    if (interaction.customId === "mb_select_edit" && interaction.isStringSelectMenu()) {
        const idx = parseInt(interaction.values[0]);
        const comp = draft.components[idx];
        if (!comp) return interaction.reply({ content: "Bileşen bulunamadı.", ephemeral: true });
        draft.editIndex = idx;

        if (comp.type === 10) {
            return interaction.showModal(buildModal("mb_modal_edit_text", `Metin Düzenle (#${idx + 1})`, [
                { id: "td_content", label: "Metin", style: "paragraph", required: true, value: comp.content || "" }
            ]));
        }
        if (comp.type === 9) {
            const texts = (comp.components || []).filter(x => x.type === 10);
            const accType = comp.accessory?.type === 11 ? "thumbnail" : comp.accessory?.type === 2 ? "button" : "thumbnail";
            const accVal = comp.accessory?.type === 11 ? (comp.accessory?.media?.url || "") : (comp.accessory?.label || "");
            const accExtra = comp.accessory?.type === 2 ? (comp.accessory?.url || "") : "";

            return interaction.showModal(buildModal("mb_modal_edit_section", `Bölüm Düzenle (#${idx + 1})`, [
                { id: "sec_text", label: "Bölüm Metni", style: "paragraph", required: true, value: texts[0]?.content || "" },
                { id: "sec_text2", label: "2. Metin (isteğe bağlı)", style: "short", required: false, value: texts[1]?.content || "" },
                { id: "sec_acc_type", label: "Aksesuar (thumbnail / button)", style: "short", required: true, value: accType },
                { id: "sec_acc_value", label: "Resim URL / Buton Yazısı", style: "short", required: true, value: accVal },
                { id: "sec_acc_extra", label: "Buton URL / Custom ID", style: "short", required: false, value: accExtra }
            ]));
        }
        if (comp.type === 14) {
            return interaction.showModal(buildModal("mb_modal_edit_separator", `Ayırıcı Düzenle (#${idx + 1})`, [
                { id: "sep_divider", label: "Çizgi (evet / hayır)", style: "short", required: true, value: comp.divider ? "evet" : "hayır" },
                { id: "sep_spacing", label: "Boşluk (kucuk / buyuk)", style: "short", required: true, value: comp.spacing === 2 ? "buyuk" : "kucuk" }
            ]));
        }
        if (comp.type === 12) {
            const urls = (comp.items || []).map(i => i.media?.url || "").join("\n");
            const descs = (comp.items || []).map(i => i.description || "").join("\n");
            return interaction.showModal(buildModal("mb_modal_edit_media", `Galeri Düzenle (#${idx + 1})`, [
                { id: "mg_urls", label: "Görsel URL'leri", style: "paragraph", required: true, value: urls },
                { id: "mg_descs", label: "Açıklamalar", style: "paragraph", required: false, value: descs }
            ]));
        }
        if (comp.type === 13) {
            return interaction.showModal(buildModal("mb_modal_edit_file", `Dosya Düzenle (#${idx + 1})`, [
                { id: "f_url", label: "Dosya URL'si", style: "short", required: true, value: comp.file?.url || "" },
                { id: "f_spoiler", label: "Spoiler (evet / hayır)", style: "short", required: false, value: comp.spoiler ? "evet" : "hayır" }
            ]));
        }
        return interaction.reply({ content: "Bu bileşen türü düzenlenemez. Silip yeniden ekle.", ephemeral: true });
    }

    // ══════════════════════════════════════
    //  SİL
    // ══════════════════════════════════════
    if (interaction.customId === "mb_delete_component" && interaction.isButton()) {
        if (draft.components.length === 0) return interaction.reply({ content: "Silinecek bileşen yok.", ephemeral: true });
        return interaction.reply({ content: "Silinecek bileşeni seç:", components: [buildComponentSelect("mb_select_delete", draft)], ephemeral: true });
    }

    if (interaction.customId === "mb_select_delete" && interaction.isStringSelectMenu()) {
        const idx = parseInt(interaction.values[0]);
        MessageBuilderCache.removeComponent(interaction.user.id, idx);
        await updatePreview(interaction);
        await updateDashboard(interaction);
        return interaction.reply({ content: `🗑️ Bileşen #${idx + 1} silindi.`, ephemeral: true });
    }

    // ══════════════════════════════════════
    //  YUKARI / AŞAĞI TAŞI
    // ══════════════════════════════════════
    if ((interaction.customId === "mb_move_up" || interaction.customId === "mb_move_down") && interaction.isButton()) {
        if (draft.components.length < 2) return interaction.reply({ content: "Taşınacak yeterli bileşen yok.", ephemeral: true });
        const dir = interaction.customId === "mb_move_up" ? "up" : "down";
        return interaction.reply({ content: `${dir === "up" ? "⬆️" : "⬇️"} Taşınacak bileşeni seç:`, components: [buildComponentSelect(`mb_select_move_${dir}`, draft)], ephemeral: true });
    }

    if (interaction.customId.startsWith("mb_select_move_") && interaction.isStringSelectMenu()) {
        const dir = interaction.customId.includes("_up") ? "up" : "down";
        const idx = parseInt(interaction.values[0]);
        MessageBuilderCache.moveComponent(interaction.user.id, idx, dir);
        await updatePreview(interaction);
        await updateDashboard(interaction);
        return interaction.reply({ content: `Bileşen #${idx + 1} ${dir === "up" ? "yukarı" : "aşağı"} taşındı.`, ephemeral: true });
    }

    // ══════════════════════════════════════
    //  SIFIRLA
    // ══════════════════════════════════════
    if (interaction.customId === "mb_clear" && interaction.isButton()) {
        const { previewId, dashboardId, channelId, editMode, editMessageId, editMessageChannelId } = draft;
        MessageBuilderCache.clearDraft(interaction.user.id);
        MessageBuilderCache.updateDraft(interaction.user.id, { previewId, dashboardId, channelId, editMode, editMessageId, editMessageChannelId });
        await updatePreview(interaction);
        await updateDashboard(interaction);
        return interaction.reply({ content: "❌ Taslak sıfırlandı.", ephemeral: true });
    }

    // ══════════════════════════════════════
    //  KODU AL (EXPORT RAW V2 CODE)
    // ══════════════════════════════════════
    if (interaction.customId === "mb_code_export" && interaction.isButton()) {
        const payload = MessageBuilderCache.buildPayload(interaction.user.id);
        if (!payload) return interaction.reply({ content: "Mesaj boş, dışa aktarılacak kod yok!", ephemeral: true });

        const draft = MessageBuilderCache.getDraft(interaction.user.id);
        let code = `const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");\n`;
        code += `const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder"); // Yolu kendi dosyanıza göre güncelleyin\n\n`;
        code += `const panel = new V2PanelBuilder();\n`;

        if (draft.containerColor !== null) {
            code += `panel.setAccentColor(${draft.containerColor});\n`;
        }

        for (const comp of draft.components) {
            if (comp.type === 10) {
                code += `panel.addText(\`${comp.content.replace(/`/g, "\\`")}\`);\n`;
            } else if (comp.type === 14) {
                code += `panel.addDivider(${comp.spacing || 1});\n`;
            } else if (comp.type === 9) {
                const texts = (comp.components || []).filter(c => c.type === 10).map(c => c.content);
                const firstText = texts.length > 0 ? texts[0] : "";
                if (comp.accessory && comp.accessory.type === 11) {
                    const url = comp.accessory.media?.url || "";
                    code += `panel.addAccessory("${url}", \`${firstText.replace(/`/g, "\\`")}\`);\n`;
                } else {
                    code += `// [Uyarı] addAccessory sadece Thumbnail destekler. Raw format eklendi:\n`;
                    code += `panel.data.components.push(${JSON.stringify(comp)});\n`;
                }
            } else if (comp.type === 1) {
                code += `const row = new ActionRowBuilder().addComponents(\n`;
                const btns = [];
                for (const b of (comp.components || [])) {
                    if (b.type === 2) {
                        let btnCode = `    new ButtonBuilder()`;
                        if (b.label) btnCode += `.setLabel("${b.label}")`;
                        if (b.style) btnCode += `.setStyle(${b.style})`;
                        if (b.custom_id) btnCode += `.setCustomId("${b.custom_id}")`;
                        if (b.url) btnCode += `.setURL("${b.url}")`;
                        if (b.emoji && b.emoji.name) btnCode += `.setEmoji("${b.emoji.name}")`;
                        btns.push(btnCode);
                    }
                }
                code += btns.join(",\n") + `\n);\n`;
                code += `panel.addActionRow(row);\n`;
            } else if (comp.type === 12) {
                const itemsStr = (comp.items || []).map(i => {
                    const u = i.media?.url || i.url || "";
                    let out = `{ url: "${u}"`;
                    if (i.description) out += `, description: \`${i.description.replace(/`/g, "\\`")}\``;
                    if (i.spoiler) out += `, spoiler: true`;
                    out += ` }`;
                    return out;
                }).join(", ");
                code += `panel.addMediaGallery([${itemsStr}]);\n`;
            } else if (comp.type === 13) {
                const u = comp.file?.url || comp.url || "";
                const spoiler = comp.spoiler ? "true" : "false";
                code += `panel.addFile("${u}", ${spoiler});\n`;
            } else {
                code += `// [Uyarı] Özel bileşen V2PanelBuilder metodu bulunamadı, raw olarak ekleniyor:\n`;
                code += `panel.data.components.push(${JSON.stringify(comp)});\n`;
            }
        }

        code += `\n// Gönderme Kodu:\n`;
        code += `// await interaction.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() });\n`;

        if (code.length > 1900) {
            const buffer = Buffer.from(code, "utf-8");
            return interaction.reply({ 
                content: "V2 Panel kodu çok uzun olduğu için dosya olarak eklendi.", 
                files: [{ name: "v2_panel_code.js", attachment: buffer }],
                ephemeral: true 
            });
        }

        return interaction.reply({
            content: `**V2 Panel Builder JavaScript Kodu:**\n\`\`\`javascript\n${code}\n\`\`\``,
            ephemeral: true
        });
    }

    // ══════════════════════════════════════
    //  GÖNDER / GÜNCELLE
    // ══════════════════════════════════════
    if (interaction.customId === "mb_send" && interaction.isButton()) {
        if (draft.components.length === 0) return interaction.reply({ content: "Mesaj boş!", ephemeral: true });

        // Edit modu → direkt güncelle
        if (draft.editMode && draft.editMessageId) {
            const payload = MessageBuilderCache.buildPayload(interaction.user.id);
            if (!payload) return interaction.reply({ content: "Mesaj boş!", ephemeral: true });

            try {
                const ch = interaction.guild.channels.cache.get(draft.editMessageChannelId);
                if (!ch) return interaction.reply({ content: "Orijinal mesajın kanalı bulunamadı!", ephemeral: true });
                const msg = await ch.messages.fetch(draft.editMessageId);
                await msg.edit({ content: null, ...payload });

                // Temizle
                await cleanupBuilder(interaction);
                MessageBuilderCache.clearDraft(interaction.user.id);
                return interaction.reply({ content: `✅ Mesaj başarıyla güncellendi! (${ch})`, ephemeral: true });
            } catch (err) {
                console.error("[MessageBuilder] Edit error:", err);
                return interaction.reply({ content: `❌ Güncelleme hatası:\n\`\`\`${err.message}\`\`\``, ephemeral: true });
            }
        }

        // Yeni mesaj → kanal seç
        const select = new ChannelSelectMenuBuilder()
            .setCustomId("mb_select_channel")
            .setPlaceholder("Kanalı seç...")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
        return interaction.reply({ content: "Mesajın gönderileceği kanalı seç:", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
    }

    // ══════════════════════════════════════
    //  KANAL SEÇİLDİ → GÖNDER
    // ══════════════════════════════════════
    if (interaction.customId === "mb_select_channel" && interaction.isChannelSelectMenu()) {
        const channelId = interaction.values[0];
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) return interaction.reply({ content: "Kanal bulunamadı.", ephemeral: true });

        const payload = MessageBuilderCache.buildPayload(interaction.user.id);
        if (!payload) return interaction.reply({ content: "Mesaj boş!", ephemeral: true });

        try {
            await channel.send(payload);
            await cleanupBuilder(interaction);
            MessageBuilderCache.clearDraft(interaction.user.id);
            return interaction.reply({ content: `✅ Mesaj başarıyla ${channel} kanalına gönderildi!`, ephemeral: true });
        } catch (err) {
            console.error("[MessageBuilder] Send error:", err);
            return interaction.reply({ content: `❌ Gönderim hatası:\n\`\`\`${err.message}\`\`\``, ephemeral: true });
        }
    }

    // ══════════════════════════════════════
    //  MODAL SUBMIT'LER
    // ══════════════════════════════════════
    if (interaction.isModalSubmit()) {
        const cid = interaction.customId;

        // Text Display
        if (cid === "mb_modal_text") {
            const content = interaction.fields.getTextInputValue("td_content");
            MessageBuilderCache.addComponent(interaction.user.id, { type: 10, content });
            await refreshAll(interaction);
            return interaction.reply({ content: "📝 Metin eklendi!", ephemeral: true });
        }
        if (cid === "mb_modal_edit_text") {
            const content = interaction.fields.getTextInputValue("td_content");
            if (draft.editIndex !== null && draft.components[draft.editIndex]) draft.components[draft.editIndex].content = content;
            await refreshAll(interaction);
            return interaction.reply({ content: "📝 Metin güncellendi!", ephemeral: true });
        }

        // Section
        if (cid === "mb_modal_section" || cid === "mb_modal_edit_section") {
            const isEdit = cid.includes("edit");
            const section = buildSectionFromModal(interaction);
            if (isEdit && draft.editIndex !== null) {
                draft.components[draft.editIndex] = section;
            } else {
                MessageBuilderCache.addComponent(interaction.user.id, section);
            }
            await refreshAll(interaction);
            return interaction.reply({ content: isEdit ? "📋 Bölüm güncellendi!" : "📋 Bölüm eklendi!", ephemeral: true });
        }

        // Separator
        if (cid === "mb_modal_separator" || cid === "mb_modal_edit_separator") {
            const isEdit = cid.includes("edit");
            const separator = buildSeparatorFromModal(interaction);
            if (isEdit && draft.editIndex !== null) {
                draft.components[draft.editIndex] = separator;
            } else {
                MessageBuilderCache.addComponent(interaction.user.id, separator);
            }
            await refreshAll(interaction);
            return interaction.reply({ content: isEdit ? "➖ Ayırıcı güncellendi!" : "➖ Ayırıcı eklendi!", ephemeral: true });
        }

        // Media Gallery
        if (cid === "mb_modal_media" || cid === "mb_modal_edit_media") {
            const isEdit = cid.includes("edit");
            const gallery = buildMediaGalleryFromModal(interaction);
            if (isEdit && draft.editIndex !== null) {
                draft.components[draft.editIndex] = gallery;
            } else {
                MessageBuilderCache.addComponent(interaction.user.id, gallery);
            }
            await refreshAll(interaction);
            return interaction.reply({ content: isEdit ? "🖼️ Galeri güncellendi!" : `🖼️ Galeri eklendi! (${gallery.items.length} görsel)`, ephemeral: true });
        }

        // File
        if (cid === "mb_modal_file" || cid === "mb_modal_edit_file") {
            const isEdit = cid.includes("edit");
            const url = interaction.fields.getTextInputValue("f_url").trim();
            const spoilerVal = (interaction.fields.getTextInputValue("f_spoiler") || "").toLowerCase().trim();
            const file = { type: 13, file: { url } };
            if (spoilerVal === "evet" || spoilerVal === "yes" || spoilerVal === "true") file.spoiler = true;

            if (isEdit && draft.editIndex !== null) {
                draft.components[draft.editIndex] = file;
            } else {
                MessageBuilderCache.addComponent(interaction.user.id, file);
            }
            await refreshAll(interaction);
            return interaction.reply({ content: isEdit ? "📎 Dosya güncellendi!" : "📎 Dosya eklendi!", ephemeral: true });
        }

        // Action Row / Button
        if (cid === "mb_modal_actionrow") {
            const label = interaction.fields.getTextInputValue("ar_label");
            const url = interaction.fields.getTextInputValue("ar_url") || "";
            const styleInput = interaction.fields.getTextInputValue("ar_style");
            const emoji = interaction.fields.getTextInputValue("ar_emoji") || "";

            const style = parseInt(styleInput) || 2;
            const btn = { type: 2, label, style };
            if (style === 5 && url.startsWith("http")) {
                btn.url = url;
            } else {
                btn.custom_id = url || `mb_ubtn_${Date.now()}`;
            }
            if (emoji) btn.emoji = { name: emoji };

            // Son action row'a ekle (max 5 buton)
            const last = draft.components[draft.components.length - 1];
            if (last && last.type === 1 && (last.components || []).length < 5) {
                last.components.push(btn);
            } else {
                MessageBuilderCache.addComponent(interaction.user.id, { type: 1, components: [btn] });
            }
            await refreshAll(interaction);
            return interaction.reply({ content: "🔳 Buton eklendi!", ephemeral: true });
        }

        // Container Color
        if (cid === "mb_modal_color") {
            const hex = interaction.fields.getTextInputValue("color_hex").trim();
            if (!hex) {
                draft.containerColor = null;
            } else {
                const cleaned = hex.replace("#", "");
                const parsed = parseInt(cleaned, 16);
                if (!isNaN(parsed)) draft.containerColor = parsed;
            }
            await refreshAll(interaction);
            return interaction.reply({ content: `🎨 Renk: ${hex ? `\`${hex}\`` : "kaldırıldı"}.`, ephemeral: true });
        }
    }
};

// ══════════════════════════════════════
//  BUILDER HELPERS
// ══════════════════════════════════════

function buildSectionFromModal(interaction) {
    const text1 = interaction.fields.getTextInputValue("sec_text");
    const text2 = interaction.fields.getTextInputValue("sec_text2") || "";
    const accType = interaction.fields.getTextInputValue("sec_acc_type").toLowerCase().trim();
    const accVal = interaction.fields.getTextInputValue("sec_acc_value");
    const accExtra = interaction.fields.getTextInputValue("sec_acc_extra") || "";

    const textComponents = [{ type: 10, content: text1 }];
    if (text2) textComponents.push({ type: 10, content: text2 });

    const section = { type: 9, components: textComponents };

    if (accType === "button" || accType === "buton") {
        if (accExtra && accExtra.startsWith("http")) {
            section.accessory = { type: 2, style: 5, label: accVal, url: accExtra };
        } else {
            section.accessory = { type: 2, style: 2, label: accVal, custom_id: accExtra || `mb_ubtn_${Date.now()}` };
        }
    } else {
        section.accessory = { type: 11, media: { url: accVal || "https://dummyimage.com/100x100/2f3136/2f3136.png" } };
    }

    return section;
}

function buildSeparatorFromModal(interaction) {
    const dividerInput = interaction.fields.getTextInputValue("sep_divider").toLowerCase().trim();
    const spacingInput = interaction.fields.getTextInputValue("sep_spacing").toLowerCase().trim();
    return {
        type: 14,
        divider: ["evet", "yes", "true", "1"].includes(dividerInput),
        spacing: ["buyuk", "büyük", "large", "2"].includes(spacingInput) ? 2 : 1
    };
}

function buildMediaGalleryFromModal(interaction) {
    const urls = interaction.fields.getTextInputValue("mg_urls").split("\n").map(u => u.trim()).filter(u => u);
    const descs = (interaction.fields.getTextInputValue("mg_descs") || "").split("\n").map(d => d.trim());
    const items = urls.map((url, i) => {
        const item = { media: { url } };
        if (descs[i]) item.description = descs[i];
        return item;
    });
    return { type: 12, items };
}

function buildModal(customId, title, fields) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    for (const f of fields) {
        const input = new TextInputBuilder()
            .setCustomId(f.id)
            .setLabel(f.label)
            .setStyle(f.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(f.required);
        if (f.value !== undefined) input.setValue(f.value);
        if (f.placeholder) input.setPlaceholder(f.placeholder);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
    }
    return modal;
}

function buildComponentSelect(customId, draft) {
    const options = draft.components.map((c, i) => {
        let label;
        switch (c.type) {
            case 10: label = `#${i+1} 📝 Metin: ${(c.content||"").substring(0,45)}`; break;
            case 9: label = `#${i+1} 📋 Bölüm`; break;
            case 14: label = `#${i+1} ➖ Ayırıcı`; break;
            case 12: label = `#${i+1} 🖼️ Galeri (${c.items?.length||0})`; break;
            case 13: label = `#${i+1} 📎 Dosya`; break;
            case 1: label = `#${i+1} 🔳 Butonlar (${c.components?.length||0})`; break;
            default: label = `#${i+1} ❓ Bilinmeyen`; break;
        }
        return { label: label.substring(0, 100), value: `${i}` };
    });
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder("Bileşen seç...").addOptions(options.slice(0, 25))
    );
}

// ══════════════════════════════════════
//  PREVIEW & DASHBOARD UPDATERS
// ══════════════════════════════════════

async function refreshAll(interaction) {
    await updatePreview(interaction);
    await updateDashboard(interaction);
}

async function updatePreview(interaction) {
    const draft = MessageBuilderCache.getDraft(interaction.user.id);
    const channel = interaction.guild.channels.cache.get(draft.channelId);
    if (!channel || !draft.previewId) return;

    try {
        const msg = await channel.messages.fetch(draft.previewId).catch(() => null);
        if (!msg) return;
        const payload = MessageBuilderCache.buildPayload(interaction.user.id);
        if (payload) {
            await msg.edit({ content: null, ...payload }).catch(e => console.error("[MB] Preview err:", e.message));
        } else {
            await msg.edit({ content: "*(Önizleme: Henüz bileşen eklenmedi)*", components: [] }).catch(() => {});
        }
    } catch (e) { console.error("[MB] Preview fetch err:", e); }
}

async function updateDashboard(interaction) {
    const draft = MessageBuilderCache.getDraft(interaction.user.id);
    const channel = interaction.guild.channels.cache.get(draft.channelId);
    if (!channel || !draft.dashboardId) return;

    try {
        const msg = await channel.messages.fetch(draft.dashboardId).catch(() => null);
        if (!msg) return;
        const { buildDashboard } = require("../../Commands/Slash/Developers/MesajOlustur");
        await msg.edit(buildDashboard(interaction.user.id, interaction.user)).catch(() => {});
    } catch (e) { console.error("[MB] Dashboard err:", e); }
}

async function cleanupBuilder(interaction) {
    const draft = MessageBuilderCache.getDraft(interaction.user.id);
    const channel = interaction.guild.channels.cache.get(draft.channelId);
    if (!channel) return;
    if (draft.previewId) await channel.messages.fetch(draft.previewId).then(m => m.delete()).catch(() => {});
    if (draft.dashboardId) await channel.messages.fetch(draft.dashboardId).then(m => m.delete()).catch(() => {});
}
