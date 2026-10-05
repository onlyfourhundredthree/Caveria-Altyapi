const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StaffUser = require("../../Core/Database/StaffUser");
const StaffRank = require("../../Core/Database/StaffRank");
const TaskManager = require("../../Core/Handlers/TaskManager");
const StatHistory = require("../../Core/Database/StatHistory");
const moment = require("moment-timezone");

const activeOrientations = new Map();

class OryantasyonService {
    static async execute(context, targetUser) {
        const isInteraction = !!context.user;
        const claimerUser = isInteraction ? context.user : context.author;
        const claimerMember = context.member;
        const guild = context.guild;
        const channel = context.channel;

        const sparkles = ConfigManager.get("Emojis.toji_sparkles") || "✨";
        const hubSparkles = ConfigManager.get("Emojis.toji_hubsparkles") || "✨";
        const iptalEmoji = ConfigManager.get("Emojis.toji_iptal") || "❌";
        const onayEmoji = ConfigManager.get("Emojis.toji_onay") || "✅";

        // 1. Yetkili Alım yetkisi kontrolü
        const recruitmentRoles = ConfigManager.get("Roles.Responsibilities.Recruitment") || [];
        const recruitmentManagers = ConfigManager.get("Roles.Responsibilities.RecruitmentManager") || [];
        const allRecruitRoles = [].concat(recruitmentRoles, recruitmentManagers);

        const isRecruiter = Array.isArray(allRecruitRoles) && allRecruitRoles.length > 0
            ? allRecruitRoles.some(roleId => claimerMember.roles.cache.has(roleId))
            : (recruitmentRoles ? claimerMember.roles.cache.has(recruitmentRoles) : false);

        const isOwner = ConfigManager.isOwner(claimerMember);

        if (!isOwner && !isRecruiter) {
            const errObj = { content: `${iptalEmoji} **Hata:** Bu komutu kullanabilmek için 'Yetkili Alım' sorumluluğuna sahip olmalısınız.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        // 2. Hedef Kullanıcı Kontrolü
        if (!targetUser) {
            const errObj = { content: `${iptalEmoji} **Hata:** Lütfen oryantasyon yapacağınız yeni yetkiliyi etiketleyin. Örn: \`.oryantasyon @Kullanıcı\``, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (targetUser.bot) {
            const errObj = { content: `${iptalEmoji} **Hata:** Botlar için oryantasyon başlatamazsınız.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (targetUser.id === claimerUser.id) {
            const errObj = { content: `${iptalEmoji} **Hata:** Kendiniz için oryantasyon başlatamazsınız.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (isInteraction) {
            await context.deferReply({ flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            const errObj = { content: `${iptalEmoji} **Hata:** Belirtilen kullanıcı sunucuda bulunamadı.` };
            if (isInteraction) return context.editReply(errObj);
            return context.reply(errObj);
        }

        // 3. Yetkili Rol Kontrolü
        const recruitmentLevels = ConfigManager.get("Roles.Responsibilities.RecruitmentLevels") || [];
        const levelRoleIds = recruitmentLevels.map(r => r.value);
        const staffTeamRole = ConfigManager.get("Roles.Responsibilities.StaffTeamRole");

        const dbRanks = await StaffRank.find({ guildID: guild.id }).sort({ sortOrder: 1 });
        const dbRankRoleIds = dbRanks.map(r => r.roleID);

        const allStaffRoleIds = Array.from(new Set([...levelRoleIds, staffTeamRole, ...dbRankRoleIds].filter(Boolean)));
        const hasStaffRole = allStaffRoleIds.some(roleId => targetMember.roles.cache.has(roleId));

        if (!hasStaffRole) {
            const errObj = { content: `${iptalEmoji} **Hata:** ${targetMember.toString()} kullanıcısı yetkili kadrosunda bulunmuyor.` };
            if (isInteraction) return context.editReply(errObj);
            return context.reply(errObj);
        }

        // 4. Aktif Oturum Kontrolü (Başlatma veya Bitirme)
        const sessionKey = `${guild.id}:${claimerUser.id}:${targetMember.id}`;
        const existingSession = activeOrientations.get(sessionKey);

        if (existingSession) {
            // FINISH ORIENTATION
            const elapsedMs = Date.now() - existingSession.startedAt;
            const MIN_TIME = 3 * 60 * 1000; // 3 dakika

            if (elapsedMs < MIN_TIME) {
                const remainingSec = Math.ceil((MIN_TIME - elapsedMs) / 1000);
                const mins = Math.floor(remainingSec / 60);
                const secs = remainingSec % 60;
                const timeText = mins > 0 ? `**${mins} dakika ${secs} saniye**` : `**${secs} saniye**`;

                const errObj = {
                    flags: [MessageFlags.IsComponentsV2],
                    components: [
                        {
                            "type": 17,
                            "components": [
                                {
                                    "type": 10,
                                    "content": `> ## ${iptalEmoji} Oryantasyon Süresi Henüz Dolmadı!\n> -# **Gereken Minimum Süre:** 3 Dakika\n> -# **Kalan Süre:** ${timeText}\n\n> ⚠️ Oryantasyonun tamamlanabilmesi için en az **3 dakika** seste kalınmalıdır.`
                                }
                            ]
                        }
                    ]
                };
                if (isInteraction) return context.editReply(errObj);
                return context.reply(errObj);
            }

            // Sesteler mi kontrol et
            const claimerVoice = claimerMember.voice.channelId;
            const targetVoice = targetMember.voice.channelId;

            if (!claimerVoice || !targetVoice || claimerVoice !== targetVoice || claimerVoice !== existingSession.voiceChannelID) {
                activeOrientations.delete(sessionKey);
                const errObj = {
                    flags: [MessageFlags.IsComponentsV2],
                    components: [
                        {
                            "type": 17,
                            "components": [
                                {
                                    "type": 10,
                                    "content": `> ## ${iptalEmoji} Oryantasyon İptal Edildi\n> -# Taraflardan biri oryantasyon kanalından ayrıldığı veya başka sese geçtiği için işlem tamamlanamadı ve iptal edildi.`
                                }
                            ]
                        }
                    ]
                };
                if (isInteraction) return context.editReply(errObj);
                return context.reply(errObj);
            }

            // Başarıyla Tamamlandı
            activeOrientations.delete(sessionKey);

            try {
                await TaskManager.progressTask(guild, claimerMember, "ORIENTATION", 1);
                const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");
                await StatHistory.findOneAndUpdate(
                    { guildID: guild.id, userID: claimerUser.id, date: today },
                    { $inc: { orientations: 1 } },
                    { upsert: true, setDefaultsOnInsert: true }
                );
            } catch (err) {
                console.error("[OryantasyonService] Task progress err:", err);
            }

            const totalMins = Math.floor(elapsedMs / 60000);
            const totalSecs = Math.floor((elapsedMs % 60000) / 1000);

            const successComponents = [
                {
                    "type": 17,
                    "components": [
                        {
                            "type": 9,
                            "accessory": { "type": 11, "media": { "url": guild.iconURL({ extension: 'png', size: 1024 }) || "" } },
                            "components": [
                                {
                                    "type": 10,
                                    "content": `> ## ${sparkles} Oryantasyon Başarıyla Tamamlandı! ${onayEmoji}\n> -# **Alım Yetkilisi:** ${claimerUser.toString()} (\`${claimerUser.id}\`)\n> -# **Yeni Yetkili:** ${targetMember.toString()} (\`${targetMember.id}\`)`
                                }
                            ]
                        },
                        { "type": 14, "divider": true, "spacing": 1 },
                        {
                            "type": 10,
                            "content": `> ### ${hubSparkles} **Toplam Oryantasyon Süresi:** ${totalMins} dakika ${totalSecs} saniye\n> 📊 **Oryantasyon Görevi:** İlerleme kaydedildi (+1 Oryantasyon)!`
                        }
                    ]
                }
            ];

            if (isInteraction) return context.editReply({ flags: [MessageFlags.IsComponentsV2], components: successComponents });
            return context.reply({ flags: [MessageFlags.IsComponentsV2], components: successComponents });

        } else {
            // START NEW ORIENTATION
            const claimerVoice = claimerMember.voice.channelId;
            const targetVoice = targetMember.voice.channelId;

            if (!claimerVoice || !targetVoice || claimerVoice !== targetVoice) {
                const errObj = {
                    flags: [MessageFlags.IsComponentsV2],
                    components: [
                        {
                            "type": 17,
                            "components": [
                                {
                                    "type": 10,
                                    "content": `> ## ${iptalEmoji} Ses Kanalı Hatası!\n> -# Oryantasyon başlatabilmek için ${claimerUser.toString()} ve ${targetMember.toString()} aynı **ses kanalında** bulunmalıdır.`
                                }
                            ]
                        }
                    ]
                };
                if (isInteraction) return context.editReply(errObj);
                return context.reply(errObj);
            }

            activeOrientations.set(sessionKey, {
                guildID: guild.id,
                recruiterID: claimerUser.id,
                targetID: targetMember.id,
                voiceChannelID: claimerVoice,
                startedAt: Date.now(),
                channelID: channel.id
            });

            const startComponents = [
                {
                    "type": 17,
                    "components": [
                        {
                            "type": 9,
                            "accessory": { "type": 11, "media": { "url": claimerUser.displayAvatarURL({ extension: 'png', size: 1024 }) } },
                            "components": [
                                {
                                    "type": 10,
                                    "content": `> ## ${sparkles} Oryantasyon Başlatıldı! 🎙️\n> -# **Alım Yetkilisi:** ${claimerUser.toString()} (\`${claimerUser.id}\`)\n> -# **Yeni Yetkili:** ${targetMember.toString()} (\`${targetMember.id}\`)\n> -# **Ses Kanalı:** <#${claimerVoice}>`
                                }
                            ]
                        },
                        { "type": 14, "divider": true, "spacing": 1 },
                        {
                            "type": 10,
                            "content": `> ### ${hubSparkles} **Minimum Süre:** En az **3 Dakika** seste kalınmalıdır.\n> ⚠️ **Uyarı:** 3 dakika dolmadan taraflardan biri sesten ayrılırsa veya kanal değiştirirse oryantasyon otomatik olarak **iptal edilecektir**.\n> ⏱️ 3 dakika dolduktan sonra komutu tekrar çalıştırarak (\`.oryantasyon @Kullanıcı\`) oryantasyonu bitirebilirsiniz.`
                        }
                    ]
                }
            ];

            if (isInteraction) return context.editReply({ flags: [MessageFlags.IsComponentsV2], components: startComponents });
            return context.reply({ flags: [MessageFlags.IsComponentsV2], components: startComponents });
        }
    }

    static async handleVoiceStateUpdate(oldState, newState) {
        if (!oldState.channelId || oldState.channelId === newState.channelId) return;

        for (const [key, session] of activeOrientations.entries()) {
            if (session.guildID !== oldState.guild.id) continue;

            const isUserInSession = oldState.id === session.recruiterID || oldState.id === session.targetID;
            if (isUserInSession) {
                // Sesten tamamen çıktı veya orijinal oryantasyon kanalından başka kanala geçti
                if (!newState.channelId || newState.channelId !== session.voiceChannelID) {
                    const elapsedMs = Date.now() - session.startedAt;
                    const MIN_TIME = 3 * 60 * 1000;

                    activeOrientations.delete(key);
                    const textChannel = oldState.guild.channels.cache.get(session.channelID);

                    if (elapsedMs >= MIN_TIME) {
                        // 3 dakika dolduğu için OTOMATİK TAMAMLA
                        try {
                            const recruiterMember = await oldState.guild.members.fetch(session.recruiterID).catch(() => null);
                            if (recruiterMember) {
                                await TaskManager.progressTask(oldState.guild, recruiterMember, "ORIENTATION", 1);
                            }
                            const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");
                            await StatHistory.findOneAndUpdate(
                                { guildID: oldState.guild.id, userID: session.recruiterID, date: today },
                                { $inc: { orientations: 1 } },
                                { upsert: true, setDefaultsOnInsert: true }
                            );
                        } catch (err) {
                            console.error("[OryantasyonService] Auto finish task progress err:", err);
                        }

                        if (textChannel) {
                            const sparkles = ConfigManager.get("Emojis.toji_sparkles") || "✨";
                            const onayEmoji = ConfigManager.get("Emojis.toji_onay") || "✅";
                            const totalMins = Math.floor(elapsedMs / 60000);
                            const totalSecs = Math.floor((elapsedMs % 60000) / 1000);

                            const autoFinishPayload = {
                                flags: [MessageFlags.IsComponentsV2],
                                components: [
                                    {
                                        "type": 17,
                                        "components": [
                                            {
                                                "type": 10,
                                                "content": `> ## ${sparkles} Oryantasyon Otomatik Tamamlandı! ${onayEmoji}\n> -# <@${session.recruiterID}> ve <@${session.targetID}> arasındaki oryantasyon 3 dakikalık minimum baraj (${totalMins}dk ${totalSecs}sn) dolduktan sonra sesten ayrılındığı için başarıyla tamamlandı.\n\n> 📊 **Oryantasyon Görevi:** İlerleme kaydedildi (+1 Oryantasyon)!`
                                            }
                                        ]
                                    }
                                ]
                            };
                            textChannel.send(autoFinishPayload).catch(() => {});
                        }
                    } else {
                        // 3 dakika dolmadığı için İPTAL EDİLDİ
                        if (textChannel) {
                            const iptalEmoji = ConfigManager.get("Emojis.toji_iptal") || "❌";
                            const cancelPayload = {
                                flags: [MessageFlags.IsComponentsV2],
                                components: [
                                    {
                                        "type": 17,
                                        "components": [
                                            {
                                                "type": 10,
                                                "content": `> ## ${iptalEmoji} Oryantasyon İptal Edildi!\n> -# <@${session.recruiterID}> ve <@${session.targetID}> arasındaki oryantasyon 3 dakika dolmadan sesten ayrılındığı/kanal değiştirildiği için iptal edilmiştir.`
                                            }
                                        ]
                                    }
                                ]
                            };
                            textChannel.send(cancelPayload).catch(() => {});
                        }
                    }
                }
            }
        }
    }
}

module.exports = OryantasyonService;
