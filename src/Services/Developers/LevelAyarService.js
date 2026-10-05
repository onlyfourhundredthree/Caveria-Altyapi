const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class LevelAyarService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const isOwner = ConfigManager.isOwner(member);
        const isAdmin = member.permissions.has("Administrator");

        if (!isOwner && !isAdmin) {
            const errObj = { content: "Bu paneli açmak için yeterli yetkiniz yok.", ephemeral: true };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✨";
        const nokta = emojis.toji_nokta || "-";

        const msgRanks = ConfigManager.get("Roles.MessageRanks") || [];
        const voiceRanks = ConfigManager.get("Roles.VoiceRanks") || [];

        const formatRanks = (ranks) => {
            if (!ranks.length) return "> Henüz hiçbir level rolü eklenmemiş.";
            return ranks
                .sort((a, b) => a.Level - b.Level)
                .map((r, i) => {
                    const roleId = r.Role || r.role || r.roleID || "BİLİNMEYEN_ROL";
                    const role = guild.roles.cache.get(roleId);
                    const roleStr = role ? `<@&${roleId}>` : `~~${roleId}~~ (silinmiş)`;
                    return `> ${nokta} **${i + 1}.** Level \`${r.Level}\` → ${roleStr}`;
                }).join("\n");
        };

        const msgLog = ConfigManager.get("Channels.MessageLevelLog") ? `<#${ConfigManager.get("Channels.MessageLevelLog")}>` : "`Ayarlanmamış`";
        const voiceLog = ConfigManager.get("Channels.VoiceLevelLog") ? `<#${ConfigManager.get("Channels.VoiceLevelLog")}>` : "`Ayarlanmamış`";

        const panel = new V2PanelBuilder()
            .addAccessory(guild.iconURL({ extension: "png", size: 256 }) || "https://cdn.discordapp.com/embed/avatars/0.png", `## ${spark} Level Rol Sistemi\n-# Sunucu: **${guild.name}**`)
            .addDivider(1)
            .addText(`### Log Kanalları\n> ${nokta} **Mesaj Level Log:** ${msgLog}\n> ${nokta} **Ses Level Log:** ${voiceLog}`)
            .addDivider(1)
            .addText(`### Mesaj Level Rolleri\n${formatRanks(msgRanks)}`)
            .addDivider(1)
            .addText(`### Ses Level Rolleri\n${formatRanks(voiceRanks)}`)
            .addDivider(1);

        const { StringSelectMenuBuilder } = require("discord.js");
        const select = new StringSelectMenuBuilder()
            .setCustomId("levelayar_menu")
            .setPlaceholder("Log Kanalı Ayarlamak İçin Seçin")
            .addOptions([
                { label: "Mesaj Level Log Kanalı", value: "msglog" },
                { label: "Ses Level Log Kanalı", value: "voicelog" }
            ]);
            
        const rowSelect = new ActionRowBuilder().addComponents(select);

        const buttons = [
            new ButtonBuilder().setCustomId("levelayar_add").setLabel("Rol Ekle").setStyle(ButtonStyle.Success)
        ];

        if (msgRanks.length > 0 || voiceRanks.length > 0) {
            buttons.push(new ButtonBuilder().setCustomId("levelayar_delete").setLabel("Rol Sil").setStyle(ButtonStyle.Danger));
        }

        buttons.push(
            new ButtonBuilder().setCustomId("levelayar_reset").setLabel("Rolleri Sıfırla").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("levelayar_refresh").setLabel("Yenile").setStyle(ButtonStyle.Secondary)
        );

        panel.addActionRow(rowSelect);
        panel.addActionRow(new ActionRowBuilder().addComponents(buttons));

        const replyObj = { flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() };
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

module.exports = LevelAyarService;
