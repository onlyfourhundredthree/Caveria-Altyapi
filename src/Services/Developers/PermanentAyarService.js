const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class PermanentAyarService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const isOwner = ConfigManager.isOwner(member);
        const isAdmin = member.permissions.has("Administrator");

        if (!isOwner && !isAdmin) {
            return context.reply({ content: "Bu paneli açmak için yeterli yetkiniz yok.", ephemeral: true });
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✨";
        const nokta = emojis.toji_nokta || "-";

        const config = ConfigManager.get("PermanentRoomSettings") || {};
        const channelStr = config.Channel ? `<#${config.Channel}>` : "`Ayarlanmamış`";
        const catStr = config.Category ? `<#${config.Category}>` : "`Ayarlanmamış`";
        const logStr = config.LogChannel ? `<#${config.LogChannel}>` : "`Ayarlanmamış`";
        const priceStr = config.Price ? `\`${config.Price} Coin\`` : "`Ayarlanmamış`";

        const panel = new V2PanelBuilder()
            .addAccessory(guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png", `## ${spark} Kalıcı Özel Oda Sistemi\n-# Sunucu: **${guild.name}**`)
            .addDivider(1)
            .addText(`### Mevcut Ayarlar\n> ${nokta} **Oda Oluşturma Kanalı:** ${channelStr}\n> ${nokta} **Kategori:** ${catStr}\n> ${nokta} **Log Kanalı:** ${logStr}\n> ${nokta} **Oda Ücreti:** ${priceStr}`)
            .addDivider(1);

        const channelSelect = new ChannelSelectMenuBuilder()
            .setCustomId("permanentayar_kanal_select")
            .setPlaceholder("Ses, Metin kanalı veya Kategori seçin")
            .setChannelTypes(ChannelType.GuildVoice, ChannelType.GuildText, ChannelType.GuildCategory)
            .setMaxValues(1);

        const row1 = new ActionRowBuilder().addComponents(channelSelect);
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("permanentayar_price").setLabel("Ücreti Ayarla").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("permanentayar_sifirla").setLabel("Sistemi Sıfırla").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("permanentayar_yenile").setLabel("Yenile").setStyle(ButtonStyle.Secondary)
        );

        panel.addActionRow(row1);
        panel.addActionRow(row2);
        const replyObj = { flags: [MessageFlags.IsComponentsV2], components: panel.toJSON(), content: "" };
        
        if (isInteraction) {
            if ((context.isMessageComponent && context.isMessageComponent()) || (context.isModalSubmit && context.isModalSubmit())) {
                if (context.replied || context.deferred) {
                    return context.editReply(replyObj).catch(()=>{});
                } else {
                    return context.update(replyObj).catch(()=>{});
                }
            } else {
                if (context.replied || context.deferred) {
                    return context.editReply(replyObj).catch(()=>{});
                } else {
                    return context.reply(replyObj).catch(()=>{});
                }
            }
        } else {
            return context.reply(replyObj).catch(()=>{});
        }
    }
}

module.exports = PermanentAyarService;
