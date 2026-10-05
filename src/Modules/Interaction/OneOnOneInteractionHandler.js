const { TextInputStyle, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const OneOnOneService = require("../../Services/Systems/OneOnOneService");
const OneOnOneAssignment = require("../../Core/Database/OneOnOneAssignment");
const OneOnOneRecord = require("../../Core/Database/OneOnOneRecord");
const OneOnOneSettings = require("../../Core/Database/OneOnOneSettings");
const OneOnOneSession = require("../../Core/Database/OneOnOneSession");
const StaffPrivateNote = require("../../Core/Database/StaffPrivateNote");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const { V2ModalBuilder } = require("../../Core/Builders/V2ModalBuilder");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

// Yardımcı Fonksiyonlar: Modal alanlarından güvenli değer alma
function getFieldValues(interaction, customId) {
    try {
        const field = interaction.fields.fields.get(customId);
        if (!field) return [];
        if (Array.isArray(field.values) && field.values.length > 0) return field.values;
        if (field.value) return [field.value];
        return [];
    } catch (e) {
        return [];
    }
}

function getTextInput(interaction, customId) {
    try {
        const textVal = interaction.fields.getTextInputValue(customId);
        if (textVal !== undefined && textVal !== null) return textVal;
    } catch (e) {}
    const fieldVals = getFieldValues(interaction, customId);
    return fieldVals[0] || "";
}

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isAnySelectMenu()) return;
    if (!interaction.customId.startsWith("1e1_")) return;

    const uid = interaction.user.id;

    // --- CANLI GÖRÜŞME BAŞLATMA ---
    if (interaction.customId.startsWith("1e1_btn_session_start_")) {
        await interaction.deferUpdate();
        
        const member = interaction.member;
        const guild = interaction.guild;

        const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
        const allRanks = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
        if (!allRanks.length) return interaction.followUp({ content: "Sistemde rütbe tanımı bulunmuyor.", flags: [MessageFlags.Ephemeral] });

        const voiceChannel = member.voice?.channel;
        if (!voiceChannel) {
            return interaction.followUp({ content: "❌ Bir 1E1 görüşmesi başlatmak için öncelikle bir yetkiliyle aynı ses kanalında olmalısınız.", flags: [MessageFlags.Ephemeral] });
        }

        let eligibleStaff = null;
        for (const [targetId, targetMember] of voiceChannel.members) {
            if (targetId === member.id) continue;
            
            let targetRankIndex = -1;
            for (let i = allRanks.length - 1; i >= 0; i--) {
                if (targetMember.roles.cache.has(allRanks[i].roleID)) {
                    targetRankIndex = i;
                    break;
                }
            }

            if (targetRankIndex >= 1 && targetRankIndex <= 10) {
                eligibleStaff = targetMember;
                break;
            }
        }

        if (!eligibleStaff) {
            return interaction.followUp({ content: "❌ Ses kanalınızda 1E1 görüşmesi yapabileceğiniz uygun bir yetkili (2.-11. Rütbe arası) bulunamadı.", flags: [MessageFlags.Ephemeral] });
        }

        const staffSession = await OneOnOneSession.findOne({ guildID: guild.id, memberID: eligibleStaff.id });
        if (staffSession) {
            return interaction.followUp({ content: `❌ <@${eligibleStaff.id}> şu anda başka bir 1E1 görüşmesinde.`, flags: [MessageFlags.Ephemeral] });
        }

        await OneOnOneSession.create({
            guildID: guild.id,
            managerID: member.id,
            memberID: eligibleStaff.id,
            channelID: voiceChannel.id,
            startTime: new Date(),
            pausedAt: null
        });

        await OneOnOneService.renderManagerPanel(interaction);
        return interaction.followUp({ content: `🎙️ <@${eligibleStaff.id}> ile **${voiceChannel.name}** kanalında canlı 1E1 görüşmesi başlatıldı!`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }

    // --- MANUEL RAPOR GİRİŞİ MODALI AÇMA ---
    if (interaction.customId.startsWith("1e1_btn_switch_admin_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "admin")) {
            return interaction.reply({ content: "❌ Bu paneli açmaya yetkiniz bulunmuyor.", flags: [MessageFlags.Ephemeral] });
        }
        await interaction.deferUpdate().catch(() => {});
        return OneOnOneService.renderAdminPanel(interaction);
    }

    if (interaction.customId.startsWith("1e1_btn_switch_manager_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "manager")) {
            return interaction.reply({ content: "❌ Bu paneli açmaya yetkiniz bulunmuyor.", flags: [MessageFlags.Ephemeral] });
        }
        await interaction.deferUpdate().catch(() => {});
        return OneOnOneService.renderManagerPanel(interaction);
    }

    if (interaction.customId.startsWith("1e1_btn_admin_manager_analysis_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "admin")) {
            return interaction.reply({ content: "❌ Bu paneli açmaya yetkiniz bulunmuyor.", flags: [MessageFlags.Ephemeral] });
        }
        await interaction.deferUpdate().catch(() => {});
        return OneOnOneService.renderManagerAnalysisPanel(interaction);
    }

    if (interaction.customId.startsWith("1e1_btn_view_staff_card_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
        const targetMemberID = interaction.customId.replace("1e1_btn_view_staff_card_", "");
        return OneOnOneService.renderStaffCard(interaction, targetMemberID);
    }

    // --- YETKİLİ NOTLARI VE KARNESİ MENÜSÜ ---
    if (interaction.customId.startsWith("1e1_btn_staff_notes_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const assignment = await OneOnOneAssignment.findOne({ guildID: interaction.guild.id, managerID: uid });
        const teamMemberIDs = assignment ? assignment.assignedMemberIDs : [];

        if (teamMemberIDs.length === 0) {
            return interaction.editReply({ content: "⚠️ Ekibinizde henüz yetkili bulunmuyor." });
        }

        const options = [];
        for (const mID of teamMemberIDs) {
            const member = await interaction.guild.members.fetch(mID).catch(() => null);
            options.push({
                label: member ? member.displayName : `ID: ${mID}`,
                value: mID,
                description: "Performans karnesini ve gizli notları görüntüle",
                emoji: "📓"
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("1e1_select_staff_to_view_card")
                .setPlaceholder("Karnesini görmek istediğiniz yetkiliyi seçin...")
                .addOptions(options)
        );

        return interaction.editReply({
            content: "📓 **Yetkili Karnesi & Gizli Notlar:** Lütfen bir yetkili seçin:",
            components: [row]
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "1e1_select_staff_to_view_card") {
        await interaction.deferUpdate().catch(() => {});
        const targetMemberID = interaction.values[0];
        return OneOnOneService.renderStaffCard(interaction, targetMemberID);
    }

    // --- GİZLİ MÜDÜR/YÖNETİCİ NOTU EKLEME MODAL ---
    if (interaction.customId.startsWith("1e1_btn_add_private_note_modal_")) {
        const targetMemberID = interaction.customId.replace("1e1_btn_add_private_note_modal_", "");

        const modalBuilder = new V2ModalBuilder()
            .setCustomId(`1e1_modal_add_private_note_${targetMemberID}`)
            .setTitle("Gizli Yönetici Notu Ekle")
            .addTextInput({
                customId: "private_note_text",
                label: "Yetkili Hakkında Gizli Değerlendirme Notunuz",
                placeholder: "Sadece yönetimin görebileceği özel gözlem, uyarı veya terfi notu...",
                style: TextInputStyle.Paragraph,
                maxLength: 1000,
                required: true
            });

        return interaction.showModal(modalBuilder.build());
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("1e1_modal_add_private_note_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const targetMemberID = interaction.customId.replace("1e1_modal_add_private_note_", "");
        const noteText = getTextInput(interaction, "private_note_text");

        if (!noteText.trim()) {
            return interaction.editReply({ content: "❌ Not boş bırakılamaz!" });
        }

        const newNote = new StaffPrivateNote({
            guildID: interaction.guild.id,
            memberID: targetMemberID,
            authorID: uid,
            note: noteText.trim()
        });
        await newNote.save();

        await interaction.editReply({ content: `🔒 <@${targetMemberID}> yetkilisine özel gizli yönetici notunuz başarıyla eklendi!` });
        return OneOnOneService.renderStaffCard(interaction, targetMemberID);
    }

    // --- CANLI SESLİ 1E1 GÖRÜŞMESİ BAŞLATMA ---
    if (interaction.customId.startsWith("1e1_btn_session_start_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "manager")) {
            return interaction.reply({ content: "❌ Bu işlemi yapmaya yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const voiceChannel = interaction.member.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                content: "❌ **Canlı 1E1 Görüşmesi Başlatılamadı:** Lütfen önce görüşme yapacağınız yetkili ile aynı ses kanalına katılın!",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const assignment = await OneOnOneAssignment.findOne({ guildID: interaction.guild.id, managerID: uid });
        const teamMemberIDs = assignment ? assignment.assignedMemberIDs : [];

        if (teamMemberIDs.length === 0) {
            return interaction.reply({ content: "⚠️ Ekibinizde henüz yetkili atanmamış.", flags: [MessageFlags.Ephemeral] });
        }

        const presentMembers = [];
        for (const mID of teamMemberIDs) {
            if (voiceChannel.members.has(mID)) {
                const member = voiceChannel.members.get(mID);
                presentMembers.push({ label: member.displayName, value: mID, emoji: "🎙️" });
            }
        }

        if (presentMembers.length === 0) {
            const allOptions = [];
            for (const mID of teamMemberIDs) {
                const member = await interaction.guild.members.fetch(mID).catch(() => null);
                allOptions.push({ label: member ? member.displayName : `ID: ${mID}`, value: mID, emoji: "👤" });
            }
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("1e1_select_session_target")
                    .setPlaceholder("Görüşeceğiniz yetkiliyi seçin...")
                    .addOptions(allOptions)
            );
            return interaction.reply({
                content: `⚠️ Şu an ses kanalınızda ekibinizden kimse tespit edilemedi. Görüşmeyi başlatmak istediğiniz yetkiliyi listeden seçebilirsiniz:`,
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
        } else if (presentMembers.length === 1) {
            const targetID = presentMembers[0].value;
            await OneOnOneSession.findOneAndUpdate(
                { guildID: interaction.guild.id, managerID: uid },
                { guildID: interaction.guild.id, managerID: uid, memberID: targetID, channelID: voiceChannel.id, startTime: new Date() },
                { upsert: true }
            );

            await interaction.reply({
                content: `🎙️ <@${targetID}> ile **${voiceChannel.name}** kanalında canlı 1E1 görüşmesi başlatıldı! Görüşme bittiğinde panelden raporu girebilirsiniz.`,
                flags: [MessageFlags.Ephemeral]
            });

            return OneOnOneService.renderManagerPanel(interaction);
        } else {
            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("1e1_select_session_target")
                    .setPlaceholder("Ses kanalındaki hangi yetkili ile görüşeceksiniz?")
                    .addOptions(presentMembers)
            );
            return interaction.reply({
                content: "🎙️ Ses kanalında birden fazla yetkili bulundu. Lütfen görüşeceğiniz yetkiliyi seçin:",
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "1e1_select_session_target") {
        await interaction.deferUpdate().catch(() => {});

        const targetID = interaction.values[0];
        const voiceChannel = interaction.member.voice?.channel;
        const channelID = voiceChannel ? voiceChannel.id : interaction.channel.id;

        await OneOnOneSession.findOneAndUpdate(
            { guildID: interaction.guild.id, managerID: uid },
            { guildID: interaction.guild.id, managerID: uid, memberID: targetID, channelID: channelID, startTime: new Date() },
            { upsert: true }
        );

        await interaction.editReply({
            content: `🎙️ <@${targetID}> yetkilisi ile canlı 1E1 görüşmesi başlatıldı!`,
            components: []
        });

        return OneOnOneService.renderManagerPanel(interaction);
    }

    // --- CANLI SESLİ 1E1 GÖRÜŞMESİ RAPOR GİRİŞİ (Komuttan Gelen) ---
    if (interaction.customId.startsWith("1e1_btn_session_finish_")) {
        // customId format: 1e1_btn_session_finish_STAFFID_MINS or 1e1_btn_session_finish_UID (old)
        const parts = interaction.customId.split("_");
        
        let targetMemberID = "";
        let elapsedMins = 0;

        if (parts.length >= 6) {
            targetMemberID = parts[4];
            elapsedMins = parseInt(parts[5]) || 0;
        } else {
            // Eski/Farklı bir kullanımsa fallback olarak DB kontrol et
            const session = await OneOnOneSession.findOne({ guildID: interaction.guild.id, managerID: uid });
            if (session) {
                elapsedMins = Math.max(1, Math.round((Date.now() - session.startTime.getTime()) / 60000));
                targetMemberID = session.memberID;
                await OneOnOneSession.deleteOne({ _id: session._id });
            }
        }

        const memberOptions = [];
        if (targetMemberID) {
            const member = await interaction.guild.members.fetch(targetMemberID).catch(() => null);
            memberOptions.push({
                label: member ? member.displayName : `ID: ${targetMemberID}`,
                value: targetMemberID,
                description: `${elapsedMins} dk sesli görüşme yapıldı`,
                emoji: "🎙️"
            });
        } else {
            return interaction.reply({ content: "Geçerli bir görüşme bulunamadı.", flags: [MessageFlags.Ephemeral] });
        }

        const statusOptions = [
            { label: "Çok İyi", value: "Çok İyi", description: "Performansı ve motivasyonu çok yüksek", emoji: "🌟" },
            { label: "İyi", value: "İyi", description: "Görevlerini sorunsuz yürütüyor", emoji: "✅" },
            { label: "Normal", value: "Normal", description: "Standart seviyede aktif", emoji: "🔹" },
            { label: "Sorunlu", value: "Sorunlu", description: "Aktivite düşüşü veya küçük sorunlar var", emoji: "⚠️" },
            { label: "Kritik", value: "Kritik", description: "Acil müdahale veya destek gerekiyor", emoji: "🚨" }
        ];

        const scoreOptions = [
            { label: "⭐⭐⭐⭐⭐ (5 Yıldız) - Mükemmel Performans", value: "5", emoji: "🌟" },
            { label: "⭐⭐⭐⭐ (4 Yıldız) - Başarılı & İstikrarlı", value: "4", emoji: "✨" },
            { label: "⭐⭐⭐ (3 Yıldız) - Ortalama / Gelişime Açık", value: "3", emoji: "🔹" },
            { label: "⭐⭐ (2 Yıldız) - Düşük Performans", value: "2", emoji: "⚠️" },
            { label: "⭐ (1 Yıldız) - Kritik Düzeyde Yetersiz", value: "1", emoji: "🚨" }
        ];

        const modalBuilder = new V2ModalBuilder()
            .setCustomId(`1e1_modal_record_submit_${elapsedMins}`)
            .setTitle(`1E1 Rapor Formu (${elapsedMins} dk Sesli)`)
            .addStringSelect({
                customId: "member_id",
                label: "Görüşme Yapılan Yetkili",
                placeholder: "Yetkili...",
                options: memberOptions,
                required: true
            })
            .addStringSelect({
                customId: "general_status",
                label: "Yetkilinin Genel Durumu",
                placeholder: "Genel durumu seçin...",
                options: statusOptions,
                required: true
            })
            .addStringSelect({
                customId: "performance_score",
                label: "Haftalık Performans Puanı (1-5 Yıldız)",
                placeholder: "Performans puanını seçin...",
                options: scoreOptions,
                required: true
            })
            .addTextInput({
                customId: "staff_condition",
                label: "Yetkili Genel Durumu & Değerlendirmeniz",
                placeholder: "Yetkilinin bu haftaki durumu, sohbet detayları ve genel izleniminiz...",
                style: TextInputStyle.Paragraph,
                maxLength: 2000,
                required: true
            })
            .addTextInput({
                customId: "manager_note",
                label: "🔒 Gizli Yönetici Notu (Opsiyonel)",
                placeholder: "Sadece üst yönetimin ve sizin görebileceğiniz özel gözlem notu...",
                style: TextInputStyle.Paragraph,
                maxLength: 1000,
                required: false
            });

        return interaction.showModal(modalBuilder.build());
    }

    // --- YÖNETİCİ: MANUEL GÖRÜŞME RAPORU GİRİŞİ (V2 ALL-IN-ONE MODAL) ---
    if (interaction.customId.startsWith("1e1_btn_record_modal_open_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "manager")) {
            return interaction.reply({ content: "❌ Bu işlemi yapmaya yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const assignment = await OneOnOneAssignment.findOne({ guildID: interaction.guild.id, managerID: uid });
        const teamMemberIDs = assignment ? assignment.assignedMemberIDs : [];

        if (teamMemberIDs.length === 0) {
            return interaction.reply({ content: "⚠️ Ekibinizde henüz yetkili atanmamış.", flags: [MessageFlags.Ephemeral] });
        }

        const weekKey = OneOnOneService.getCurrentWeekKey();
        const existingRecords = await OneOnOneRecord.find({ guildID: interaction.guild.id, weekKey: weekKey, managerID: uid });
        const doneSet = new Set(existingRecords.map(r => r.memberID));

        const memberOptions = [];
        for (const mID of teamMemberIDs) {
            const member = await interaction.guild.members.fetch(mID).catch(() => null);
            const name = member ? member.displayName : `ID: ${mID}`;
            const isDone = doneSet.has(mID);
            memberOptions.push({
                label: name.substring(0, 50),
                value: mID,
                description: isDone ? "Bu hafta raporu girildi (Düzenle)" : "Görüşme henüz yapılmadı",
                emoji: isDone ? "✅" : "⏳"
            });
        }

        const statusOptions = [
            { label: "Çok İyi", value: "Çok İyi", description: "Performansı ve motivasyonu çok yüksek", emoji: "🌟" },
            { label: "İyi", value: "İyi", description: "Görevlerini sorunsuz yürütüyor", emoji: "✅" },
            { label: "Normal", value: "Normal", description: "Standart seviyede aktif", emoji: "🔹" },
            { label: "Sorunlu", value: "Sorunlu", description: "Aktivite düşüşü veya küçük sorunlar var", emoji: "⚠️" },
            { label: "Kritik", value: "Kritik", description: "Acil müdahale veya destek gerekiyor", emoji: "🚨" }
        ];

        const scoreOptions = [
            { label: "⭐⭐⭐⭐⭐ (5 Yıldız) - Mükemmel Performans", value: "5", emoji: "🌟" },
            { label: "⭐⭐⭐⭐ (4 Yıldız) - Başarılı & İstikrarlı", value: "4", emoji: "✨" },
            { label: "⭐⭐⭐ (3 Yıldız) - Ortalama / Gelişime Açık", value: "3", emoji: "🔹" },
            { label: "⭐⭐ (2 Yıldız) - Düşük Performans", value: "2", emoji: "⚠️" },
            { label: "⭐ (1 Yıldız) - Kritik Düzeyde Yetersiz", value: "1", emoji: "🚨" }
        ];

        const modalBuilder = new V2ModalBuilder()
            .setCustomId("1e1_modal_record_submit_0")
            .setTitle("1E1 Görüşme Raporu Formu")
            .addStringSelect({
                customId: "member_id",
                label: "Görüşme Yapılan Yetkili",
                placeholder: "Görüşülen yetkiliyi seçin...",
                options: memberOptions,
                required: true
            })
            .addStringSelect({
                customId: "general_status",
                label: "Yetkilinin Genel Durumu",
                placeholder: "Genel durumu seçin...",
                options: statusOptions,
                required: true
            })
            .addStringSelect({
                customId: "performance_score",
                label: "Haftalık Performans Puanı (1-5 Yıldız)",
                placeholder: "Performans puanını seçin...",
                options: scoreOptions,
                required: true
            })
            .addTextInput({
                customId: "staff_condition",
                label: "Yetkili Genel Durumu & Değerlendirmeniz",
                placeholder: "Yetkilinin bu haftaki durumu, sohbet detayları ve genel izleniminiz...",
                style: TextInputStyle.Paragraph,
                maxLength: 2000,
                required: true
            })
            .addTextInput({
                customId: "manager_note",
                label: "🔒 Gizli Yönetici Notu (Opsiyonel)",
                placeholder: "Sadece üst yönetimin ve sizin görebileceğiniz özel gözlem notu...",
                style: TextInputStyle.Paragraph,
                maxLength: 1000,
                required: false
            });

        return interaction.showModal(modalBuilder.build());
    }

    // --- YÖNETİCİ: GÖRÜŞME RAPORU MODAL SUBMIT ---
    if (interaction.isModalSubmit() && interaction.customId.startsWith("1e1_modal_record_submit")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const parts = interaction.customId.split("_");
        const voiceMins = parseInt(parts[3]) || 0;

        const memberIDs = getFieldValues(interaction, "member_id");
        const memberID = memberIDs[0] || "";
        const statusList = getFieldValues(interaction, "general_status");
        const status = statusList[0] || "Normal";
        const scoreList = getFieldValues(interaction, "performance_score");
        const score = parseInt(scoreList[0]) || 5;

        const staffCondition = getTextInput(interaction, "staff_condition");
        const managerNote = getTextInput(interaction, "manager_note");
        const problemContent = getTextInput(interaction, "problem_content");
        const followupContent = getTextInput(interaction, "followup_content");

        if (!memberID) {
            return interaction.editReply({ content: "❌ Görüşme yapılan yetkili seçilmedi!" });
        }

        const weekKey = OneOnOneService.getCurrentWeekKey();

        const recordData = {
            guildID: interaction.guild.id,
            weekKey: weekKey,
            managerID: uid,
            memberID: memberID,
            generalStatus: status,
            performanceScore: score,
            staffCondition: staffCondition,
            managerNote: managerNote.trim(),
            problem: {
                exists: !!problemContent.trim(),
                content: problemContent.trim()
            },
            followUp: {
                required: !!followupContent.trim(),
                content: followupContent.trim(),
                status: followupContent.trim() ? "Açık" : "İptal"
            },
            voiceDurationMinutes: voiceMins,
            voiceVerified: voiceMins > 0,
            completedAt: new Date()
        };

        const existingRecord = await OneOnOneRecord.findOne({ guildID: interaction.guild.id, weekKey: weekKey, memberID: memberID });
        const isFirstTimeThisWeek = !existingRecord;

        await OneOnOneRecord.findOneAndUpdate(
            { guildID: interaction.guild.id, weekKey: weekKey, memberID: memberID },
            recordData,
            { upsert: true, new: true }
        );

        let xpMsg = "";
        if (isFirstTimeThisWeek) {
            const XPManager = require("../../Core/Handlers/XPManager");
            const settings = await OneOnOneService.getSettings(interaction.guild.id);
            const rewardXP = settings.rewardXP || 250;

            const staffMember = await interaction.guild.members.fetch(memberID).catch(() => null);
            const managerMember = interaction.member;

            if (staffMember) {
                await XPManager.addXP(interaction.guild, staffMember, rewardXP, "1E1 Görüşme Görevi (Yetkili)");
            }
            if (managerMember) {
                await XPManager.addXP(interaction.guild, managerMember, rewardXP, "1E1 Görüşme Görevi (Yönetici)");
            }
            xpMsg = `\n🎁 **Haftalık 1E1 Görevi Tamamlandı:** <@${memberID}> (+${rewardXP} XP) ve <@${uid}> (+${rewardXP} XP) ödül kazandı!`;
        }

        // Kanalına V2 log at
        await OneOnOneService.logRecordToChannel(interaction.guild, recordData);

        const voiceMsg = voiceMins > 0 ? ` (\`${voiceMins}\` dk sesli görüşme doğrulandı)` : "";

        await interaction.editReply({
            content: `✅ <@${memberID}> yetkilisi için **${weekKey}** haftası 1E1 raporunuz (**${score}/5 Yıldız**) başarıyla kaydedildi!${voiceMsg}${xpMsg}`
        }).catch(() => {});

        return OneOnOneService.renderManagerPanel(interaction);
    }

    // --- YÖNETİCİ: GEÇMİŞ RAPORLAR ---
    if (interaction.customId.startsWith("1e1_btn_manager_history_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const records = await OneOnOneRecord.find({
            guildID: interaction.guild.id,
            managerID: uid
        }).sort({ completedAt: -1 }).limit(10);

        if (records.length === 0) {
            return interaction.editReply({ content: "📚 Henüz kaydedilmiş geçmiş 1E1 raporunuz bulunmuyor." });
        }

        const lines = records.map(r => {
            const vStr = r.voiceDurationMinutes > 0 ? ` \`(${r.voiceDurationMinutes} dk sesli)\`` : "";
            const stars = "⭐".repeat(r.performanceScore || 5);
            return `> **${r.weekKey}** | <@${r.memberID}>: ${stars} \`(${r.generalStatus})\`${vStr} — *${r.staffCondition.substring(0, 60)}...*`;
        });

        const panel = new V2PanelBuilder();
        panel.addText(`> ## 📚 Son 1E1 Görüşme Raporlarınız\n> -# Son 10 rapor listelenmiştir.`);
        panel.addDivider(1);
        panel.addText(lines.join("\n"));

        return interaction.editReply({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] });
    }



    // --- YÖNETİM: ATAMA VE ÇIKARMA (V2 MODAL) ---
    if (interaction.customId.startsWith("1e1_btn_admin_assign_modal_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "admin")) {
            return interaction.reply({ content: "❌ Bu işlemi yapmaya yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const modalBuilder = new V2ModalBuilder()
            .setCustomId("1e1_modal_assign_submit")
            .setTitle("Yetkili Ata / Ekipten Çıkar")
            .addUserSelect({
                customId: "target_manager",
                label: "1E1 Yöneticisi",
                placeholder: "İşlem yapılacak yöneticiyi seçin...",
                required: true
            })
            .addUserSelect({
                customId: "target_member",
                label: "Atanacak veya Çıkarılacak Yetkili",
                placeholder: "Yetkiliyi seçin...",
                required: true
            })
            .addStringSelect({
                customId: "action_type",
                label: "İşlem Türü",
                placeholder: "Atama mı yoksa Çıkarma mı?",
                options: [
                    { label: "Ekibe Ekle / Ata", value: "add", emoji: "➕" },
                    { label: "Ekipten Çıkar", value: "remove", emoji: "➖" }
                ],
                required: true
            });

        return interaction.showModal(modalBuilder.build());
    }

    if (interaction.isModalSubmit() && interaction.customId === "1e1_modal_assign_submit") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const managers = getFieldValues(interaction, "target_manager");
        const managerID = managers[0] || "";

        const members = getFieldValues(interaction, "target_member");
        const targetMemberID = members[0] || "";

        const actions = getFieldValues(interaction, "action_type");
        const actionType = actions[0] || "add";

        if (!managerID || !targetMemberID) {
            return interaction.editReply({ content: "❌ Yönetici veya yetkili seçimi eksik yapıldı!" });
        }

        const settings = await OneOnOneService.getSettings(interaction.guild.id);

        let assignment = await OneOnOneAssignment.findOne({ guildID: interaction.guild.id, managerID: managerID });
        if (!assignment) {
            assignment = new OneOnOneAssignment({ guildID: interaction.guild.id, managerID: managerID, assignedMemberIDs: [] });
        }

        if (actionType === "add") {
            const existingAssignment = await OneOnOneAssignment.findOne({
                guildID: interaction.guild.id,
                assignedMemberIDs: targetMemberID
            });
            if (existingAssignment && existingAssignment.managerID !== managerID) {
                return interaction.editReply({
                    content: `⚠️ <@${targetMemberID}> zaten <@${existingAssignment.managerID}> yöneticisinin ekibinde yer alıyor. Bir yetkili aynı anda birden fazla ekibe eklenemez. Ekip değiştirmek için **Yetkili Taşı** butonunu kullanabilirsiniz.`
                });
            }

            if (assignment.assignedMemberIDs.length >= settings.maxQuotaPerManager) {
                return interaction.editReply({
                    content: `❌ Bu yöneticinin ekibi dolu! Maksimum kota: **${settings.maxQuotaPerManager}** yetkili.`
                });
            }

            if (assignment.assignedMemberIDs.includes(targetMemberID)) {
                return interaction.editReply({
                    content: `⚠️ <@${targetMemberID}> zaten bu yöneticinin ekibinde bulunuyor.`
                });
            }

            assignment.assignedMemberIDs.push(targetMemberID);
            assignment.history.push({
                memberID: targetMemberID,
                action: "assigned",
                date: new Date(),
                changedBy: uid
            });
            await assignment.save();

            await interaction.editReply({
                content: `✅ <@${targetMemberID}> yetkilisi başarıyla <@${managerID}> yöneticisinin ekibine eklendi!`
            });
            
            await OneOnOneService.syncSecondaryServerManager(interaction.guild, managerID);
        } else {
            assignment.assignedMemberIDs = assignment.assignedMemberIDs.filter(id => id !== targetMemberID);
            assignment.history.push({
                memberID: targetMemberID,
                action: "unassigned",
                date: new Date(),
                changedBy: uid
            });
            await assignment.save();

            await interaction.editReply({
                content: `✅ <@${targetMemberID}> yetkilisi <@${managerID}> yöneticisinin ekibinden çıkarıldı! (Geçmiş 1E1 kayıtları korundu).`
            });
            
            await OneOnOneService.syncSecondaryServerManager(interaction.guild, managerID);
        }

        return OneOnOneService.renderAdminPanel(interaction);
    }

    // --- YÖNETİM: YETKİLİ TAŞIMA / TRANSFER (V2 MODAL) ---
    if (interaction.customId.startsWith("1e1_btn_admin_transfer_modal_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "admin")) {
            return interaction.reply({ content: "❌ Bu işlemi yapmaya yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const modalBuilder = new V2ModalBuilder()
            .setCustomId("1e1_modal_transfer_submit")
            .setTitle("Yetkiliyi Başka Yöneticine Taşı")
            .addUserSelect({
                customId: "target_member",
                label: "Taşınacak Yetkili",
                placeholder: "Taşınacak yetkiliyi seçin...",
                required: true
            })
            .addUserSelect({
                customId: "new_manager",
                label: "Yeni Yönetici",
                placeholder: "Yeni yöneticiyi seçin...",
                required: true
            });

        return interaction.showModal(modalBuilder.build());
    }

    if (interaction.isModalSubmit() && interaction.customId === "1e1_modal_transfer_submit") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const members = getFieldValues(interaction, "target_member");
        const targetMemberID = members[0] || "";

        const newManagers = getFieldValues(interaction, "new_manager");
        const newManagerID = newManagers[0] || "";

        if (!targetMemberID || !newManagerID) {
            return interaction.editReply({ content: "❌ Yetkili veya yeni yönetici seçimi eksik yapıldı!" });
        }

        const settings = await OneOnOneService.getSettings(interaction.guild.id);

        const oldAssignment = await OneOnOneAssignment.findOne({ guildID: interaction.guild.id, assignedMemberIDs: targetMemberID });
        const oldManagerID = oldAssignment ? oldAssignment.managerID : null;

        if (oldManagerID === newManagerID) {
            return interaction.editReply({ content: `⚠️ <@${targetMemberID}> zaten <@${newManagerID}> yöneticisinin ekibinde!` });
        }

        let newAssignment = await OneOnOneAssignment.findOne({ guildID: interaction.guild.id, managerID: newManagerID });
        if (!newAssignment) {
            newAssignment = new OneOnOneAssignment({ guildID: interaction.guild.id, managerID: newManagerID, assignedMemberIDs: [] });
        }

        if (newAssignment.assignedMemberIDs.length >= settings.maxQuotaPerManager) {
            return interaction.editReply({
                content: `❌ Yeni yöneticinin (<@${newManagerID}>) ekibi dolu! Maksimum kota: **${settings.maxQuotaPerManager}** yetkili.`
            });
        }

        if (oldAssignment) {
            oldAssignment.assignedMemberIDs = oldAssignment.assignedMemberIDs.filter(id => id !== targetMemberID);
            oldAssignment.history.push({
                memberID: targetMemberID,
                action: "transferred_out",
                date: new Date(),
                changedBy: uid
            });
            await oldAssignment.save();
        }

        newAssignment.assignedMemberIDs.push(targetMemberID);
        newAssignment.history.push({
            memberID: targetMemberID,
            action: "transferred_in",
            date: new Date(),
            changedBy: uid
        });
        await newAssignment.save();

        await OneOnOneService.syncSecondaryServerManager(interaction.guild, newManagerID);
        if (oldManagerID) {
            await OneOnOneService.syncSecondaryServerManager(interaction.guild, oldManagerID);
        }

        const oldManagerText = oldManagerID ? `<@${oldManagerID}>` : "*Bilinmeyen Yönetici*";

        await interaction.editReply({
            content: `✅ <@${targetMemberID}> yetkilisi ${oldManagerText} yöneticisinden <@${newManagerID}> yöneticisinin ekibine başarıyla taşındı!\n-# (Yan sunucudaki kanalı silinmeden direkt yeni yönetici kategorisine aktarıldı).`
        });

        return OneOnOneService.renderAdminPanel(interaction);
    }

    // --- YÖNETİM: SİSTEM & ROL AYARLARI (V2 MODAL) ---
    if (interaction.customId.startsWith("1e1_btn_admin_settings_modal_")) {
        if (!await OneOnOneService.hasPermission(interaction.member, "admin")) {
            return interaction.reply({ content: "❌ Bu işlemi yapmaya yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const settings = await OneOnOneService.getSettings(interaction.guild.id);

        const modalBuilder = new V2ModalBuilder()
            .setCustomId("1e1_modal_settings_submit")
            .setTitle("1E1 Sistem & Rol Ayarları")
            .addRoleSelect({
                customId: "manager_roles",
                label: "1E1 Yöneticileri Rolleri (Çoklu Seçilebilir)",
                placeholder: "Yönetici rollerini seçin...",
                minValues: 1,
                maxValues: 10,
                required: true
            })
            .addChannelSelect({
                customId: "report_channel",
                label: "1E1 Rapor & Log Kanalı",
                placeholder: "Rapor kanalını seçin...",
                channelTypes: [0], // Text channel
                required: false
            })
            .addTextInput({
                customId: "max_quota",
                label: "Yönetici Başı Maksimum Yetkili Kotası",
                value: String(settings.maxQuotaPerManager || 5),
                style: TextInputStyle.Short,
                maxLength: 3,
                required: true
            })
            .addTextInput({
                customId: "reward_xp",
                label: "Haftalık 1E1 Görevi XP Ödülü (Her İki Tarafa)",
                value: String(settings.rewardXP || 250),
                style: TextInputStyle.Short,
                maxLength: 5,
                required: true
            });

        return interaction.showModal(modalBuilder.build());
    }

    if (interaction.isModalSubmit() && interaction.customId === "1e1_modal_settings_submit") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const selectedRoleIds = getFieldValues(interaction, "manager_roles");
        const selectedChannelIds = getFieldValues(interaction, "report_channel");
        const quotaStr = getTextInput(interaction, "max_quota");
        const quota = parseInt(quotaStr) || 5;
        const xpStr = getTextInput(interaction, "reward_xp");
        const rewardXP = parseInt(xpStr) || 250;

        if (selectedRoleIds.length === 0) {
            return interaction.editReply({ content: "❌ En az 1 adet 1E1 Yöneticisi rolü seçmelisiniz!" });
        }

        const updateData = {
            managerRoleIds: selectedRoleIds,
            managerRoleId: selectedRoleIds[0] || "",
            maxQuotaPerManager: Math.max(1, quota),
            rewardXP: Math.max(0, rewardXP),
            updatedAt: new Date()
        };

        if (selectedChannelIds && selectedChannelIds.length > 0) {
            updateData.reportChannelId = selectedChannelIds[0];
        }

        await OneOnOneSettings.findOneAndUpdate(
            { guildID: interaction.guild.id },
            updateData,
            { upsert: true }
        );

        const roleMentions = selectedRoleIds.map(r => `<@&${r}>`).join(", ");

        await interaction.editReply({
            content: `⚙️ **1E1 Sistem Ayarları Kaydedildi!**\n- **Yönetici Rolleri:** ${roleMentions}\n- **Maksimum Kota:** \`${Math.max(1, quota)}\``
        });

        return OneOnOneService.renderAdminPanel(interaction);
    }

    // --- ÜST YÖNETİM: TÜM AÇIK TAKİPLER ---
    if (interaction.customId.startsWith("1e1_btn_admin_all_followups_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});

        const followUps = await OneOnOneRecord.find({
            guildID: interaction.guild.id,
            "followUp.required": true,
            "followUp.status": { $in: ["Açık", "Devam Ediyor"] }
        }).sort({ completedAt: -1 }).limit(15);

        if (followUps.length === 0) {
            return interaction.editReply({ content: "✨ Sunucu genelinde açık takip konusu bulunmuyor." });
        }

        const lines = followUps.map(f => `> 📌 **${f.weekKey}** | Yönetici: <@${f.managerID}> | Yetkili: <@${f.memberID}>\n> **Konu:** ${f.followUp.content} \`[${f.followUp.status}]\``);

        const panel = new V2PanelBuilder();
        panel.addText(`> ## 📌 Sunucu Genel Açık Takip Konuları\n> -# Toplam ${followUps.length} açık takip listelenmiştir.`);
        panel.addDivider(1);
        panel.addText(lines.join("\n\n"));

        return interaction.editReply({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] });
    }
};
