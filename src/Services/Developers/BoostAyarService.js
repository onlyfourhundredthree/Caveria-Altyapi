const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, StringSelectMenuBuilder, RoleSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class BoostAyarService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const isOwner = ConfigManager.isOwner(member);
        const isAdmin = member.permissions.has("Administrator");

        if (!isOwner && !isAdmin) {
            return context.reply({ content: "Bu paneli açmak için yeterli yetkiniz yok.", flags: [MessageFlags.Ephemeral] }).catch(()=>{});
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✨";
        const nokta = emojis.toji_nokta || "-";

        const config = ConfigManager.get("Boost") || {};
        const channelStr = config.Channel ? `<#${config.Channel}>` : "`Ayarlanmamış`";
        const logStr = config.LogChannel ? `<#${config.LogChannel}>` : "`Ayarlanmamış`";
        const coinStr = config.RewardCoin ? `\`${config.RewardCoin} Coin\`` : "`Ayarlanmamış`";
        const rolesStr = (config.RewardRoles || []).map(r => `<@&${r}>`).join(", ") || "`Ayarlanmamış`";
        const msgStr = config.Message ? `\`\`\`${config.Message.length > 50 ? config.Message.substring(0, 50) + "..." : config.Message}\`\`\`` : "`Ayarlanmamış`";

        const panel = new V2PanelBuilder()
            .addAccessory(guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png", `## ${spark} Boost Sistemi Yönetimi\n-# Sunucu: **${guild.name}**`)
            .addDivider(1)
            .addText(`### Mevcut Ayarlar\n> ${nokta} **Kutlama Kanalı:** ${channelStr}\n> ${nokta} **Log Kanalı:** ${logStr}\n> ${nokta} **Ödül (Coin):** ${coinStr}\n> ${nokta} **Ödül (Roller):** ${rolesStr}\n> ${nokta} **Boost Mesajı:**\n${msgStr}`)
            .addDivider(1);

        const select = new StringSelectMenuBuilder()
            .setCustomId("boostayar_menu")
            .setPlaceholder("Yapmak istediğiniz işlemi seçin")
            .addOptions([
                { label: "Kutlama Kanalı Ayarla", value: "channel" },
                { label: "Log Kanalı Ayarla", value: "log" },
                { label: "Ödül Rolleri Seç", value: "roles" },
                { label: "Mesajı Ayarla", value: "message" },
                { label: "Ödül Coin Ayarla", value: "coin" }
            ]);

        const row1 = new ActionRowBuilder().addComponents(select);
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("boostayar_sifirla").setLabel("Sistemi Sıfırla").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("boostayar_yenile").setLabel("Yenile").setStyle(ButtonStyle.Secondary)
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

module.exports = BoostAyarService;
