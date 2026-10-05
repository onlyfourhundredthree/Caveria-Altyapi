const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder, StringSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class EcoAyarService {
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

        const config = ConfigManager.get("Economy") || {};
        const logStr = config.LogChannel ? `<#${config.LogChannel}>` : "`Ayarlanmamış`";
        const marketStr = config.MarketChannel ? `<#${config.MarketChannel}>` : "`Ayarlanmamış`";
        const coinName = config.CoinName || "Coin";
        
        const admins = (config.AdminRoles || []).map(r => `<@&${r}>`).join(", ") || "`Yok`";

        const panel = new V2PanelBuilder()
            .addAccessory(guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png", `## ${spark} Ekonomi Sistemi\n-# Sunucu: **${guild.name}**`)
            .addDivider(1)
            .addText(`### Temel Ayarlar\n> ${nokta} **Para Birimi:** \`${coinName}\`\n> ${nokta} **Log Kanalı:** ${logStr}\n> ${nokta} **Market Kanalı:** ${marketStr}\n> ${nokta} **Yetkili Roller:** ${admins}`)
            .addText(`### Kazanım Oranları\n> ${nokta} **Günlük:** \`${config.DailyMin || 0} - ${config.DailyMax || 0}\`\n> ${nokta} **Chat:** \`${config.ChatMin || 0} - ${config.ChatMax || 0}\`\n> ${nokta} **Ses:** \`${config.VoiceMin || 0} - ${config.VoiceMax || 0}\`\n> ${nokta} **Level Başı Ödül:** \`${config.LevelCoin || 100}\``)
            .addText(`### Ceza Kesintileri\n> ${nokta} **Mute:** \`${config.MutePenalty || 0}\`\n> ${nokta} **Jail:** \`${config.JailPenalty || 0}\`\n> ${nokta} **Ban:** \`${config.BanPenalty || 0}\``)
            .addDivider(1);

        const select = new StringSelectMenuBuilder()
            .setCustomId("ecoayar_menu")
            .setPlaceholder("Yapmak istediğiniz işlemi seçin")
            .addOptions([
                { label: "Log Kanalı Ayarla", value: "log" },
                { label: "Market Kanalı Ayarla", value: "market" },
                { label: "Kazanım Oranları", value: "gain" },
                { label: "Ceza Kesintileri", value: "penalty" },
                { label: "Para Birimi İsmi", value: "name" },
                { label: "Yetkili Rolü Ekle/Çıkar", value: "admin" }
            ]);

        const row1 = new ActionRowBuilder().addComponents(select);
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ecoayar_sifirla").setLabel("Sistemi Sıfırla").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("ecoayar_yenile").setLabel("Yenile").setStyle(ButtonStyle.Secondary)
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

module.exports = EcoAyarService;
