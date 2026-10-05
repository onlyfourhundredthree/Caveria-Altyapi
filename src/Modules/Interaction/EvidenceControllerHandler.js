const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const Punitives = require("../../Core/Database/Punitives");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("evidence_audit_")) return;

    await interaction.deferUpdate().catch(()=>{});

    const controllers = ConfigManager.get("Roles.PunishmentControllers") || [];
    const isController = interaction.member.roles.cache.some(r => controllers.includes(r.id));
    const isAdmin = interaction.member.permissions.has("Administrator");
    const isOwner = ConfigManager.isOwner(interaction.member);

    if (!isController && !isAdmin && !isOwner) {
        return interaction.followUp({ content: "Bu işlemi yapmak için denetleyici rolüne sahip olmalısınız.", ephemeral: true });
    }

    const parts = interaction.customId.split("_");
    const action = parts[2]; // take, approve, cancel
    const punishNo = parseInt(parts[3]);

    const doc = await Punitives.findOne({ No: punishNo });
    if (!doc) {
        return interaction.followUp({ content: "Ceza belgesi bulunamadı.", ephemeral: true });
    }

    if (action === "take") {
        if (doc.AuditStatus !== "Pending" && doc.AuditStatus !== "Handled") {
            return interaction.followUp({ content: "Bu ceza zaten karara bağlanmış.", ephemeral: true });
        }
        if (doc.AuditedBy && doc.AuditedBy !== interaction.user.id) {
            return interaction.followUp({ content: `Bu ceza ile zaten <@${doc.AuditedBy}> ilgileniyor.`, ephemeral: true });
        }
        
        doc.AuditStatus = "Handled";
        doc.AuditedBy = interaction.user.id;
        await doc.save();

        let rawComponents = [];
        if (interaction.message && interaction.message.components) {
            rawComponents = JSON.parse(JSON.stringify(interaction.message.components.map(c => typeof c.toJSON === 'function' ? c.toJSON() : c)));
        }
        
        // Remove any old external ActionRows to prevent duplicates
        rawComponents = rawComponents.filter(c => c.type !== 1);
        
        let container = rawComponents.find(c => c.type === 17) || rawComponents[0];
        if (container && container.components) {
            let textBlock = container.components.find(c => c.type === 10);
            if (textBlock && !textBlock.content.includes("İlgilenen Yetkili")) {
                const emojis = ConfigManager.get("Emojis") || {};
                const staffEm = emojis.toji_staff || "🛡️";
                textBlock.content += `\n> ${staffEm} **İlgilenen Yetkili:** <@${interaction.user.id}>`;
            }

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`evidence_audit_approve_${punishNo}`).setLabel("Cezayı Onayla").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`evidence_audit_cancel_${punishNo}`).setLabel("İptal Et / Kaldır").setStyle(ButtonStyle.Danger)
            );
            
            container.components = container.components.filter(c => c.type !== 1);
            container.components.push(newRow.toJSON());
            await interaction.editReply({ components: rawComponents }).catch(()=>{});
        }
        return;
    }

    if (action === "approve" || action === "cancel") {
        if (doc.AuditedBy !== interaction.user.id && !isAdmin && !isOwner) {
            return interaction.followUp({ content: "Sadece ilgilenen yetkili bu işlemi sonlandırabilir.", ephemeral: true });
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const nokta = emojis.toji_nokta || "•";
        const userEm = emojis.toji_user || "👤";
        const staffEm = emojis.toji_staff || "🛡️";
        const timeEm = emojis.toji_time || "🕒";
        const info = emojis.toji_info || "ℹ️";
        const onay = emojis.toji_onay || "✅";
        const iptal = emojis.toji_iptal || "❌";

        if (action === "cancel") {
            const guild = interaction.guild;
            if (doc.Active) {
                doc.Active = false;
                doc.Hidden = true;
                doc.Remover = interaction.user.id;
                doc.RemoveDate = Date.now();
                doc.RemoveReason = "Denetleyici tarafından iptal edildi.";
                
                try {
                    const member = await guild.members.fetch(doc.Member).catch(()=>{});
                    
                    if (doc.Type === "ban" || doc.Type === "forceban") {
                        await guild.bans.remove(doc.Member, "Denetleyici tarafından iptal edildi.").catch(()=>{});
                    } else if (doc.Type === "jail" && member) {
                        const config = ConfigManager.get("Roles") || {};
                        if (member.roles.cache.has(config.Jailed)) {
                            await member.roles.remove(config.Jailed).catch(()=>{});
                            const oldRoles = await interaction.client.db.models.MemberRoles.findOne({ user: doc.Member });
                            if (oldRoles && oldRoles.roles) {
                                await member.roles.add(oldRoles.roles.filter(r => guild.roles.cache.has(r))).catch(()=>{});
                            }
                        }
                    } else if (doc.Type === "mute" && member) {
                        const config = ConfigManager.get("Roles") || {};
                        if (member.roles.cache.has(config.Muted)) {
                            await member.roles.remove(config.Muted).catch(()=>{});
                        }
                    } else if (doc.Type === "vmute" && member) {
                        if (member.voice && member.voice.channel) {
                            await member.voice.setMute(false, "Denetleyici tarafından iptal edildi.").catch(()=>{});
                        }
                    }
                } catch(e) {
                    console.error("Audit Cancel Error:", e);
                }
            }
            doc.AuditStatus = "Lifted";
            doc.Hidden = true;
        } else {
            doc.AuditStatus = "Approved";
        }
        await doc.save();
        
        const TaskManager = require("../../Core/Handlers/TaskManager");
        await TaskManager.progressTask(interaction.guild, interaction.member, "EVIDENCE", 1);

        // Build Final Log
        const hasEvidence = doc.Evidence && doc.Evidence.length > 0;
        const targetChannelId = hasEvidence ? ConfigManager.get("Channels.EvidenceLog") : ConfigManager.get("Channels.EvidenceTimeoutLog");
        
        if (targetChannelId) {
            const logChannel = interaction.guild.channels.cache.get(targetChannelId);
            if (logChannel) {
                const headerEmoji = action === "approve" ? onay : iptal;
                const headerText = action === "approve" ? "Denetim: Onaylandı" : "Denetim: Ceza İptal Edildi";
                const rawEvidenceUrl = hasEvidence ? (doc.Evidence[0]?.url || doc.Evidence[0]) : null;
                let validEvidenceUrl = null;
                if (rawEvidenceUrl) {
                    try {
                        const u = new URL(String(rawEvidenceUrl).trim());
                        if (u.protocol === 'http:' || u.protocol === 'https:') validEvidenceUrl = u.href;
                    } catch {}
                }
                const evidenceStatusText = validEvidenceUrl ? `[Tıklayıp Görüntüle](${validEvidenceUrl})` : (hasEvidence ? "Kanıt Yüklendi (Geçersiz URL)" : "Kanıt Sunulmadı / Pas Geçildi");
                
                const punishReason = doc.Reason || "Belirtilmedi";
                
                const finalPanelBuilder = new V2PanelBuilder()
                    .addAccessory(interaction.client.user.displayAvatarURL({ extension: 'png' }), `## ${headerEmoji} ${headerText}`)
                    .addDivider(1)
                    .addText(`> ${nokta} **Ceza Numarası:** \`#${doc.No}\`\n> ${nokta} **Ceza Türü:** \`${doc.Type}\`\n> ${info} **Ceza Sebebi:** \`${punishReason}\`\n> ${userEm} **Cezalandırılan Üye:** <@${doc.Member}>\n> ${staffEm} **Cezayı Veren:** <@${doc.Staff}>\n> ${info} **Kanıt Durumu:** ${evidenceStatusText}\n> ${staffEm} **Karar Veren Denetleyici:** <@${interaction.user.id}>\n> ${timeEm} **İşlem Tarihi:** <t:${Math.floor(Date.now() / 1000)}:F>`);
                
                if (hasEvidence) {
                    finalPanelBuilder.addDivider(1);
                    finalPanelBuilder.addMediaGallery(doc.Evidence);
                }

                const finalPanel = finalPanelBuilder.toJSON();
                
                if (finalPanel.accent_color === undefined) {
                    finalPanel.accent_color = action === "approve" ? 3066993 : 15158332; // Green : Red
                } else {
                    finalPanel.accent_color = action === "approve" ? 3066993 : 15158332;
                }

                logChannel.send({ flags: [MessageFlags.IsComponentsV2 || (1<<16)], components: finalPanel }).catch((err)=>{ console.error("[EvidenceController] Log gönderilemedi:", err); });
            }
        }

        await interaction.message.delete().catch(()=>{});
        return;
    }
};

module.exports.conf = {
    name: "interactionCreate"
};
