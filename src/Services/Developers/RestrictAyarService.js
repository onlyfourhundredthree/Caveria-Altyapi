const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class RestrictAyarService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const isOwner = ConfigManager.isOwner(member);
        if (!isOwner) {
            return context.reply({ content: "Bu paneli açmak için kurucu yetkisine sahip olmalısınız.", flags: [MessageFlags.Ephemeral] }).catch(()=>{});
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✨";
        const nokta = emojis.toji_nokta || "-";

        const config = ConfigManager.get("Restrict") || {};
        const users = (config.Users || []).map(u => `<@${u}>`).join(", ") || "`Ayarlanmamış`";
        const roles = (config.Roles || []).map(r => `<@&${r}>`).join(", ") || "`Ayarlanmamış`";

        const panel = new V2PanelBuilder()
            .addAccessory(guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png", `## ${spark} Restrict (Koruma) Sistemi\n-# Sunucu: **${guild.name}**`)
            .addDivider(1)
            .addText(`### 🛡️ Mevcut Ayarlar\n> ${nokta} **Korunan Üyeler:** ${users}\n> ${nokta} **Alınması Yasaklı Roller:** ${roles}\n\n-# Belirtilen üyeler (veya sunucu sahipleri), yasaklı rolleri hiçbir şekilde alamaz.`)
            .addDivider(1);

        const select = new StringSelectMenuBuilder()
            .setCustomId("restrictayar_menu")
            .setPlaceholder("Yapmak istediğiniz işlemi seçin")
            .addOptions([
                { label: "Korunan Üyeleri Seç", value: "users", description: "Belirli rolleri alması engellenecek üyeler." },
                { label: "Yasaklı Rolleri Seç", value: "roles", description: "Korunan üyelerin alamayacağı roller." }
            ]);

        const row1 = new ActionRowBuilder().addComponents(select);
        
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("restrictayar_sifirla").setLabel("Sistemi Sıfırla").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("restrictayar_yenile").setLabel("Yenile").setStyle(ButtonStyle.Secondary)
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

module.exports = RestrictAyarService;
