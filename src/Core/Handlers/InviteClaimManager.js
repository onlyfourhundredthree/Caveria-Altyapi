const MemberClaim = require("../Database/MemberClaim");
const MemberClaimSettings = require("../Database/MemberClaimSettings");
const MemberQualify = require("../Database/MemberQualify");
const XPManager = require("./XPManager");
const ConfigManager = require("./ConfigManager");
const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

class InviteClaimManager {
    static async getSettings(guildID) {
        let settings = await MemberClaimSettings.findOne({ guildID });
        if (!settings) {
            settings = await MemberClaimSettings.create({ guildID });
        }
        return settings;
    }

    static async updateLogMessage(guildID, userID) {
        const guild = global.bot?.guilds.cache.get(guildID);
        if (!guild) return;

        const claimLogId = ConfigManager.get("Channels.ClaimDropChannel");
        const logChannel = guild.channels.cache.get(claimLogId);
        if (!logChannel) return;

        let qualify = await MemberQualify.findOne({ guildID, userID });
        if (!qualify) return; // shouldn't happen but just in case

        const claims = await MemberClaim.find({ guildID, claimedID: userID });
        
        const settings = await this.getSettings(guildID);
        const targetMember = await guild.members.fetch(userID).catch(() => null);
        const emojis = ConfigManager.get("Emojis") || {};

        const hubSparkle = `${emojis.toji_hubsparkles || "✨"} `;
        const tojiOnay = emojis.toji_onay ? `${emojis.toji_onay} ` : "";
        const tojiIptal = emojis.toji_iptal ? `${emojis.toji_iptal} ` : "";
        const tojiInfo = emojis.toji_info ? `${emojis.toji_info} ` : "";

        const tojiChat = emojis.toji_chat ? `${emojis.toji_chat} ` : "💬 ";
        const tojiVoice = emojis.toji_voice ? `${emojis.toji_voice} ` : "🎙️ ";

        let voiceStr = `> ${tojiVoice}**Ses Claim:** Henüz alınmadı.`;
        let chatStr = `> ${tojiChat}**Chat Claim:** Henüz alınmadı.`;

        for (const claim of claims) {
            const staff = `<@${claim.claimerID}>`;
            let statusIcon = tojiInfo;
            if (claim.status === "COMPLETED") statusIcon = tojiOnay;
            if (["EXPIRED", "RELEASED", "CLOSED", "CANCELLED"].includes(claim.status)) statusIcon = tojiIptal;
            
            if (claim.claimType === "VOICE") {
                const xp = claim.voiceMinutes * settings.xpPerMinute;
                voiceStr = `> ${tojiVoice}**Ses Claim:** ${staff}\n> Durum: ${statusIcon} \`${claim.status}\`\n> İlerleme: \`${claim.voiceMinutes}/${settings.maxVoiceLimit}\` dk | XP: \`${xp}\``;
            } else if (claim.claimType === "CHAT") {
                const xp = claim.messageCount * settings.xpPerMessage;
                chatStr = `> ${tojiChat}**Chat Claim:** ${staff}\n> Durum: ${statusIcon} \`${claim.status}\`\n> İlerleme: \`${claim.messageCount}/${settings.maxMessageLimit}\` adet | XP: \`${xp}\``;
            }
        }

        const avatarURL = targetMember ? targetMember.user.displayAvatarURL() : (guild.iconURL() || null);
        
        const logV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: avatarURL } },
                        components: [
                            { type: 10, content: `> ## ${hubSparkle}Claim Durumu\n> -# <@${userID}> üyesi için claim kayıtları.` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `${voiceStr}` },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `${chatStr}` },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `> -# Son Güncelleme: <t:${Math.floor(Date.now() / 1000)}:R>` }
                ]
            }
        ];

        if (qualify.logMessageId) {
            try {
                const oldMsg = await logChannel.messages.fetch(qualify.logMessageId);
                if (oldMsg) {
                    await oldMsg.edit({ components: logV2, flags: [MessageFlags.IsComponentsV2] });
                    return;
                }
            } catch (e) {
                // message deleted or not found, will send a new one
            }
        }

        const newMsg = await logChannel.send({ components: logV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
        if (newMsg) {
            qualify.logMessageId = newMsg.id;
            await qualify.save();
        }
    }

    static async checkQualification(guildID, userID, type, amount) {
        const settings = await this.getSettings(guildID);
        
        let qualify = await MemberQualify.findOne({ guildID, userID });
        if (!qualify) {
            qualify = await MemberQualify.create({ guildID, userID });
        }

        if (qualify.isDropped) return;

        if (type === "VOICE") qualify.voiceMinutes += amount;
        if (type === "MESSAGE") qualify.messageCount += amount;

        if (qualify.voiceMinutes >= settings.qualifyVoice || qualify.messageCount >= settings.qualifyMessages) {
            qualify.isDropped = true;
            
            const dropChannelId = ConfigManager.get("Channels.ClaimLog");
            if (dropChannelId) {
                const guild = global.bot?.guilds.cache.get(guildID);
                const member = guild?.members.cache.get(userID);
                const dropChannel = guild?.channels.cache.get(dropChannelId);
                const emojis = ConfigManager.get("Emojis") || {};
                
                if (guild && member && dropChannel) {
                    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
                    if (Date.now() - member.joinedTimestamp <= THREE_DAYS) {
                        const tojiSparkly = emojis.toji_sparkly ? `${emojis.toji_sparkly} ` : "";
                        const hubSparkle = emojis.toji_hubsparkles ? `${emojis.toji_hubsparkles} ` : "✨ ";
                        
                        const chatBtn = {
                            type: 2,
                            style: 2,
                            custom_id: `claim_chat_${userID}`,
                            label: "Chat Claim Al"
                        };
                        if (emojis.toji_chat) {
                            const m = emojis.toji_chat.match(/<a?:.+?:(\d+)>/);
                            if (m) chatBtn.emoji = { id: m[1] };
                            else chatBtn.emoji = { name: emojis.toji_chat };
                        }
                        
                        const voiceBtn = {
                            type: 2,
                            style: 2,
                            custom_id: `claim_voice_${userID}`,
                            label: "Ses Claim Al"
                        };
                        if (emojis.toji_voice) {
                            const m = emojis.toji_voice.match(/<a?:.+?:(\d+)>/);
                            if (m) voiceBtn.emoji = { id: m[1] };
                            else voiceBtn.emoji = { name: emojis.toji_voice };
                        }

                        const dropEmbed = [
                            {
                                type: 17,
                                components: [
                                    {
                                        type: 9,
                                        accessory: { type: 11, media: { url: member.user.displayAvatarURL() } },
                                        components: [
                                            { type: 10, content: `> ## ${tojiSparkly}Yeni Üye Claimlenebilir!\n> -# <@${userID}> üyesi sunucu ön şartlarını tamamladı. Bu üyeyi claimleyerek ona yardımcı olabilir ve hedefler tamamlandığında ödül kazanabilirsiniz.` }
                                        ]
                                    },
                                    { type: 14, divider: true, spacing: 1 },
                                    { type: 10, content: `> ### ${hubSparkle}**Ön Şart İlerlemesi**\n> **Ses:** \`${qualify.voiceMinutes}\` dk / **Chat:** \`${qualify.messageCount}\` mesaj\n> **Katılım:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>` },
                                    { type: 14, divider: true, spacing: 1 },
                                    { type: 10, content: `> ### ${emojis.toji_info ? emojis.toji_info + " " : ""}**İşlem Menüsü**\n> -# Aşağıdaki butonları kullanarak üyeyi claimleyebilirsiniz.` },
                                    { type: 14, divider: true, spacing: 1 },
                                    {
                                        type: 1,
                                        components: [chatBtn, voiceBtn]
                                    }
                                ]
                            }
                        ];
                        
                        const msg = await dropChannel.send({ components: dropEmbed, flags: [32768] }).catch(() => null);
                        if (msg) {
                            qualify.dropMessageId = msg.id;
                        }
                    }
                }
            }
        }
        await qualify.save();
    }

    static async updateProgress(guildID, userID, type, amount) {
        await this.checkQualification(guildID, userID, type, amount);

        const claimType = type === "VOICE" ? "VOICE" : "CHAT";
        const claim = await MemberClaim.findOne({
            guildID: guildID,
            claimedID: userID,
            status: "ACTIVE",
            claimType: claimType
        });

        if (!claim) return;

        const settings = await this.getSettings(guildID);
        const guild = global.bot?.guilds.cache.get(guildID);
        const staffMember = guild ? await guild.members.fetch(claim.claimerID).catch(() => null) : null;
        
        let xpToGive = 0;

        if (claimType === "VOICE") {
            const availableSpace = settings.maxVoiceLimit - claim.voiceMinutes;
            const actualAmount = Math.min(amount, availableSpace);
            if (actualAmount > 0) {
                claim.voiceMinutes += actualAmount;
                xpToGive = actualAmount * settings.xpPerMinute;
            }
            if (claim.voiceMinutes >= settings.maxVoiceLimit) {
                claim.status = "COMPLETED";
            }
        } else {
            const availableSpace = settings.maxMessageLimit - claim.messageCount;
            const actualAmount = Math.min(amount, availableSpace);
            if (actualAmount > 0) {
                claim.messageCount += actualAmount;
                xpToGive = actualAmount * settings.xpPerMessage;
            }
            if (claim.messageCount >= settings.maxMessageLimit) {
                claim.status = "COMPLETED";
            }
        }

        await claim.save();

        if (xpToGive > 0 && staffMember && guild) {
            await XPManager.addXP(guild, staffMember, xpToGive, `CLAIM_DYNAMIC_REWARD: ${claim.claimedID}`);
        }

        await this.updateLogMessage(guildID, userID);

        if (claim.status === "COMPLETED") {
            if (staffMember) {
                const emojis = ConfigManager.get("Emojis") || {};
                const tojiSparkly = emojis.toji_sparkly ? `${emojis.toji_sparkly} ` : "";
                const totalXP = claimType === "VOICE" ? (claim.voiceMinutes * settings.xpPerMinute) : (claim.messageCount * settings.xpPerMessage);
                
                const notificationV2 = [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: `> ## ${tojiSparkly}${claimType} Claim Limiti Doldu!\n> -# <@${claim.claimedID}> üzerindeki claiminiz maksimum limite ulaştı ve başarıyla tamamlandı.` },
                            { type: 14, divider: true, spacing: 1 },
                            { type: 10, content: `> **Toplam Kazanılan XP:** \`${totalXP} XP\`` }
                        ]
                    }
                ];
                staffMember.send({ components: notificationV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
            }
        }
    }

    static async claimMember(guild, staffMember, targetMember, claimType) {
        const settings = await this.getSettings(guild.id);

        const activeClaimsCount = await MemberClaim.countDocuments({
            guildID: guild.id,
            claimerID: staffMember.id,
            status: "ACTIVE"
        });

        if (activeClaimsCount >= settings.maxClaims) {
            return { success: false, reason: `Maksimum claim sınırına (${settings.maxClaims}) ulaştınız.` };
        }

        const existing = await MemberClaim.findOne({
            guildID: guild.id,
            claimedID: targetMember.id,
            claimType: claimType,
            status: { $in: ["ACTIVE", "COMPLETED", "EXPIRED", "CLOSED"] }
        });

        if (existing) {
            return { success: false, reason: "Bu üye zaten başka bir yetkili tarafından bu kategoride claimlenmiş veya geçmişte claimlenmiş." };
        }

        try {
            await MemberClaim.create({
                guildID: guild.id,
                claimerID: staffMember.id,
                claimedID: targetMember.id,
                claimType: claimType
            });

            const qualify = await MemberQualify.findOne({ guildID: guild.id, userID: targetMember.id });
            if (qualify) {
                if (claimType === "VOICE") qualify.voiceClaimed = true;
                if (claimType === "CHAT") qualify.chatClaimed = true;
                
                // If both are claimed, delete the drop message
                if (qualify.voiceClaimed && qualify.chatClaimed && qualify.dropMessageId) {
                    const dropChannelId = ConfigManager.get("Channels.ClaimLog");
                    if (dropChannelId) {
                        const dropChannel = guild.channels.cache.get(dropChannelId);
                        if (dropChannel) {
                            try {
                                const msg = await dropChannel.messages.fetch(qualify.dropMessageId);
                                if (msg) await msg.delete().catch(()=>{});
                            } catch (e) {}
                        }
                    }
                    qualify.dropMessageId = null;
                }
                await qualify.save();
            }

            await this.updateLogMessage(guild.id, targetMember.id);
            return { success: true };
        } catch (err) {
            if (err.code === 11000) {
                return { success: false, reason: "Bu üye zaten claimlenmiş. (Sistemde aktif veya tamamlanmış bir kaydı bulunuyor)" };
            }
            console.error("MemberClaim Create Error:", err);
            return { success: false, reason: "Veritabanı hatası oluştu, lütfen tekrar deneyin." };
        }
    }

    static async releaseClaim(claimId, staffMember, reason) {
        const claim = await MemberClaim.findById(claimId);
        if (!claim) return { success: false, reason: "Claim bulunamadı." };
        if (claim.status !== "ACTIVE") return { success: false, reason: "Bu claim zaten aktif değil." };
        if (claim.claimerID !== staffMember.id) return { success: false, reason: "Bu claim size ait değil." };

        claim.status = "RELEASED";
        await claim.save();

        await this.updateLogMessage(claim.guildID, claim.claimedID);

        return { success: true };
    }

    static async transferClaim(claimId, staffMember, newClaimerID) {
        const claim = await MemberClaim.findById(claimId);
        if (!claim) return { success: false, reason: "Claim bulunamadı." };
        if (claim.status !== "ACTIVE") return { success: false, reason: "Bu claim zaten aktif değil." };
        if (claim.claimerID !== staffMember.id) return { success: false, reason: "Bu claim size ait değil." };

        const guild = global.bot?.guilds.cache.get(claim.guildID);
        if (!guild) return { success: false, reason: "Sunucu bulunamadı." };

        const newClaimer = await guild.members.fetch(newClaimerID).catch(() => null);
        if (!newClaimer) return { success: false, reason: "Devredilecek yetkili bulunamadı." };

        const voiceRoles = ConfigManager.get("Roles.Responsibilities.Voice") || [];
        const voiceManagerRoles = ConfigManager.get("Roles.Responsibilities.VoiceManager") || [];
        const chatRoles = ConfigManager.get("Roles.Responsibilities.Chat") || [];
        const chatManagerRoles = ConfigManager.get("Roles.Responsibilities.ChatManager") || [];

        const hasVoiceRole = [].concat(voiceRoles, voiceManagerRoles).some(r => newClaimer.roles.cache.has(r));
        const hasChatRole = [].concat(chatRoles, chatManagerRoles).some(r => newClaimer.roles.cache.has(r));

        if (claim.claimType === "VOICE" && !hasVoiceRole) {
            return { success: false, reason: "Devredilecek yetkili Ses Sorumlusu veya Ses Lideri rolüne sahip değil." };
        }
        if (claim.claimType === "CHAT" && !hasChatRole) {
            return { success: false, reason: "Devredilecek yetkili Chat Sorumlusu veya Chat Lideri rolüne sahip değil." };
        }

        const newActiveClaims = await MemberClaim.countDocuments({
            guildID: claim.guildID,
            claimerID: newClaimerID,
            status: "ACTIVE"
        });

        const settings = await this.getSettings(claim.guildID);
        if (newActiveClaims >= settings.maxClaims) {
            return { success: false, reason: `Devredilecek yetkili maksimum claim sınırına (${settings.maxClaims}) ulaşmış.` };
        }

        claim.claimerID = newClaimerID;
        await claim.save();

        await this.updateLogMessage(claim.guildID, claim.claimedID);

        return { success: true };
    }

    static async closeClaim(claimId, staffMember, reason) {
        const claim = await MemberClaim.findById(claimId);
        if (!claim) return { success: false, reason: "Claim bulunamadı." };
        if (claim.status !== "ACTIVE") return { success: false, reason: "Bu claim zaten aktif değil." };
        if (claim.claimerID !== staffMember.id) return { success: false, reason: "Bu claim size ait değil." };

        claim.status = "CLOSED";
        await claim.save();

        await this.updateLogMessage(claim.guildID, claim.claimedID);

        return { success: true };
    }

    static async cancelClaimOnLeave(guildID, claimedID) {
        const activeClaims = await MemberClaim.find({
            guildID: guildID,
            claimedID: claimedID,
            status: "ACTIVE"
        });

        for (const claim of activeClaims) {
            claim.status = "CANCELLED";
            await claim.save();
            await this.updateLogMessage(guildID, claimedID);
        }
    }

    static async checkExpirations() {
        const expirationTime = 24 * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - expirationTime);

        const expiredClaims = await MemberClaim.find({
            status: "ACTIVE",
            date: { $lt: cutoff }
        });

        for (const claim of expiredClaims) {
            claim.status = "EXPIRED";
            await claim.save();
            await this.updateLogMessage(claim.guildID, claim.claimedID);

            const guild = global.bot?.guilds.cache.get(claim.guildID);
            if (!guild) continue;

            const staffMember = await guild.members.fetch(claim.claimerID).catch(() => null);
            const targetMember = await guild.members.fetch(claim.claimedID).catch(() => null);
            const emojis = ConfigManager.get("Emojis") || {};
            const tojiIptal = emojis.toji_iptal ? `${emojis.toji_iptal} ` : "";
            const settings = await this.getSettings(claim.guildID);

            if (staffMember) {
                const totalXP = claim.claimType === "VOICE" 
                    ? (claim.voiceMinutes * settings.xpPerMinute) 
                    : (claim.messageCount * settings.xpPerMessage);

                const dmV2 = [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: `> ## ${tojiIptal}${claim.claimType} Claim Süresi Doldu\n> -# ${targetMember ? targetMember.user.tag : claim.claimedID} üzerindeki claim süreniz (24 saat) doldu ve tamamlandı kabul edilerek kapatıldı.` },
                            { type: 14, divider: true, spacing: 1 },
                            { type: 10, content: `> **Görev Süresince Kazanılan XP:** \`${totalXP} XP\`` }
                        ]
                    }
                ];
                staffMember.send({ components: dmV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
            }
        }

        // Clean up old drop messages
        const expiredDrops = await MemberQualify.find({
            isDropped: true,
            dropMessageId: { $ne: null },
            date: { $lt: cutoff }
        });

        for (const qualify of expiredDrops) {
            const dropChannelId = ConfigManager.get("Channels.ClaimLog");
            if (dropChannelId && global.bot) {
                const guild = global.bot.guilds.cache.get(qualify.guildID);
                if (guild) {
                    const dropChannel = guild.channels.cache.get(dropChannelId);
                    if (dropChannel) {
                        try {
                            const msg = await dropChannel.messages.fetch(qualify.dropMessageId);
                            if (msg) await msg.delete().catch(()=>{});
                        } catch (e) {}
                    }
                }
            }
            qualify.dropMessageId = null;
            await qualify.save();
        }
    }
}

module.exports = InviteClaimManager;
