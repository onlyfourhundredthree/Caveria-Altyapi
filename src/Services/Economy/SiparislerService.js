const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const MarketOrder = require("../../Core/Database/MarketOrder");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Settings = require("../../../Settings.json");

class SiparislerService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;
        const client = context.client;

        const emojis = ConfigManager.get("Emojis") || {};

        if (!ConfigManager.isOwner(member) && !member.permissions.has("Administrator")) {
            const errObj = { content: `${emojis.toji_iptal || "❌"} Bu komutu sadece yöneticiler kullanabilir.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const fetchOrders = async () => {
            const pending = await MarketOrder.find({ guildID: guild.id, status: "Bekliyor" }).sort({ orderDate: 1 }).limit(10);
            const past = await MarketOrder.find({ guildID: guild.id, status: { $ne: "Bekliyor" } }).sort({ orderDate: -1 }).limit(5);
            return { pending, past };
        };

        const generateAdminComponents = async (customMessage = null) => {
            const { pending, past } = await fetchOrders();

            const pendingText = pending.length > 0
                ? pending.map((o, index) => `> **${index + 1}.** <@${o.userID}> - **${o.itemName}**\n> Durum: \`${o.status}\` | Tarih: <t:${Math.floor(o.orderDate.getTime() / 1000)}:R>`).join("\n\n")
                : "> Bekleyen sipariş bulunmuyor.";

            const pastText = past.length > 0
                ? past.map((o) => `> <@${o.userID}> - **${o.itemName}**\n> Durum: \`${o.status}\` | Tarih: <t:${Math.floor(o.orderDate.getTime() / 1000)}:R>`).join("\n\n")
                : "> Geçmiş sipariş bulunmuyor.";

            const header = customMessage ? `${customMessage}\n\n` : "";

            const panel = new V2PanelBuilder()
                .addText(`${header}> ### ${emojis.toji_sparkly || "✨"} Sipariş Yönetimi\n> -# Aşağıdaki menüden bekleyen siparişleri seçip onaylayabilir veya reddedebilirsiniz.\n\n**Bekleyen Siparişler**\n${pendingText}\n\n**Son Geçmiş Siparişler**\n${pastText}`);

            if (pending.length > 0) {
                panel.addDivider(1);
                
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("admin_order_select")
                    .setPlaceholder("İşlem yapılacak siparişi seçin...")
                    .addOptions(pending.map((o, index) => ({
                        label: `${index + 1}. ${o.itemName}`,
                        description: `Kullanıcı ID: ${o.userID}`,
                        value: o._id.toString()
                    })));
                
                panel.addActionRow(new ActionRowBuilder().addComponents(selectMenu));
            }

            return panel.toJSON();
        };

        const setupComps = await generateAdminComponents();
        const replyObj = { components: setupComps, flags: [MessageFlags.IsComponentsV2] };
        
        let msg;
        if (isInteraction) {
            replyObj.fetchReply = true;
            msg = await context.reply(replyObj);
        } else {
            msg = await context.reply(replyObj);
        }

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 300000
        });

        collector.on("collect", async (i) => {
            if (i.customId === "admin_order_select") {
                const orderId = i.values[0];
                const order = await MarketOrder.findById(orderId);

                if (!order) return i.reply({ content: "Sipariş bulunamadı.", flags: [MessageFlags.Ephemeral] });

                const panel = new V2PanelBuilder()
                    .addText(`> ### ${emojis.toji_nokta || "•"} Sipariş Detayı\n> -# Lütfen aşağıdaki siparişi inceleyip işleminizi seçin.\n\n> **Ürün:** ${order.itemName}\n> **Kullanıcı:** <@${order.userID}>\n> **Tarih:** <t:${Math.floor(order.orderDate.getTime() / 1000)}:F>\n\n> Bu siparişi teslim edildi olarak işaretlemek veya iptal etmek istiyor musunuz?`)
                    .addDivider(1)
                    .addActionRow(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`deliver_${orderId}`).setLabel("Teslim Edildi").setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId(`cancel_${orderId}`).setLabel("İptal Et").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId("admin_back").setLabel("Geri").setStyle(ButtonStyle.Secondary)
                        )
                    );

                await i.update({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId.startsWith("deliver_")) {
                const orderId = i.customId.split("_")[1];
                await MarketOrder.findByIdAndUpdate(orderId, {
                    status: "Teslim Edildi",
                    deliveredBy: i.user.id,
                    deliveredAt: new Date()
                });

                const order = await MarketOrder.findById(orderId);
                const user = await client.users.fetch(order.userID).catch(() => null);
                if (user) {
                    user.send(`${emojis.toji_onay || "✅"} **${order.itemName}** ürününüz teslim edildi! İyi günlerde kullanın.`).catch(() => { });
                }

                const setup = await generateAdminComponents(`> ${emojis.toji_onay || "✅"} **${order.itemName}** siparişi başarıyla teslim edildi olarak işaretlendi.`);
                await i.update({ components: setup, flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId.startsWith("cancel_")) {
                const orderId = i.customId.split("_")[1];
                await MarketOrder.findByIdAndUpdate(orderId, {
                    status: "Reddedildi",
                    deliveredBy: i.user.id,
                    deliveredAt: new Date()
                });

                const setup = await generateAdminComponents(`> ${emojis.toji_iptal || "❌"} Sipariş başarıyla iptal edildi ve reddedildi.`);
                await i.update({ components: setup, flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "admin_back") {
                const setup = await generateAdminComponents();
                await i.update({ components: setup, flags: [MessageFlags.IsComponentsV2] });
            }
        });

        collector.on("end", () => {
            if (msg.editable) msg.edit({ components: [] }).catch(() => { });
        });
    }
}

module.exports = SiparislerService;
