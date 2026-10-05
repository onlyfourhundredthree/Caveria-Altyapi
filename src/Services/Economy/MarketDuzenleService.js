const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Settings = require("../../../Settings.json");

class MarketDuzenleService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        
        const emojis = ConfigManager.get("Emojis") || {};

        if (!ConfigManager.isOwner(member)) {
            const errObj = { content: `${emojis.toji_iptal || ""} Bu komutu sadece bot sahipleri kullanabilir.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const generateMarketPanel = () => {
            const ecoConfig = ConfigManager.get("Economy") || {};
            const marketItems = ecoConfig.MarketItems || [];
            const currencyName = ecoConfig.CurrencyName || "Caveria Coin";

            const itemText = marketItems.length > 0
                ? marketItems.map((x, i) => {
                    const roleText = x.type === "role" && x.roleId ? `<@&${x.roleId}>` : "Rol";
                    const extra = x.type === "role" ? ` (${roleText} - ${x.durationDays > 0 ? x.durationDays + ' Gün' : 'Süresiz'})` : "";
                    return `> ${i + 1}. **${x.name}** - \`${x.price.toLocaleString("tr-TR")}\` ${currencyName} (ID: \`${x.id}\`)${extra}`;
                }).join("\n")
                : "> Market şu an boş.";

            const panel = new V2PanelBuilder()
                .addText(`## ${emojis.toji_sparkly || ""} Market Düzenleme Paneli\n-# Aşağıdaki menüden market ürünlerini ekleyebilir, silebilir veya düzenleyebilirsiniz.\n\n### Mevcut Ürünler\n${itemText}`)
                .addDivider(1)
                .addActionRow(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("market_add").setLabel("Ürün Ekle").setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId("market_add_role").setLabel("Rol Ekle").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("market_edit_panel").setLabel("Düzenle").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("market_remove_panel").setLabel("Ürün Sil").setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId("market_close").setLabel("Kapat").setStyle(ButtonStyle.Secondary)
                    )
                );

            return panel.toJSON();
        };

        const generateRemovePanel = () => {
            const ecoConfig = ConfigManager.get("Economy") || {};
            const marketItems = ecoConfig.MarketItems || [];

            if (marketItems.length === 0) return null;

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("market_do_remove")
                .setPlaceholder("Silinecek ürünü seçin...")
                .addOptions(marketItems.map(item => ({
                    label: item.name,
                    description: `ID: ${item.id} | Fiyat: ${item.price}${item.type === "role" ? ' | Tür: Rol' : ''}`,
                    value: item.id
                })));

            const panel = new V2PanelBuilder()
                .addText(`### Ürün Silme\n-# Lütfen silmek istediğiniz ürünü seçin.`)
                .addActionRow(new ActionRowBuilder().addComponents(selectMenu))
                .addActionRow(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("market_back").setLabel("Geri Dön").setStyle(ButtonStyle.Secondary)));

            return panel.toJSON();
        };

        const generateEditPanel = () => {
            const ecoConfig = ConfigManager.get("Economy") || {};
            const marketItems = ecoConfig.MarketItems || [];

            if (marketItems.length === 0) return null;

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("market_do_edit")
                .setPlaceholder("Düzenlenecek ürünü seçin...")
                .addOptions(marketItems.map(item => ({
                    label: item.name,
                    description: `ID: ${item.id} | Fiyat: ${item.price}${item.type === "role" ? ' | Tür: Rol' : ''}`,
                    value: item.id
                })));

            const panel = new V2PanelBuilder()
                .addText(`### Ürün Düzenleme\n-# Lütfen düzenlemek istediğiniz ürünü seçin.`)
                .addActionRow(new ActionRowBuilder().addComponents(selectMenu))
                .addActionRow(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("market_back").setLabel("Geri Dön").setStyle(ButtonStyle.Secondary)));

            return panel.toJSON();
        };

        const replyPayload = {
            components: generateMarketPanel(),
            flags: [MessageFlags.IsComponentsV2]
        };

        let msg;
        if (isInteraction) {
            replyPayload.fetchReply = true;
            msg = await context.reply(replyPayload);
        } else {
            msg = await context.reply(replyPayload);
        }

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 300000
        });

        collector.on("collect", async (i) => {
            if (i.customId === "market_close") {
                collector.stop();
                if (msg.deletable) await msg.delete().catch(() => {});
                if (isInteraction) await context.deleteReply().catch(() => {});
                return;
            }

            if (i.customId === "market_back") {
                return i.update({ components: generateMarketPanel(), flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "market_remove_panel") {
                const removePanel = generateRemovePanel();
                if (!removePanel) return i.reply({ content: "Silinecek ürün yok!", flags: [MessageFlags.Ephemeral] });
                return i.update({ components: removePanel, flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "market_edit_panel") {
                const editPanel = generateEditPanel();
                if (!editPanel) return i.reply({ content: "Düzenlenecek ürün yok!", flags: [MessageFlags.Ephemeral] });
                return i.update({ components: editPanel, flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "market_add") {
                const modal = new ModalBuilder().setCustomId('market_add_modal').setTitle('Yeni Ürün Ekle');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel("Ürün Adı").setPlaceholder("Örn: VIP Üyelik").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_price').setLabel("Fiyat").setPlaceholder("Örn: 5000").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_id').setLabel("ID (Benzersiz olmalı)").setPlaceholder("Örn: vip_1").setStyle(TextInputStyle.Short).setRequired(true))
                );
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ filter: (mi) => mi.customId === 'market_add_modal' && mi.user.id === author.id, time: 60000 }).catch(() => null);
                if (submitted) {
                    await submitted.deferReply({ flags: [64] }).catch(() => {});
                    const name = submitted.fields.getTextInputValue('item_name');
                    const price = parseInt(submitted.fields.getTextInputValue('item_price'));
                    const id = submitted.fields.getTextInputValue('item_id');

                    if (isNaN(price)) return submitted.editReply({ content: "Geçersiz fiyat! Lütfen sadece sayı girin." });

                    const ecoConfig = ConfigManager.get("Economy") || {};
                    const marketItems = ecoConfig.MarketItems || [];

                    if (marketItems.some(x => x.id === id)) return submitted.editReply({ content: "Bu ID zaten kullanımda! Lütfen benzersiz bir ID girin." });

                    marketItems.push({ name, price, id, type: "normal" });
                    ecoConfig.MarketItems = marketItems;
                    await ConfigManager.set("Economy", ecoConfig, author.tag);

                    await submitted.editReply({ content: `> **${name}** ürünü başarıyla eklendi!` });
                    if (msg.editable) await msg.edit({ components: generateMarketPanel(), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                }
            }

            if (i.customId === "market_add_role") {
                const modal = new ModalBuilder().setCustomId('market_add_role_modal').setTitle('Yeni Rol Ürünü Ekle');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel("Ürün Adı").setPlaceholder("Örn: VIP Üyelik").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_price').setLabel("Fiyat").setPlaceholder("Örn: 5000").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_id').setLabel("ID (Benzersiz olmalı)").setPlaceholder("Örn: vip_1").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_role_id').setLabel("Verilecek Rolün ID'si").setPlaceholder("Örn: 123456789012345678").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_duration').setLabel("Süre (Gün)").setPlaceholder("Örn: 30 (Süresiz için 0 yazın)").setStyle(TextInputStyle.Short).setRequired(true))
                );
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ filter: (mi) => mi.customId === 'market_add_role_modal' && mi.user.id === author.id, time: 60000 }).catch(() => null);
                if (submitted) {
                    await submitted.deferReply({ flags: [64] }).catch(() => {});
                    const name = submitted.fields.getTextInputValue('item_name');
                    const price = parseInt(submitted.fields.getTextInputValue('item_price'));
                    const id = submitted.fields.getTextInputValue('item_id');
                    const roleId = submitted.fields.getTextInputValue('item_role_id');
                    const durationDays = parseInt(submitted.fields.getTextInputValue('item_duration'));

                    if (isNaN(price)) return submitted.editReply({ content: "Geçersiz fiyat! Lütfen sadece sayı girin." });
                    if (isNaN(durationDays) || durationDays < 0) return submitted.editReply({ content: "Geçersiz süre! Lütfen geçerli bir gün sayısı girin." });

                    const ecoConfig = ConfigManager.get("Economy") || {};
                    const marketItems = ecoConfig.MarketItems || [];

                    if (marketItems.some(x => x.id === id)) return submitted.editReply({ content: "Bu ID zaten kullanımda! Lütfen benzersiz bir ID girin." });

                    marketItems.push({ name, price, id, type: "role", roleId, durationDays });
                    ecoConfig.MarketItems = marketItems;
                    await ConfigManager.set("Economy", ecoConfig, author.tag);

                    await submitted.editReply({ content: `> **${name}** rol ürünü başarıyla eklendi!` });
                    if (msg.editable) await msg.edit({ components: generateMarketPanel(), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                }
            }

            if (i.customId === "market_do_remove") {
                const itemId = i.values[0];
                const ecoConfig = ConfigManager.get("Economy") || {};
                let marketItems = ecoConfig.MarketItems || [];
                marketItems = marketItems.filter(x => x.id !== itemId);
                ecoConfig.MarketItems = marketItems;

                await ConfigManager.set("Economy", ecoConfig, author.tag);
                await i.update({ components: generateMarketPanel(), flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "market_do_edit") {
                const itemId = i.values[0];
                const ecoConfig = ConfigManager.get("Economy") || {};
                const marketItems = ecoConfig.MarketItems || [];
                const item = marketItems.find(x => x.id === itemId);

                if (!item) return i.reply({ content: "Ürün bulunamadı!", flags: [MessageFlags.Ephemeral] });

                if (item.type === "role") {
                    const modal = new ModalBuilder().setCustomId(`market_edit_role_modal_${item.id}`).setTitle('Rol Ürününü Düzenle');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel("Ürün Adı").setValue(item.name).setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_price').setLabel("Fiyat").setValue(String(item.price)).setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_role_id').setLabel("Verilecek Rolün ID'si").setValue(item.roleId || "").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_duration').setLabel("Süre (Gün)").setValue(String(item.durationDays || 0)).setStyle(TextInputStyle.Short).setRequired(true))
                    );
                    await i.showModal(modal);
                    
                    const submitted = await i.awaitModalSubmit({ filter: (mi) => mi.customId === `market_edit_role_modal_${item.id}` && mi.user.id === author.id, time: 60000 }).catch(() => null);
                    if (submitted) {
                        await submitted.deferReply({ flags: [64] }).catch(() => {});
                        const name = submitted.fields.getTextInputValue('item_name');
                        const price = parseInt(submitted.fields.getTextInputValue('item_price'));
                        const roleId = submitted.fields.getTextInputValue('item_role_id');
                        const durationDays = parseInt(submitted.fields.getTextInputValue('item_duration'));
                        
                        if (isNaN(price)) return submitted.editReply({ content: "Geçersiz fiyat!" });
                        if (isNaN(durationDays)) return submitted.editReply({ content: "Geçersiz süre!" });

                        const index = marketItems.findIndex(x => x.id === item.id);
                        if (index !== -1) {
                            marketItems[index].name = name;
                            marketItems[index].price = price;
                            marketItems[index].roleId = roleId;
                            marketItems[index].durationDays = durationDays;
                            ecoConfig.MarketItems = marketItems;
                            await ConfigManager.set("Economy", ecoConfig, submitted.user.tag);
                        }
                        await submitted.editReply({ content: "> Rol ürünü güncellendi!" });
                        if (msg.editable) await msg.edit({ components: generateMarketPanel(), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    }
                } else {
                    const modal = new ModalBuilder().setCustomId(`market_edit_normal_modal_${item.id}`).setTitle('Ürünü Düzenle');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel("Ürün Adı").setValue(item.name).setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_price').setLabel("Fiyat").setValue(String(item.price)).setStyle(TextInputStyle.Short).setRequired(true))
                    );
                    await i.showModal(modal);
                    
                    const submitted = await i.awaitModalSubmit({ filter: (mi) => mi.customId === `market_edit_normal_modal_${item.id}` && mi.user.id === author.id, time: 60000 }).catch(() => null);
                    if (submitted) {
                        await submitted.deferReply({ flags: [64] }).catch(() => {});
                        const name = submitted.fields.getTextInputValue('item_name');
                        const price = parseInt(submitted.fields.getTextInputValue('item_price'));
                        if (isNaN(price)) return submitted.editReply({ content: "Geçersiz fiyat!" });

                        const index = marketItems.findIndex(x => x.id === item.id);
                        if (index !== -1) {
                            marketItems[index].name = name;
                            marketItems[index].price = price;
                            ecoConfig.MarketItems = marketItems;
                            await ConfigManager.set("Economy", ecoConfig, submitted.user.tag);
                        }
                        await submitted.editReply({ content: "> Ürün güncellendi!" });
                        if (msg.editable) await msg.edit({ components: generateMarketPanel(), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    }
                }
            }
        });

        collector.on("end", () => {
            if (msg.editable) msg.edit({ components: [] }).catch(() => {});
        });
    }
}

module.exports = MarketDuzenleService;
