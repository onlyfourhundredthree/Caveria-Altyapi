const { MessageFlags, AuditLogEvent } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StaffUser = require("../../Core/Database/StaffUser");
const StaffRank = require("../../Core/Database/StaffRank");
const TaskManager = require("../../Core/Handlers/TaskManager");
const StatHistory = require("../../Core/Database/StatHistory");
const moment = require("moment-timezone");

class YtClaimService {
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

        // 2. Hedef Kullanıcı Kontrolleri
        if (!targetUser) {
            const errObj = { content: `${iptalEmoji} **Hata:** Lütfen claimlemek istediğiniz yetkiliyi etiketleyin veya ID'sini girin.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (targetUser.bot) {
            const errObj = { content: `${iptalEmoji} **Hata:** Botları claimleyemezsiniz.`, flags: [MessageFlags.Ephemeral] };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (targetUser.id === claimerUser.id) {
            const errObj = { content: `${iptalEmoji} **Hata:** Kendinizi claimleyemezsiniz.`, flags: [MessageFlags.Ephemeral] };
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

        // 3. Yetkili Olup Olmadığını Kontrol Et (1. yetki rolü kontrolü)
        const recruitmentLevels = ConfigManager.get("Roles.Responsibilities.RecruitmentLevels") || [];
        const levelRoleIds = recruitmentLevels.map(r => r.value);
        const staffTeamRole = ConfigManager.get("Roles.Responsibilities.StaffTeamRole");

        const dbRanks = await StaffRank.find({ guildID: guild.id }).sort({ sortOrder: 1 });
        const dbRankRoleIds = dbRanks.map(r => r.roleID);

        const allStaffRoleIds = Array.from(new Set([...levelRoleIds, staffTeamRole, ...dbRankRoleIds].filter(Boolean)));

        const hasStaffRole = allStaffRoleIds.some(roleId => targetMember.roles.cache.has(roleId));

        if (!hasStaffRole) {
            const errObj = { content: `${iptalEmoji} **Hata:** ${targetMember.toString()} kullanıcısı henüz yetkili kadrosunda değil! Sadece 1. yetkiyi almış yeni yetkililer claimlenebilir.` };
            if (isInteraction) return context.editReply(errObj);
            return context.reply(errObj);
        }

        // 4. StaffUser DB ve Claim Durum Kontrolü
        let targetData = await StaffUser.findOne({ guildID: guild.id, userID: targetMember.id });
        if (!targetData) {
            targetData = await StaffUser.create({ guildID: guild.id, userID: targetMember.id, staffStartAt: new Date() });
        }

        if (targetData.claimedBy) {
            const errObj = { content: `${iptalEmoji} **Hata:** ${targetMember.toString()} kullanıcısı daha önce <@${targetData.claimedBy}> tarafından claimlenmiş!` };
            if (isInteraction) return context.editReply(errObj);
            return context.reply(errObj);
        }

        // 5. 6 Saatlik Zaman Dilimi Kontrolü
        let startAt = targetData.staffStartAt;
        if (!startAt) {
            try {
                const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 10 }).catch(() => null);
                if (logs) {
                    const entry = logs.entries.find(e => e.target?.id === targetMember.id && e.changes?.some(c => c.key === '$add' && c.new?.some(r => allStaffRoleIds.includes(r.id))));
                    if (entry) {
                        startAt = entry.createdAt;
                    }
                }
            } catch (err) { }

            if (!startAt) {
                startAt = new Date();
            }
            targetData.staffStartAt = startAt;
            await targetData.save();
        }

        const SIX_HOURS = 6 * 60 * 60 * 1000;
        const timeDiff = Date.now() - new Date(startAt).getTime();

        if (timeDiff > SIX_HOURS) {
            const hoursPassed = Math.floor(timeDiff / (1000 * 60 * 60));
            const errObj = { content: `${iptalEmoji} **Hata:** ${targetMember.toString()} kullanıcısının yetkiye alınmasının üzerinden **${hoursPassed} saat** geçmiş! (Claim işlemi sadece ilk 6 saat içerisinde yapılabilir.)` };
            if (isInteraction) return context.editReply(errObj);
            return context.reply(errObj);
        }

        // 6. Onay İsteği Gönder (Interactive V2 Component)
        const claimerAvatar = claimerUser.displayAvatarURL({ extension: 'png', size: 1024 });
        const requestComponents = [
            {
                "type": 17,
                "components": [
                    {
                        "type": 9,
                        "accessory": { "type": 11, "media": { "url": claimerAvatar } },
                        "components": [
                            {
                                "type": 10,
                                "content": `> ## ${sparkles} Yetkili Alım Doğrulama (Claim Request)\n> -# **Alım Yapan Yetkili:** ${claimerUser.toString()} (\`${claimerUser.id}\`)\n> -# **Aday:** ${targetMember.toString()} (\`${targetMember.id}\`)`
                            }
                        ]
                    },
                    { "type": 14, "divider": true, "spacing": 2 },
                    {
                        "type": 10,
                        "content": `> ### ${hubSparkles} Merhaba ${targetMember.toString()},\n> **${claimerMember.displayName}** sizi yetkili ekibine aldığını söylüyor ve yetkili alımınızı **claimlemek** istiyor.\n\n> Bu bilgiyi onaylıyor musunuz?`
                    },
                    {
                        "type": 1,
                        "components": [
                            { "type": 2, "style": 3, "label": "Onayla", "custom_id": `ytclaim_accept_${targetMember.id}_${claimerUser.id}` },
                            { "type": 2, "style": 4, "label": "Reddet", "custom_id": `ytclaim_reject_${targetMember.id}_${claimerUser.id}` }
                        ]
                    }
                ]
            }
        ];

        let msg;
        if (isInteraction) {
            msg = await context.editReply({ flags: [MessageFlags.IsComponentsV2], components: requestComponents }).catch(() => null);
        } else {
            msg = await context.reply({ flags: [MessageFlags.IsComponentsV2], components: requestComponents }).catch(() => null);
        }

        if (!msg) return;

        // 7. Buton Collector
        const filter = i => i.user.id === targetMember.id && (i.customId.startsWith("ytclaim_accept_") || i.customId.startsWith("ytclaim_reject_"));
        const collector = channel.createMessageComponentCollector({ filter, time: 120000, max: 1 });

        collector.on("collect", async i => {
            if (i.customId.startsWith("ytclaim_accept_")) {
                await i.deferUpdate().catch(() => {});

                // Target DB güncelle
                await StaffUser.findOneAndUpdate(
                    { guildID: guild.id, userID: targetMember.id },
                    { $set: { claimedBy: claimerUser.id, claimedAt: new Date(), isClaimable: false } },
                    { upsert: true }
                );

                // Claimer yetkili alım görevini güncelle (Sadece görev ilerlemesi verilir, doğrudan ek XP verilmez)
                try {
                    await TaskManager.progressTask(guild, claimerMember, "RECRUIT", 1);

                    const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");
                    await StatHistory.findOneAndUpdate(
                        { guildID: guild.id, userID: claimerUser.id, date: today },
                        { $inc: { staffRecruits: 1 } },
                        { upsert: true, setDefaultsOnInsert: true }
                    );
                } catch (err) {
                    console.error("[YtClaimService] Stat/Task update error:", err);
                }

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
                                        "content": `> ## ${sparkles} Yetkili Alımı Doğrulandı! ${onayEmoji}\n> -# **Alım Yapan:** ${claimerUser.toString()} (\`${claimerUser.id}\`)\n> -# **Claimlenen:** ${targetMember.toString()} (\`${targetMember.id}\`)`
                                    }
                                ]
                            },
                            { "type": 14, "divider": true, "spacing": 1 },
                            {
                                "type": 10,
                                "content": `> ### ${hubSparkles} **${targetMember.displayName}**, ${claimerUser.toString()} tarafından yetkili alımı doğrulandı ve claim kaydedildi!\n> 📊 **Yetkili Alım Görevi:** İlerleme eklendi (+1 Alım)`
                            }
                        ]
                    }
                ];

                await i.editReply({ components: successComponents }).catch(() => {});
            } else if (i.customId.startsWith("ytclaim_reject_")) {
                await i.update({
                    components: [
                        {
                            "type": 17,
                            "components": [
                                {
                                    "type": 10,
                                    "content": `> ## ${iptalEmoji} Claim Reddedildi\n> -# ${targetMember.toString()}, ${claimerUser.toString()} kullanıcısının yetkili alım doğrulama isteğini reddetti.`
                                }
                            ]
                        }
                    ]
                }).catch(() => {});
            }
        });

        collector.on("end", collected => {
            if (collected.size === 0) {
                if (msg) {
                    msg.edit({
                        components: [
                            {
                                "type": 17,
                                "components": [
                                    {
                                        "type": 10,
                                        "content": `> ## ⌛ Süre Doldu\n> -# Yetkili alım claim doğrulama isteği yanıtlanmadığı için zaman aşımına uğradı.`
                                    }
                                ]
                            }
                        ]
                    }).catch(() => {});
                }
            }
        });
    }
}

module.exports = YtClaimService;
