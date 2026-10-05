const { EmbedBuilder, Collection } = require("discord.js");
const client = global.bot;
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Settings = require("../../../Settings.json");

const alwaysJoined = new Collection()
const Punitives = require("../../Core/Database/Punitives");
const LastPunish = require("../../Core/Database/LastPunish");

module.exports = async () => {
    // Jail (Cezalandırılma) interval - artık sadece Punitives tablosundan okur
    setInterval(async () => {
        let Guild = client.guilds.cache.get(Settings.Main.GuildID)
        if (!Guild) return;

        let activeJails = await Punitives.find({ Type: "Cezalandırılma", Active: true }).lean();

        for (const punitive of activeJails) {
            let Member = Guild.members.cache.get(punitive.Member);

            // Süresi dolmuş ve sunucuda yok
            if (!Member && punitive.Duration && Date.now() >= punitive.Duration) {
                await Punitives.updateOne({ No: punitive.No }, { $set: { Active: false, Expried: Date.now() } });
                continue;
            }

            // Süresi dolmuş ve sunucuda var
            if (Member && punitive.Duration && Date.now() >= punitive.Duration) {
                await Punitives.updateOne({ No: punitive.No }, { $set: { Active: false, Expried: Date.now() } });
                if (ConfigManager.get("Roles.Member")) {
                    const rolesToSet = [];
                    const memberRoleID = ConfigManager.get("Roles.Member");
                    if (memberRoleID && memberRoleID.length > 5) rolesToSet.push(memberRoleID);

                    const premiumRoleId = Guild.roles.premiumSubscriberRole?.id;
                    if (premiumRoleId && Member.roles.cache.has(premiumRoleId)) {
                        rolesToSet.push(premiumRoleId);
                    }
                    if (rolesToSet.length > 0) Member.roles.set(rolesToSet).catch(err => console.error(`[CheckPunitives/Member] Rol verme hatası (User: ${Member.id}):`, err));
                }
            } else {
                // Ceza hala aktif, rolü yoksa ekle
                const jailedRoleID = ConfigManager.get("Roles.Jailed");
                if (Member && jailedRoleID && jailedRoleID.length > 5 && !Member.roles.cache.has(jailedRoleID)) {
                    const rolesToSet = [];
                    rolesToSet.push(jailedRoleID);
                    const premiumRoleId = Guild.roles.premiumSubscriberRole?.id;
                    if (premiumRoleId && Member.roles.cache.has(premiumRoleId)) {
                        rolesToSet.push(premiumRoleId);
                    }
                    Member.roles.set(rolesToSet).catch(() => { });
                }
            }
        }
    }, 30000)

    // Underworld interval - zaten Punitives kullanıyordu, aynen kalıyor
    setInterval(async () => {
        const Guild = client.guilds.cache.get(Settings.Main.GuildID);
        if (!Guild) return;

        const underworlds = await Punitives.find({ Type: "Underworld", Active: true }).lean();

        underworlds.forEach(async (punitive) => {
            const Member = Guild.members.cache.get(punitive.Member);
            if (Member && punitive.Active) {
                const underworldRole = ConfigManager.get("Roles.Underworld")
                if (underworldRole && underworldRole.length > 5 && !Member.roles.cache.has(underworldRole)) {
                    const rolesToSet = [underworldRole];
                    const premiumRoleId = Guild.roles.premiumSubscriberRole?.id;
                    if (premiumRoleId && Member.roles.cache.has(premiumRoleId)) {
                        rolesToSet.push(premiumRoleId);
                    }
                    Member.roles.set(rolesToSet).catch(err => console.error(`[CheckPunitives/Underworld] Rol verme hatası (User: ${Member.id}):`, err));
                }
            }
        });
    }, 30000);

    // Chat Mute (Metin Susturulma) interval - artık Punitives'den okur
    setInterval(async () => {
        let Guild = client.guilds.cache.get(Settings.Main.GuildID)
        if (!Guild) return;

        let activeMutes = await Punitives.find({ Type: "Metin Susturulma", Active: true }).lean();

        for (const punitive of activeMutes) {
            let Member = Guild.members.cache.get(punitive.Member);

            // Süresi dolmuş ve sunucuda yok
            if (!Member && punitive.Duration && Date.now() >= punitive.Duration) {
                await Punitives.updateOne({ No: punitive.No }, { $set: { Active: false, Expried: Date.now() } });
                continue;
            }

            // Süresi dolmuş ve sunucuda var
            if (Member && punitive.Duration && Date.now() >= punitive.Duration) {
                const mutedRoleID = ConfigManager.get("Roles.Muted");
                if (mutedRoleID && mutedRoleID.length > 5) await Member.roles.remove(mutedRoleID).catch(err => console.error(`[CheckPunitives/MuteRemove] Rol alma hatası (User: ${Member.id}):`, err));
                await Punitives.updateOne({ No: punitive.No }, { $set: { Active: false, Expried: Date.now() } });
            } else {
                // Ceza hala aktif, rolü yoksa ekle
                const mutedRoleID = ConfigManager.get("Roles.Muted");
                if (Member && mutedRoleID && mutedRoleID.length > 5 && !Member.roles.cache.has(mutedRoleID)) await Member.roles.add(mutedRoleID).catch(err => console.error(`[CheckPunitives/MuteAdd] Rol verme hatası (User: ${Member.id}):`, err));
            }
        }
    }, 30000)

    // Voice Mute (Ses Susturulma) interval - artık Punitives'den okur
    setInterval(async () => {
        let Guild = client.guilds.cache.get(Settings.Main.GuildID)
        if (!Guild) return;

        let activeVMutes = await Punitives.find({ Type: "Ses Susturulma", Active: true }).lean();

        for (const punitive of activeVMutes) {
            let Member = Guild.members.cache.get(punitive.Member);

            // Süresi dolmuş ve sunucuda yok
            if (!Member && punitive.Duration && Date.now() >= punitive.Duration) {
                await Punitives.updateOne({ No: punitive.No }, { $set: { Active: false, Expried: Date.now() } });
                continue;
            }

            // Süresi dolmuş ve sunucuda var
            if (Member && punitive.Duration && Date.now() >= punitive.Duration) {
                if (Member && Member.voice.channel && Member.voice.serverMute) await Member.voice.setMute(false).catch(err => {
                    if (err.code !== 40032) console.error(`[CheckPunitives/VoiceUnmute] Ses susturma kaldırma hatası (User: ${Member.id}):`, err);
                });
                await Punitives.updateOne({ No: punitive.No }, { $set: { Active: false, Expried: Date.now() } });
            } else {
                // Ceza hala aktif, sesi susturulmamışsa sustur
                if (Member && Member.voice.channel) {
                    if (Member.voice.channel.parentId === "1473778406200971399") continue;
                    if (!Member.voice.serverMute) {
                        await Member.voice.setMute(true).catch(err => {
                            if (err.code !== 40032) console.error(`[CheckPunitives/VoiceMute] Ses susturma hatası (User: ${Member.id}):`, err);
                        });
                    }
                }
            }
        }
    }, 30000);

    // Uyarılma süresi kontrol
    setInterval(async () => {
        try {
            const now = Date.now();
            const Guild = client.guilds.cache.get(Settings.Main.GuildID);
            if (!Guild) return;

            const activeWarnings = await Punitives.find({
                Active: true,
                Type: "Uyarılma",
                Duration: { $lte: now }
            }).lean();

            for (const warning of activeWarnings) {
                const member = Guild.members.cache.get(warning.Member);
                await Punitives.updateOne({ _id: warning._id }, { $set: { Active: false, Expried: now } });
            }
        } catch (err) {
            console.error("Uyarı süresi kontrolü sırasında hata oluştu:", err);
        }
    }, 30000);


    // Yetkili Uyarı süresi kontrol
    setInterval(async () => {
        try {
            const now = Date.now();
            const Guild = client.guilds.cache.get(Settings.Main.GuildID);
            if (!Guild) return;

            const activeWarnings = await Punitives.find({
                Active: true,
                Type: "Yetkili Uyarı",
                Duration: { $lte: now }
            }).lean();

            for (const warning of activeWarnings) {
                const member = Guild.members.cache.get(warning.Member);

                await Punitives.updateOne({ _id: warning._id }, { $set: { Active: false, Expried: now } });

                const logChannel = Guild.channels.cache.find(x => x.name === "📢yetkili-uyarı");
                if (logChannel) {
                    const fetchedMessages = await logChannel.messages.fetch({ limit: 100 });
                    const targetMsg = fetchedMessages.find(m => m.content.includes(`Ceza Numarası: ${warning.No}`));
                    if (targetMsg) await targetMsg.delete().catch(() => { });
                }
            }
        } catch (err) {
            console.error("Uyarı süresi kontrolü sırasında hata oluştu:", err);
        }
    }, 30000);

    // YENİ CEZA PUANI SİSTEMİ: 1 Ayı (30 Gün) geçen inaktif (pasif) cezaları sicilden tamamen siler.
    setInterval(async () => {
        try {
            const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 gün ms cinsinden
            const result = await Punitives.updateMany({
                Active: false,
                Date: { $lte: oneMonthAgo }
            }, { Hidden: true });

            if (result.modifiedCount > 0) {
                console.log(`[Ceza Puanı Sistemi] 1 ayı geçmiş olan ${result.modifiedCount} adet inaktif ceza başarıyla sicillerden gizlendi.`);
            }
        } catch (err) {
            console.error("1 ayı geçen cezaları temizlerken hata oluştu:", err);
        }
    }, 60 * 60 * 1000); // Saatte 1 kez kontrol etmesi yeterlidir

    // Ban Onarma (Self-Healing) interval - 10 dakikada bir (600000 ms)
    setInterval(async () => {
        try {
            const Guild = client.guilds.cache.get(Settings.Main.GuildID);
            if (!Guild) return;

            // Sunucudaki tüm banları çek
            const guildBans = await Guild.bans.fetch().catch(() => new Collection());
            
            // Veritabanındaki aktif banları bul
            const activeBans = await Punitives.find({ 
                Type: { $in: ["Yasaklama", "Kalkmaz Yasaklama"] }, 
                Active: true 
            });

            for (const banRecord of activeBans) {
                // Eğer db'de banlı gözüküyor ama sunucuda banı yoksa onar
                if (!guildBans.has(banRecord.Member)) {
                    banRecord.Active = false;
                    banRecord.Remover = client.user.id; // Bot tarafından onarıldı
                    banRecord.RemoveDate = Date.now();
                    banRecord.RemoveReason = "Sistem Tarafından Onarıldı (Ban Healing Interval)";
                    await banRecord.save();
                    console.log(`[Ban Healing] ${banRecord.Member} id'li kullanıcının aktif banı Discord'da bulunamadığı için veritabanında kapatıldı.`);
                }
            }
        } catch (err) {
            console.error("[Ban Healing] Error:", err);
        }
    }, 600000);

    // Kanıt Bekleyen Cezaları Kontrol Etme Interval (Bot yeniden başlatılırsa hafızadan silinen timeout'ları yakalar)
    setInterval(async () => {
        try {
            const Guild = client.guilds.cache.get(Settings.Main.GuildID);
            if (!Guild) return;

            const poolId = ConfigManager.get("Channels.EvidenceAuditPool");
            if (!poolId) return;

            const poolCh = await Guild.channels.fetch(poolId).catch(() => {});
            if (!poolCh) return;

            const now = Date.now();
            const fiveMinutesAgo = now - 300000;
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            const missingEvidencePunitives = await Punitives.find({
                Type: { $in: ["Uyarılma", "Ses Susturulma", "Metin Susturulma", "Cezalandırılma", "Yasaklama", "Kalkmaz Yasaklama"] },
                Evidence: { $size: 0 },
                $or: [
                    { Date: { $lte: fiveMinutesAgo, $gte: oneDayAgo } },
                    { RemoveDate: { $lte: fiveMinutesAgo, $gte: oneDayAgo } }
                ]
            }).lean();

            if (missingEvidencePunitives.length === 0) return;

            const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
            const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
            
            const controllers = ConfigManager.get("Roles.PunishmentControllers") || [];
            const controllerMentions = controllers.map(r => `<@&${r}>`).join(" ");
            
            const emojis = ConfigManager.get("Emojis") || {};
            const uyari = emojis.toji_uyari || "⚠️";
            const nokta = emojis.toji_nokta || "•";
            const info = emojis.toji_info || "ℹ️";
            const userEm = emojis.toji_user || "👤";
            const staffEm = emojis.toji_staff || "🛡️";
            const timeEm = emojis.toji_time || "🕒";

            for (const punishDoc of missingEvidencePunitives) {
                await Punitives.updateOne({ No: punishDoc.No }, { $set: { Evidence: ["ZAMAN_ASIMI"] } });

                const targetStaffId = punishDoc.Remover || punishDoc.Staff;
                const isRemoved = !punishDoc.Active || punishDoc.Remover;
                const staffMember = await Guild.members.fetch(targetStaffId).catch(() => null);
                const staffAvatar = staffMember ? staffMember.user.displayAvatarURL({ extension: 'png' }) : client.user.displayAvatarURL();
                const staffMention = staffMember ? staffMember.toString() : `<@${targetStaffId}>`;

                const pRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`evidence_audit_take_${punishDoc.No}`).setLabel("İlgilen").setStyle(ButtonStyle.Primary)
                );
                
                const titleStr = isRemoved 
                    ? `## ${uyari} Yeni Denetim İşi (Ceza Kaldırma - Zaman Aşımı / Kanıtsız)`
                    : `## ${uyari} Yeni Denetim İşi (Zaman Aşımı / Kanıtsız)`;

                const statusStr = isRemoved
                    ? `> ${info} **Durum:** Yetkili, **ceza kaldırma** işlemi için **5 dakika** içinde kanıt sunmadı (Sistem Kontrolü).`
                    : `> ${info} **Durum:** Yetkili, **5 dakika** içinde kanıt sunmadı (Sistem Kontrolü).`;

                const pPanel = new V2PanelBuilder()
                    .addAccessory(staffAvatar, titleStr)
                    .addDivider(1)
                    .addText(`${statusStr}\n> ${nokta} **Ceza Numarası:** \`#${punishDoc.No}\`\n> ${nokta} **Ceza Türü:** \`${punishDoc.Type}${isRemoved ? " (Kaldırıldı)" : ""}\`\n> ${userEm} **Kullanıcı:** <@${punishDoc.Member}>\n> ${staffEm} **Yetkili:** ${staffMention}\n> ${timeEm} **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>`);
                pPanel.addActionRow(pRow);
                
                await poolCh.send({ content: `${staffMention} ` + controllerMentions, flags: [MessageFlags.IsComponentsV2 || (1<<16)], components: pPanel.toJSON() }).catch(()=>{});
            }
        } catch (err) {
            console.error("[CheckPunitives/EvidenceAudit] Kanıt denetim kontrolü sırasında hata:", err);
        }
    }, 60000);
};
