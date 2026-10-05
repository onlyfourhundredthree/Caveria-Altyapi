const { MessageFlags } = require("discord.js");
const Economy = require("../../Core/Database/Economy");
const MarketOrder = require("../../Core/Database/MarketOrder");
const ActiveMarketRole = require("../../Core/Database/ActiveMarketRole");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class EconomyService {
    /**
     * Ekonomi panelini oluşturur ve etkileşimi yönetir.
     * @param {Object} client - Discord Client objesi
     * @param {Object} ctx - Message veya Interaction objesi (yanıt vermek için)
     * @param {Object} targetUser - Hedef kullanıcının User objesi
     * @param {Object} member - Hedef kullanıcının GuildMember objesi
     * @param {Object} guild - Sunucu objesi
     * @param {String} authorId - Komutu kullanan kişinin ID'si (Collector filtresi için)
     */
    static async sendEconomyPanel(client, ctx, targetUser, member, guild, authorId) {
        const emojis = ConfigManager.get("Emojis") || {};
        const economyConfig = ConfigManager.get("Economy") || {};
        const currencyName = economyConfig.CurrencyName || "403 Coin";
        const userName = member?.nickname || targetUser.globalName || targetUser.username || "Bilinmeyen Kullanıcı";

        const generateMainComponents = async (customDescription = null) => {
            const userData = await Economy.findOne({ guildID: guild.id, userID: targetUser.id }) || { coin: 0 };
            const currentCoin = userData.coin || 0;
            const desc = customDescription || "Aşağıdaki menüleri kullanarak ekonomi işlemlerini gerçekleştirebilirsin.";
            
            const components = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 11,
                                media: { url: targetUser.displayAvatarURL({ dynamic: true, size: 512, extension: "png" }) }
                            },
                            components: [{
                                type: 10,
                                content: `> ## ${emojis.toji_sparkly || "✨"} ${userName} | Ekonomi\n> -# ${desc}\n\n**Mevcut Bakiye:** \`${currentCoin.toLocaleString("tr-TR")}\` ${currencyName}`
                            }]
                        }
                    ]
                }
            ];

            const actionRow = { type: 1, components: [] };
            if (targetUser.id === authorId) {
                actionRow.components.push({ type: 2, custom_id: "eco_shop", label: "Mağaza", style: 2 });
                actionRow.components.push({ type: 2, custom_id: "eco_orders", label: "Siparişlerim", style: 1 });
                actionRow.components.push({ type: 2, custom_id: "eco_close", label: "Paneli Kapat", style: 4 });
            }

            if (actionRow.components.length > 0) {
                components[0].components.push(actionRow);
            }

            return components;
        };

        const generateOrdersComponents = async () => {
            const orders = await MarketOrder.find({ guildID: guild.id, userID: targetUser.id }).sort({ orderDate: -1 }).limit(10);

            const activeOrders = orders.filter(o => o.status === "Bekliyor");
            const pastOrders = orders.filter(o => o.status !== "Bekliyor");

            const formatOrder = (o, emoji) => `> ${emoji} **${o.itemName}** - \`${o.itemPrice.toLocaleString("tr-TR")}\` ${currencyName}\n> Durum: \`${o.status}\` | Tarih: <t:${Math.floor(o.orderDate.getTime() / 1000)}:R>`;

            const activeList = activeOrders.length > 0
                ? activeOrders.map(o => formatOrder(o, emojis.pr_community || "📦")).join("\n\n")
                : "> Bekleyen siparişiniz bulunmuyor.";

            const pastList = pastOrders.length > 0
                ? pastOrders.map(o => formatOrder(o, emojis.toji_onay || "✅")).join("\n\n")
                : "> Geçmiş siparişiniz bulunmuyor.";

            return [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ### ${emojis.toji_nokta || "•"} Siparişlerim\n> -# Sipariş geçmişiniz aşağıda listelenmiştir.\n\n**Bekleyen Siparişler**\n${activeList}\n\n**Geçmiş Siparişler**\n${pastList}`
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 1,
                            components: [{ type: 2, custom_id: "eco_back", label: "Geri Dön", style: 1 }]
                        }
                    ]
                }
            ];
        };

        const generateShopComponents = async () => {
            let marketItems = economyConfig.MarketItems || [];
            marketItems = marketItems.sort((a, b) => b.price - a.price);
            if (marketItems.length === 0) return null;
            const userData = await Economy.findOne({ guildID: guild.id, userID: targetUser.id }) || { coin: 0 };
            const currentBalance = userData.coin || 0;

            // Remove <a:hubsparkle392:...> unicode hardcode and use properly dynamic emojis.
            return [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ### ${emojis.toji_nokta || "•"} ${client.user.username} Mağaza\n> -# Almak istediğiniz ürünü aşağıdaki menüden seçebilirsiniz.\n\n${marketItems.map(x => `> ${emojis.toji_sparkly || "✨"} **${x.name}** - \`${(x.price || 0).toLocaleString("tr-TR")}\` ${currencyName}`).join("\n")}\n\n**Mevcut Bakiyen:** \`${currentBalance.toLocaleString("tr-TR")}\` ${currencyName}`
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 1,
                            components: [{
                                type: 3,
                                custom_id: "shop_buy",
                                placeholder: "Satın almak için bir ürün seçin...",
                                options: marketItems.map(item => ({
                                    label: item.name,
                                    description: `${item.price} ${currencyName}`,
                                    value: item.id
                                }))
                            }]
                        },
                        {
                            type: 1,
                            components: [{ type: 2, custom_id: "eco_back", label: "Geri Dön", style: 1 }]
                        }
                    ]
                }
            ];
        };

        const initialComponents = await generateMainComponents();
        const payload = {
            components: initialComponents,
            flags: [MessageFlags.IsComponentsV2]
        };

        let msg;
        if (ctx.isCommand && ctx.isCommand()) {
            msg = await ctx.reply({ ...payload, fetchReply: true });
        } else {
            msg = await ctx.reply(payload);
        }

        if (targetUser.id !== authorId) return;

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === authorId,
            time: 120000
        });

        collector.on("collect", async (i) => {
            await i.deferUpdate().catch(() => {});

            if (i.customId === "eco_close") {
                collector.stop();
                if (ctx.isCommand && ctx.isCommand()) {
                    return ctx.deleteReply().catch(() => {});
                } else {
                    return msg.delete().catch(() => {});
                }
            }

            if (i.customId === "eco_orders") {
                const comps = await generateOrdersComponents();
                await i.editReply({ components: comps, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }

            if (i.customId === "eco_shop") {
                const shop = await generateShopComponents();
                if (!shop) return i.followUp({ content: `${emojis.toji_iptal || "❌"} Mağaza şu an boş.`, flags: [MessageFlags.Ephemeral] });
                await i.editReply({ components: shop, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }

            if (i.customId === "eco_back") {
                const comps = await generateMainComponents();
                await i.editReply({ components: comps, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }

            if (i.customId === "shop_buy") {
                const itemId = i.values[0];
                const marketItems = economyConfig.MarketItems || [];
                const item = marketItems.find(x => x.id === itemId);

                const currentWealth = await Economy.findOne({ guildID: guild.id, userID: authorId });
                if (!currentWealth || currentWealth.coin < item.price) {
                    return i.followUp({ content: `Yetersiz bakiye! \`${(item.price - (currentWealth?.coin || 0)).toLocaleString("tr-TR")}\` ${currencyName} eksiğin var.`, flags: [MessageFlags.Ephemeral] });
                }

                await Economy.findOneAndUpdate({ guildID: guild.id, userID: authorId }, { $inc: { coin: -item.price } }, { upsert: true });

                let orderStatus = "Bekliyor";
                let feedbackMsg = `> ${emojis.toji_onay || "✅"} **${item.name}** başarıyla satın alındı ve siparişiniz oluşturuldu!`;

                if (item.type === "role" && item.roleId) {
                    const role = guild.roles.cache.get(item.roleId);
                    if (role) {
                        const memberToGive = guild.members.cache.get(authorId);
                        await memberToGive.roles.add(role).catch(() => {});
                        orderStatus = "Tamamlandı";
                        feedbackMsg = `> ${emojis.toji_onay || "✅"} **${item.name}** başarıyla satın alındı ve rol hesabınıza tanımlandı!`;

                        if (item.durationDays && item.durationDays > 0) {
                            const expireDate = new Date(Date.now() + item.durationDays * 24 * 60 * 60 * 1000);
                            await ActiveMarketRole.findOneAndUpdate(
                                { guildID: guild.id, userID: authorId, roleID: item.roleId },
                                { $set: { expireAt: expireDate } },
                                { upsert: true }
                            );
                        }
                    } else {
                        orderStatus = "Hatalı Teslimat";
                        feedbackMsg = `> ${emojis.toji_iptal || "❌"} **${item.name}** satın alındı ancak rol bulunamadığı için teslim edilemedi. Lütfen yetkililere ulaşın.`;
                    }
                }

                await new MarketOrder({
                    guildID: guild.id,
                    userID: authorId,
                    itemName: item.name,
                    itemPrice: item.price,
                    status: orderStatus
                }).save();

                const updatedComps = await generateMainComponents(`${feedbackMsg}`);
                await i.editReply({ components: updatedComps, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }
        });

        collector.on("end", () => {
            if (ctx.isCommand && ctx.isCommand()) {
                ctx.editReply({ components: [] }).catch(() => {});
            } else {
                msg.edit({ components: [] }).catch(() => {});
            }
        });
    }
}

module.exports = EconomyService;
