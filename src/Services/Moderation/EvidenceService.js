const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const Punitives = require("../../Core/Database/Punitives");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const Settings = require("../../../Settings.json");

class EvidenceService {
    async sendToPool(client, punishDoc, reasonType, uploadedUrls = null) {
        const poolId = ConfigManager.get("Channels.EvidenceAuditPool");
        if (!poolId) return;

        const guild = client.guilds.cache.get(Settings.Main.GuildID);
        if (!guild) return;

        const poolCh = guild.channels.cache.get(poolId);
        if (!poolCh) return;

        let staffMember = guild.members.cache.get(punishDoc.Staff);
        if (!staffMember) {
            staffMember = await guild.members.fetch(punishDoc.Staff).catch(() => null);
        }

        const controllers = ConfigManager.get("Roles.PunishmentControllers") || [];
        const controllerMentions = controllers.map(r => `<@&${r}>`).join(" ");
        
        const emojis = ConfigManager.get("Emojis") || {};
        const uyari = emojis.toji_uyari || "⚠️";
        const nokta = emojis.toji_nokta || "•";
        const userEm = emojis.toji_user || "👤";
        const staffEm = emojis.toji_staff || "🛡️";
        const timeEm = emojis.toji_time || "🕒";
        const info = emojis.toji_info || "ℹ️";

        const currentDoc = await Punitives.findOne({ No: punishDoc.No }).lean() || punishDoc;
        const isRemoved = !currentDoc.Active || currentDoc.Remover;

        let titleStr = "";
        let statusStr = "";
        
        const staffTag = staffMember ? staffMember.toString() : `<@${punishDoc.Staff}>`;
        const avatarUrl = staffMember ? staffMember.user.displayAvatarURL({ extension: 'png' }) : client.user.displayAvatarURL({ extension: 'png' });

        if (reasonType === "skip") {
            titleStr = isRemoved
                ? `## ${uyari} Yeni Denetim İşi (Ceza Kaldırma - Kanıtsız / Pas Geçildi)`
                : `## ${uyari} Yeni Denetim İşi (Kanıtsız / Pas Geçildi)`;
            statusStr = isRemoved
                ? `> ${info} **Durum:** Yetkili, **ceza kaldırma** işlemi için kanıt yüklemeyi pas geçti.`
                : `> ${info} **Durum:** Yetkili, bu ceza için kanıt yüklemeyi pas geçti.`;
        } else if (reasonType === "timeout") {
            titleStr = isRemoved
                ? `## ${uyari} Yeni Denetim İşi (Ceza Kaldırma - Zaman Aşımı / Kanıtsız)`
                : `## ${uyari} Yeni Denetim İşi (Zaman Aşımı / Kanıtsız)`;
            statusStr = isRemoved
                ? `> ${info} **Durum:** Yetkili, **ceza kaldırma** işlemi için **5 dakika** içinde kanıt sunmadı veya pas geçmedi.`
                : `> ${info} **Durum:** Yetkili, **5 dakika** içinde kanıt sunmadı veya işlemi pas geçmedi.`;
        } else if (reasonType === "uploaded") {
            titleStr = isRemoved
                ? `## ${info} Yeni Denetim İşi (Ceza Kaldırma - Kanıt Yüklendi)`
                : `## ${info} Yeni Denetim İşi (Kanıt Yüklendi)`;
        }

        const pRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`evidence_audit_take_${punishDoc.No}`).setLabel("İlgilen").setStyle(ButtonStyle.Primary)
        );
        
        const pPanel = new V2PanelBuilder()
            .addAccessory(avatarUrl, titleStr)
            .addDivider(1);

        const punishReason = punishDoc.Reason || "Belirtilmedi";

        if (reasonType === "uploaded" && uploadedUrls && uploadedUrls.length > 0) {
            pPanel.addText(`> ${nokta} **Ceza Numarası:** \`#${punishDoc.No}\`\n> ${nokta} **Ceza Türü:** \`${punishDoc.Type}${isRemoved ? " (Kaldırıldı)" : ""}\`\n> ${info} **Ceza Sebebi:** \`${punishReason}\`\n> ${userEm} **Kullanıcı:** <@${punishDoc.Member}>\n> ${staffEm} **Yetkili:** ${staffTag}\n> ${nokta} **Kanıt:** [Tıklayıp Görüntüle](${uploadedUrls[0].url})\n> ${timeEm} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>\n> ${uyari} **Bildirimler:** ${staffTag} ${controllerMentions}`);
            pPanel.addDivider(1);
            pPanel.addMediaGallery(uploadedUrls);
        } else {
            pPanel.addText(`${statusStr}\n> ${nokta} **Ceza Numarası:** \`#${punishDoc.No}\`\n> ${nokta} **Ceza Türü:** \`${punishDoc.Type}${isRemoved ? " (Kaldırıldı)" : ""}\`\n> ${info} **Ceza Sebebi:** \`${punishReason}\`\n> ${userEm} **Kullanıcı:** <@${punishDoc.Member}>\n> ${staffEm} **Yetkili:** ${staffTag}\n> ${timeEm} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>\n> ${uyari} **Bildirimler:** ${staffTag} ${controllerMentions}`);
            if (punishDoc.Evidence && punishDoc.Evidence.length > 0) {
                pPanel.addDivider(1);
                pPanel.addMediaGallery(punishDoc.Evidence);
            }
        }
        
        pPanel.data.components.push(pRow.toJSON());
        
        await poolCh.send({ allowedMentions: { parse: ['roles', 'users'] }, flags: [MessageFlags.IsComponentsV2 || (1<<16)], components: pPanel.toJSON() })
            .catch((err)=>{ console.error("[EvidenceService] Pool send error:", err); });
            
        await Punitives.updateOne({ No: punishDoc.No }, { $set: { EvidencePoolSent: true } });

        // Orijinal mesajın altındaki butonları kaldır
        if (punishDoc.PromptChannelID && punishDoc.PromptMessageID) {
            try {
                const promptCh = guild.channels.cache.get(punishDoc.PromptChannelID) || await guild.channels.fetch(punishDoc.PromptChannelID).catch(() => null);
                if (promptCh && promptCh.isTextBased()) {
                    const promptMsg = await promptCh.messages.fetch(punishDoc.PromptMessageID).catch(() => null);
                    if (promptMsg && promptMsg.editable) {
                        await promptMsg.edit({ components: [] }).catch(() => {});
                    }
                }
            } catch (err) {}
        }
    }
}

module.exports = new EvidenceService();
