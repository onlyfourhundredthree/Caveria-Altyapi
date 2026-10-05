const { ModalBuilder, FileUploadBuilder, LabelBuilder, MessageFlags } = require("discord.js");
const Punitives = require("../../Core/Database/Punitives");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const R2Uploader = require("../../Services/Systems/R2Uploader");
const EvidenceService = require("../../Services/Moderation/EvidenceService");

module.exports = async (interaction) => {
    if (!interaction.customId) return;

    if (interaction.customId.startsWith("evidence_skip_") || interaction.customId.startsWith("evidence_add_") || interaction.customId.startsWith("evidence_modal_")) {
        
        await interaction.deferUpdate().catch(()=>{});

        const parts = interaction.customId.split("_");
        const action = parts[1]; // skip, add, modal
        const punishNo = parseInt(parts[2]);

        try {
            const punishDoc = await Punitives.findOne({ No: punishNo });
            if (!punishDoc) {
                return interaction.followUp({ content: "İlgili ceza kaydı bulunamadı.", ephemeral: true });
            }

            if (punishDoc.Staff !== interaction.user.id) {
                return interaction.followUp({ content: "Bu cezanın kanıtını sadece cezayı veren yetkili yönetebilir.", ephemeral: true });
            }

            const emojis = ConfigManager.get("Emojis") || {};
            const iptalEmoji = emojis.toji_iptal || "❌";
            const onaySubmit = emojis.toji_onay || "✅";

            const timeElapsed = Date.now() - (punishDoc.Date || 0);
            if (timeElapsed > 300000 && punishDoc.EvidencePoolSent) {
                if (interaction.message && interaction.message.editable) {
                    await interaction.message.edit({ components: [] }).catch(()=>{});
                }
                return interaction.followUp({ content: `${iptalEmoji} 5 dakikalık kanıt sunma süresi dolduğu için bu işlem zaman aşımına uğradı.`, ephemeral: true });
            }

            if (action === "skip") {
                if (interaction.message && interaction.message.editable) {
                    await interaction.message.edit({ components: [] }).catch(()=>{});
                }

                if (!punishDoc.EvidencePoolSent) {
                    await EvidenceService.sendToPool(interaction.client, punishDoc, "skip");
                }
                return;
            }

            if (action === "add") {
                await interaction.followUp({ content: `Lütfen \`#${punishDoc.No}\` numaralı ceza için kanıt dosyanızı (resim veya video) **bu kanala** gönderin veya bağlantısını (URL) yapıştırın.\nİşlemi iptal etmek için \`iptal\` yazabilirsiniz.\n*(60 saniye süreniz var)*`, ephemeral: true });
                
                const filter = m => m.author.id === interaction.user.id;
                const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });
                
                collector.on('collect', async m => {
                    if (m.content.toLowerCase() === 'iptal') {
                        m.delete().catch(()=>{});
                        return interaction.followUp({ content: `${iptalEmoji} Kanıt yükleme işlemi iptal edildi.`, ephemeral: true });
                    }
                    
                    let attachments = Array.from(m.attachments.values());
                    let uploadedUrls = [];
                    
                    // Parse URLs in content
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    const urls = m.content.match(urlRegex) || [];
                    
                    if (attachments.length === 0 && urls.length === 0) {
                        m.delete().catch(()=>{});
                        return interaction.followUp({ content: `${iptalEmoji} Lütfen geçerli bir dosya yükleyin veya bağlantı gönderin! (İşlem iptal edildi)`, ephemeral: true });
                    }
                
                // Process attachments
                for (const att of attachments) {
                    const uploadedUrl = await R2Uploader.uploadFromDiscord(att.url, att.name || "upload", "punishment_evidence");
                    if (uploadedUrl) {
                        uploadedUrls.push({ url: uploadedUrl, date: Date.now() });
                    }
                }
                
                // Process URLs
                for (const u of urls) {
                    uploadedUrls.push({ url: u, date: Date.now() });
                }
                
                    if (uploadedUrls.length > 0) {
                        await Punitives.findOneAndUpdate(
                            { No: punishDoc.No },
                            { $push: { Evidence: { $each: uploadedUrls } } }
                        );
                        
                        if (interaction.message && interaction.message.editable) {
                            await interaction.message.edit({ components: [] }).catch(()=>{});
                        }
                        
                        await EvidenceService.sendToPool(interaction.client, punishDoc, "uploaded", uploadedUrls);
                        
                        m.delete().catch(()=>{});
                        await interaction.followUp({ content: `${onaySubmit} Kanıt başarıyla sisteme yüklendi ve denetim havuzuna gönderildi!`, ephemeral: true });
                    } else {
                        m.delete().catch(()=>{});
                        await interaction.followUp({ content: `${iptalEmoji} Dosya alınamadı veya sunucuya yüklenirken hata oluştu.`, ephemeral: true });
                    }
                });
                
                collector.on('end', (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        interaction.followUp({ content: `${iptalEmoji} Süre doldu, kanıt yükleme işlemi otomatik iptal edildi.`, ephemeral: true });
                    }
                });
                return;
            }
        } catch (error) {
            console.error("EvidenceSubmit Error:", error);
            interaction.followUp({ content: "Bir hata oluştu, lütfen konsolu kontrol edin.", ephemeral: true }).catch(()=>{});
        }
    }
};

module.exports.conf = {
    name: "interactionCreate"
};
