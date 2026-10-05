const { PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

const actionLimits = new Map();

class ModerationService {
    /**
     * Moderasyon işlemlerinde genel geçerlilik ve yetki kontrollerini yapar.
     * @param {Object} ctx - Message veya Interaction objesi
     * @param {Object} targetUser - İşlem yapılacak kullanıcının User objesi
     * @param {String} requiredRoleConfig - Yetki kontrolü için ConfigManager yolu (Örn: "Roles.Ban_Staff")
     * @param {Number} limitCount - 5 dakika içinde uygulanabilecek maksimum işlem sayısı (Varsayılan: 10)
     * @returns {Promise<Boolean|Object>} - İşlem geçerliyse objeyi (hedef üye) döner, geçersizse hatayı mesajla atıp false döner.
     */
    static async validatePunishmentAction(ctx, targetUser, requiredRoleConfig, limitCount = 10) {
        if (!targetUser) {
            this.sendError(ctx, "Lütfen geçerli bir kullanıcı belirtin.");
            return false;
        }

        const guild = ctx.guild;
        const staff = ctx.member;
        const targetId = targetUser.id;
        
        const isGuildMember = guild.members.cache.has(targetId);
        const guildMember = isGuildMember ? guild.members.cache.get(targetId) : null;
        
        // Kendi kendine işlem kontrolü
        if (staff.id === targetId) {
            this.sendError(ctx, "Kendinize işlem uygulayamazsınız.");
            return false;
        }

        // Bot kontrolü
        if (targetUser.bot) {
            this.sendError(ctx, "Botlara işlem uygulayamazsınız.");
            return false;
        }

        const isOwner = ConfigManager.isOwner(staff);
        const isAdmin = staff.permissions.has(PermissionsBitField.Flags.Administrator);

        // Yetki ve Limit kontrolleri
        if (!isOwner) {
            const allowedRoles = ConfigManager.get(requiredRoleConfig) || [];
            const hasRole = allowedRoles.some(roleId => staff.roles.cache.has(roleId));

            if (!isAdmin && !hasRole) {
                // Sessizce reddet (Yetkisi olmayan biri komutu denedi)
                return false;
            }

            // Hiyerarşi kontrolü (Sadece sunucudaysa)
            if (isGuildMember && staff.roles.highest.position <= guildMember.roles.highest.position) {
                this.sendError(ctx, "Sizinle aynı veya üst yetkideki bir kullanıcıya işlem uygulayamazsınız.");
                return false;
            }

            // Limit Kontrolü (Sadece Admin olmayanlar için)
            if (!isAdmin) {
                const currentLimit = Number(actionLimits.get(staff.id) || 0);
                if (currentLimit >= limitCount) {
                    this.sendError(ctx, "Ceza uygulama limitiniz dolmuş. Lütfen 5 dakika bekleyin.");
                    return false;
                }
                
                // Limiti artır ve 5 dakika sonra düşür
                actionLimits.set(staff.id, currentLimit + 1);
                setTimeout(() => {
                    actionLimits.set(staff.id, Math.max(0, Number(actionLimits.get(staff.id) || 1) - 1));
                }, 1000 * 60 * 5);
            }
        }

        // Botun hedef kullanıcıya müdahale yetkisi kontrolü
        if (isGuildMember && !guildMember.manageable) {
            this.sendError(ctx, "Botun yetkisi bu kullanıcıya işlem uygulamak için yetersiz. (Rolüm hedefin altında olabilir)");
            return false;
        }

        return { guildMember, targetId };
    }

    static deleteTriggerMessage(ctx) {
        if (ctx.isCommand && ctx.isCommand()) return; // Slash command
        if (ctx.deletable) {
            ctx.delete().catch(() => {});
        }
    }

    static sendError(ctx, msgText) {
        if (ctx.isCommand && ctx.isCommand()) {
            ctx.reply({ content: msgText, flags: [MessageFlags.Ephemeral] }).catch(() => {});
        } else {
            if (ctx.channel) {
                ctx.channel.send(msgText).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
            }
            this.deleteTriggerMessage(ctx);
        }
    }

    static async handleBan(ctx, targetUser, reason) {
        const validation = await this.validatePunishmentAction(ctx, targetUser, "Roles.Ban_Staff");
        if (!validation) return; 

        const { targetId } = validation;
        const Punitives = require("../../Core/Database/Punitives");

        let Ceza = await Punitives.findOne({ Member: targetId, Type: "Underworld", Active: true }).lean();
        if (Ceza) {
            return this.sendError(ctx, `⚠️ Belirtilen <@${targetId}> isimli üyenin aktif bir **Underworld** cezası bulunmakta.`);
        }

        let JailKontrol = await Punitives.findOne({ Member: targetId, Type: "Cezalandırılma", Active: true }).lean();
        if (JailKontrol) {
            await Punitives.updateOne({ No: JailKontrol.No }, { $set: { "Active": false, Expried: Date.now(), Remover: ctx.member.id, Reason: "Underworld'e Çevrildi!" } });
        }

        let target = ctx.guild.members.cache.get(targetId) || await ctx.client.users.fetch(targetId).catch(()=>null);
        if (target && target.addPunitives) {
            await target.addPunitives(8, ctx.member, reason, ctx);
        } else if (target) {
            const tempMember = await ctx.guild.members.fetch(targetId).catch(()=>null);
            if (tempMember && tempMember.addPunitives) await tempMember.addPunitives(8, ctx.member, reason, ctx);
        }
        
        this.deleteTriggerMessage(ctx);
    }

    static async handleJail(ctx, targetUser, reason, duration) {
        const validation = await this.validatePunishmentAction(ctx, targetUser, "Roles.Jail_Staff");
        if (!validation) return; 

        const { targetId } = validation;
        const Punitives = require("../../Core/Database/Punitives");

        let Ceza = await Punitives.findOne({ Member: targetId, Type: { $in: ["Cezalandırılma", "Underworld"] }, Active: true }).lean();
        if (Ceza) {
            return this.sendError(ctx, `⚠️ Belirtilen <@${targetId}> isimli üyenin aktif bir **${Ceza.Type}** cezası bulunmakta.`);
        }

        let target = ctx.guild.members.cache.get(targetId) || await ctx.client.users.fetch(targetId).catch(()=>null);
        if (target && target.addPunitives) {
            await target.addPunitives(3, ctx.member, reason, ctx, duration);
        } else if (target) {
            const tempMember = await ctx.guild.members.fetch(targetId).catch(()=>null);
            if (tempMember && tempMember.addPunitives) await tempMember.addPunitives(3, ctx.member, reason, ctx, duration);
        }
        
        this.deleteTriggerMessage(ctx);
    }

    static async handleEventJail(ctx, targetUser, reason, duration) {
        const eventStaffRoles = [].concat(
            ConfigManager.get("Roles.Responsibilities.EventManage") || [],
            ConfigManager.get("Roles.Responsibilities.EventManager") || []
        );

        const isOwner = ConfigManager.isOwner(ctx.member);
        const hasPerm = isOwner || (Array.isArray(eventStaffRoles) && eventStaffRoles.some(r => ctx.member.roles.cache.has(r)));

        if (!hasPerm) {
            return this.sendError(ctx, "Bu komutu kullanmak için 'Etkinlik Sorumlusu' yetkisine sahip olmalısınız.");
        }

        const targetId = targetUser.id || targetUser;
        const Punitives = require("../../Core/Database/Punitives");

        let Ceza = await Punitives.findOne({ Member: targetId, Type: "Etkinlik Cezalı", Active: true }).lean();
        if (Ceza) {
            return this.sendError(ctx, `⚠️ Belirtilen <@${targetId}> isimli üyenin aktif bir **Etkinlik Cezalı** cezası bulunmakta.`);
        }

        let target = ctx.guild.members.cache.get(targetId) || await ctx.guild.members.fetch(targetId).catch(() => null);
        if (target && target.addPunitives) {
            await target.addPunitives(9, ctx.member, reason || "Etkinlik kural ihlali", ctx, duration);
        }

        this.deleteTriggerMessage(ctx);
    }

    static async handleUnEventJail(ctx, targetUser) {
        const eventStaffRoles = [].concat(
            ConfigManager.get("Roles.Responsibilities.EventManage") || [],
            ConfigManager.get("Roles.Responsibilities.EventManager") || []
        );

        const isOwner = ConfigManager.isOwner(ctx.member);
        const hasPerm = isOwner || (Array.isArray(eventStaffRoles) && eventStaffRoles.some(r => ctx.member.roles.cache.has(r)));

        if (!hasPerm) {
            return this.sendError(ctx, "Bu komutu kullanmak için 'Etkinlik Sorumlusu' yetkisine sahip olmalısınız.");
        }

        const targetId = targetUser.id || targetUser;
        const Punitives = require("../../Core/Database/Punitives");

        let Ceza = await Punitives.findOne({ Member: targetId, Type: "Etkinlik Cezalı", Active: true });
        if (!Ceza) {
            return this.sendError(ctx, `⚠️ Belirtilen <@${targetId}> isimli üyenin aktif bir **Etkinlik Cezalı** cezası bulunmamakta.`);
        }

        Ceza.Active = false;
        Ceza.Remover = ctx.member.id;
        Ceza.RemoveDate = new Date();
        await Ceza.save();

        let targetMember = ctx.guild.members.cache.get(targetId) || await ctx.guild.members.fetch(targetId).catch(() => null);
        let ejRoleId = ConfigManager.get("Roles.EventJail") || ConfigManager.get("Roles.EventCezali");
        if (Array.isArray(ejRoleId)) ejRoleId = ejRoleId[0];
        if (typeof ejRoleId === "string") ejRoleId = ejRoleId.trim();

        if (targetMember && ejRoleId && targetMember.roles.cache.has(ejRoleId)) {
            await targetMember.roles.remove(ejRoleId).catch(() => {});
        }

        const onayEmoji = ConfigManager.get("Emojis.toji_onay") || "✅";
        const replyPayload = {
            flags: [MessageFlags.IsComponentsV2],
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## ${onayEmoji} Etkinlik Cezası Kaldırıldı\n> -# <@${targetId}> kullanıcısının **Etkinlik Cezalı** cezası <@${ctx.member.id}> tarafından kaldırıldı.`
                        }
                    ]
                }
            ]
        };

        if (ctx.reply) await ctx.reply(replyPayload);
        this.deleteTriggerMessage(ctx);
    }
    static async handleWarn(ctx, targetUser, reason) {
        const validation = await this.validatePunishmentAction(ctx, targetUser, "Roles.Warn_Staff", 10);
        if (!validation) return;

        const { guildMember } = validation;
        if (!guildMember) {
            return this.sendError(ctx, "Uyarmak istediğiniz kullanıcı sunucuda bulunamadı.");
        }

        if (!reason) {
            return this.sendError(ctx, "Kullanıcıyı uyarmadan önce bir sebep belirtmelisiniz.");
        }

        const Punitives = require("../../Core/Database/Punitives");

        // Specific staff role ID for "Yetkili Uyarı"
        const staffTeamRole = ConfigManager.get("Roles.Responsibilities.StaffTeamRole");
        if (guildMember.roles.cache.has(staffTeamRole)) {
            await guildMember.addPunitives(7, ctx.member, reason, ctx, "30d");
        } else {
            const hasWarn = await Punitives.countDocuments({ Member: guildMember.id, Type: { $in: ["Uyarılma", "Yetkili Uyarı", "Sözlü Uyarı"] } });
            if (hasWarn === 0) {
                await guildMember.addPunitives(10, ctx.member, reason, ctx, "14d");
            } else {
                await guildMember.addPunitives(6, ctx.member, reason, ctx, "14d");
            }
        }
        
        this.deleteTriggerMessage(ctx);
    }

    static async handleTopluUyari(ctx, targetUsers, reason) {
        if (!targetUsers || targetUsers.length === 0) {
            return this.sendError(ctx, "En az bir kullanıcı belirtmelisiniz.");
        }

        if (!reason) {
            return this.sendError(ctx, "Kullanıcıları uyarmadan önce bir sebep belirtmelisiniz.");
        }

        const staff = ctx.member;
        const isOwner = ConfigManager.isOwner(staff);
        const isAdmin = staff.permissions.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = ConfigManager.get("Roles.Warn_Staff") || [];
        const hasRole = allowedRoles.some(roleId => staff.roles.cache.has(roleId));

        if (!isOwner && !isAdmin && !hasRole) return;

        let successCount = 0;
        let failedCount = 0;

        let statusMsg;
        if (ctx.isCommand && ctx.isCommand()) {
            await ctx.deferReply();
            statusMsg = ctx;
        } else {
            statusMsg = await ctx.reply(`İşlem başlatılıyor... Lütfen bekleyin.`);
        }

        for (const targetUser of targetUsers) {
            const validation = await this.validatePunishmentAction({ ...ctx, reply: () => Promise.resolve() }, targetUser, "Roles.Warn_Staff", 50);
            if (!validation) {
                failedCount++;
                continue;
            }

            const { guildMember } = validation;
            if (!guildMember) {
                failedCount++;
                continue;
            }

            try {
                const staffTeamRole = ConfigManager.get("Roles.Responsibilities.StaffTeamRole");
                if (guildMember.roles.cache.has(staffTeamRole)) {
                    await guildMember.addPunitives(7, staff, reason, ctx, "30d");
                } else {
                    await guildMember.addPunitives(6, staff, reason, ctx, "14d");
                }
                successCount++;
            } catch (err) {
                console.error(`Failed to warn user ${guildMember.id}:`, err);
                failedCount++;
            }
        }

        let resultMsg = `İşlem tamamlandı.\n`;
        if (successCount > 0) {
            resultMsg += `${ConfigManager.get("Emojis.toji_onay") || "✨"} **Başarılı:** ${successCount} kullanıcı\n`;
        }
        if (failedCount > 0) {
            resultMsg += `${ConfigManager.get("Emojis.toji_iptal") || "✨"} **Başarısız/Atlanan:** ${failedCount} kullanıcı`;
        }

        if (ctx.isCommand && ctx.isCommand()) {
            await ctx.editReply({ content: resultMsg });
        } else if (statusMsg.edit) {
            statusMsg.edit(resultMsg).catch(() => ctx.channel.send(resultMsg));
        }
    }
    static async handleUnban(ctx, targetUser) {
        // We use validatePunishmentAction but we don't strictly require the member to be in the server for unban
        const staff = ctx.member;
        const isOwner = ConfigManager.isOwner(staff);
        const isAdmin = staff.permissions.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = ConfigManager.get("Roles.Ban_Staff") || [];
        const hasRole = allowedRoles.some(roleId => staff.roles.cache.has(roleId));

        if (!isOwner && !isAdmin && !hasRole) {
            return this.sendError(ctx, "Bu komutu kullanmak için yetkiniz yok.");
        }

        if (!targetUser) {
            return this.sendError(ctx, "Bir kullanıcı veya ID belirtmelisiniz.");
        }

        const targetId = targetUser.id;
        if (targetId === staff.id) {
            return this.sendError(ctx, "Kendinize işlem uygulayamazsınız.");
        }

        let isGuildMember = ctx.guild.members.cache.has(targetId);
        let guildMember = isGuildMember ? ctx.guild.members.cache.get(targetId) : null;
        let target = guildMember || targetUser;

        if (!isOwner) {
            if (isGuildMember && staff.roles.highest.position <= guildMember.roles.highest.position) {
                return this.sendError(ctx, "Bu kullanıcıya işlem uygulayamazsınız.");
            }
        }

        const Punitives = require("../../Core/Database/Punitives");
        const res = await Punitives.findOne({ Member: targetId, Type: { $in: ["Underworld", "Yasaklama"] }, Active: true });

        if (!res) {
            try {
                const isBanned = await ctx.guild.bans.fetch(targetId);
                if (isBanned) {
                    await ctx.guild.members.unban(targetId, `Yetkili: ${staff.user.tag} tarafından kaldırıldı.`);
                    this.deleteTriggerMessage(ctx);
                    if (ctx.isCommand && ctx.isCommand()) {
                        return ctx.reply({ content: `Veritabanında aktif ceza bulunamadı ancak kullanıcının Discord üzerindeki yasaklaması kaldırıldı.` });
                    } else {
                        return ctx.reply(`Veritabanında aktif ceza bulunamadı ancak kullanıcının Discord üzerindeki yasaklaması kaldırıldı.`);
                    }
                }
            } catch (e) {}

            return this.sendError(ctx, `⚠️ <@${targetId}> isimli üyenin **Aktif** (Underworld veya Yasaklama) cezası bulunamadı.`);
        }

        if (res.Staff !== staff.id &&
            ctx.guild.members.cache.get(res.Staff) &&
            !isOwner &&
            !isAdmin) {
            return this.sendError(ctx, `⛔ Bu ceza ${res.Staff ? (ctx.guild.members.cache.get(res.Staff) ? `${ctx.guild.members.cache.get(res.Staff)} (\`${res.Staff}\`)` : `${res.Staff}`) : `${res.Staff}`} tarafından verilmiş. **Bu cezayı açma yetkiniz yok!**\n-# Bir cezayı sadece uygulayan yetkili veya yönetici kaldırabilir.`);
        }

        await target.removePunitives(res.No, staff, ctx, "Kaldırıldı");
        this.deleteTriggerMessage(ctx);
    }

    static async handleUnjail(ctx, targetUser) {
        const staff = ctx.member;
        const isOwner = ConfigManager.isOwner(staff);
        const isAdmin = staff.permissions.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = ConfigManager.get("Roles.Jail_Staff") || [];
        const hasRole = allowedRoles.some(roleId => staff.roles.cache.has(roleId));

        if (!isOwner && !isAdmin && !hasRole) {
            return this.sendError(ctx, "Bu komutu kullanmak için yetkiniz yok.");
        }

        if (!targetUser) {
            return this.sendError(ctx, "Bir kullanıcı veya ID belirtmelisiniz.");
        }

        const targetId = targetUser.id;
        if (targetId === staff.id) {
            return this.sendError(ctx, "Kendinize işlem uygulayamazsınız.");
        }

        let isGuildMember = ctx.guild.members.cache.has(targetId);
        let guildMember = isGuildMember ? ctx.guild.members.cache.get(targetId) : null;
        let target = guildMember || targetUser;

        if (!isOwner) {
            if (isGuildMember && staff.roles.highest.position <= guildMember.roles.highest.position) {
                return this.sendError(ctx, "Bu kullanıcıya işlem uygulayamazsınız.");
            }
        }

        const Punitives = require("../../Core/Database/Punitives");

        const Ceza = await Punitives.findOne({ Member: targetId, Active: true, Type: "Cezalandırılma" });
        if (!Ceza) {
            return this.sendError(ctx, "Bu kullanıcının bir jail cezalandırması bulunamadı.");
        }

        if (Ceza.Staff !== staff.id && ctx.guild.members.cache.get(Ceza.Staff) && !isAdmin && !isOwner) {
            return this.sendError(ctx, `⛔ Bu ceza ${Ceza.Staff ? (ctx.guild.members.cache.get(Ceza.Staff) ? `${ctx.guild.members.cache.get(Ceza.Staff)} (\`${Ceza.Staff}\`)` : `${Ceza.Staff}`) : `${Ceza.Staff}`} tarafından verilmiş. **Bu cezayı kaldıramazsınız!**\n-# Yaptırım yapılan cezada, sadece cezayı veren yetkili işlem uygulayabilir.`);
        }

        await target.removePunitives(Ceza.No, staff, ctx, "Kaldırıldı");
        this.deleteTriggerMessage(ctx);
    }

    static async handleUnmute(ctx, targetUser, cezaNoOrId = null) {
        const staff = ctx.member;
        const isOwner = ConfigManager.isOwner(staff);
        const isAdmin = staff.permissions.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = ConfigManager.get("Roles.Mute_Staff") || [];
        const hasRole = allowedRoles.some(roleId => staff.roles.cache.has(roleId));

        if (!isOwner && !isAdmin && !hasRole) {
            return this.sendError(ctx, "Bu komutu kullanmak için yetkiniz yok.");
        }

        if (!targetUser) {
            return this.sendError(ctx, "Bir kullanıcı veya ID belirtmelisiniz.");
        }

        const targetId = targetUser.id;
        if (targetId === staff.id) {
            return this.sendError(ctx, "Kendinize işlem uygulayamazsınız.");
        }

        let guildMember = await ctx.guild.members.fetch(targetId).catch(() => null);
        let target = guildMember || targetUser;

        if (!isOwner) {
            if (guildMember && staff.roles.highest.position <= guildMember.roles.highest.position) {
                return this.sendError(ctx, "Bu kullanıcıya işlem uygulayamazsınız.");
            }
        }

        const Punitives = require("../../Core/Database/Punitives");
        
        const Emojis = ConfigManager.get("Emojis");
        const { toji_info, toji_nokta } = Emojis;

        const ChatMute = await Punitives.findOne({ Member: targetId, Active: true, Type: "Metin Susturulma" });
        const SesMute = await Punitives.findOne({ Member: targetId, Active: true, Type: "Ses Susturulma" });

        if (!ChatMute && !SesMute) {
            return this.sendError(ctx, "Bu kullanıcının aktif cezası bulunamadı.");
        }

        let hasChatMute = !!ChatMute;
        let hasVoiceMute = !!SesMute;
        let isStaffOrAdmin = isAdmin || isOwner || hasRole;

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

        let Row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("metin")
                .setLabel(isStaffOrAdmin ? "Metin Kanallarında" : "Metin Kanallarında (Yetkin Yok)")
                .setStyle(ChatMute ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!isStaffOrAdmin || !hasChatMute),

            new ButtonBuilder()
                .setCustomId("ses")
                .setLabel(isStaffOrAdmin ? "Ses Kanallarında" : "Ses Kanallarında (Yetkin Yok)")
                .setStyle(SesMute ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setDisabled(!isStaffOrAdmin || !hasVoiceMute),

            new ButtonBuilder()
                .setCustomId("iptal")
                .setLabel("İşlemi İptal Et")
                .setStyle(ButtonStyle.Danger)
        );

        let açıklama = ``;
        if (ChatMute) açıklama += `> ${toji_nokta} Chat Mute: **#${ChatMute.No}**\n`;
        if (SesMute) açıklama += `> ${toji_nokta} Voice Mute: **#${SesMute.No}**`;

        const payload = {
            flags: [MessageFlags.IsComponentsV2],
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ### ${toji_info} Susturma Kaldırma\n> Belirtilen ${targetUser} üyesinin susturmasını kaldırmak için butonları kullanın.\n>\n${açıklama}`
                        }
                    ]
                },
                Row.toJSON()
            ]
        };

        let msg;
        if (ctx.isCommand && ctx.isCommand()) {
            msg = await ctx.reply({ ...payload, fetchReply: true });
        } else {
            msg = await ctx.reply({ ...payload });
        }

        const filter = (i) => i.user.id == staff.id;
        let collector = msg.createMessageComponentCollector({ filter, time: 30000 });

        collector.on("collect", async (i) => {
            if (i.customId === "metin") {
                if (ChatMute && ChatMute.Staff !== staff.id && ctx.guild.members.cache.get(ChatMute.Staff) && !isAdmin && !isOwner) {
                    await i.reply({
                        content: `⛔ Bu ceza ${ChatMute.Staff ? (ctx.guild.members.cache.get(ChatMute.Staff) ? `${ctx.guild.members.cache.get(ChatMute.Staff)} (\`${ChatMute.Staff}\`)` : `${ChatMute.Staff}`) : `${ChatMute.Staff}`} tarafından verilmiş. **Bu cezayı kaldıramazsınız!**`,
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }

                await i.deferUpdate().catch(() => { });
                await target.removePunitives(ChatMute.No, staff, ctx, "Kaldırıldı");
                if (hasVoiceMute) {
                    let updatedRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("metin").setLabel("Kaldırıldı").setStyle(ButtonStyle.Success).setDisabled(true),
                        new ButtonBuilder().setCustomId("ses").setLabel(isStaffOrAdmin ? "Ses Kanallarında" : "Ses Kanallarında (Yetkin Yok)").setStyle(SesMute ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!isStaffOrAdmin || !hasVoiceMute),
                        new ButtonBuilder().setCustomId("iptal").setLabel("İşlemi İptal Et").setStyle(ButtonStyle.Danger)
                    );
                    await msg.edit({ components: [{ type: 17, components: [{ type: 10, content: `> ### ${toji_info} Susturma Kaldırma\n> Belirtilen ${targetUser} üyesinin **Chat Mute** cezası kaldırıldı.\n>\n${açıklama}` }] }, updatedRow.toJSON()] }).catch(() => { });
                } else {
                    if (msg.deletable) msg.delete().catch(() => { });
                    if (ctx.isCommand && ctx.isCommand()) ctx.deleteReply().catch(() => { });
                }
            }

            if (i.customId === "ses") {
                if (SesMute && SesMute.Staff !== staff.id && ctx.guild.members.cache.get(SesMute.Staff) && !isAdmin && !isOwner) {
                    await i.reply({
                        content: `⛔ Bu ceza ${SesMute.Staff ? (ctx.guild.members.cache.get(SesMute.Staff) ? `${ctx.guild.members.cache.get(SesMute.Staff)} (\`${SesMute.Staff}\`)` : `${SesMute.Staff}`) : `${SesMute.Staff}`} tarafından verilmiş. **Bu cezayı kaldıramazsınız!**`,
                        flags: [MessageFlags.Ephemeral]
                    });
                    return;
                }

                await i.deferUpdate().catch(() => { });
                await target.removePunitives(SesMute.No, staff, ctx, "Kaldırıldı");
                if (msg.deletable) msg.delete().catch(() => { });
                if (ctx.isCommand && ctx.isCommand()) ctx.deleteReply().catch(() => { });
            }

            if (i.customId === "iptal") {
                if (msg.deletable) msg.delete().catch(() => { });
                if (ctx.isCommand && ctx.isCommand()) ctx.deleteReply().catch(() => { });
            }
        });

        collector.on("end", async () => {
            if (msg && msg.deletable) msg.delete().catch(() => { });
            if (ctx.isCommand && ctx.isCommand()) ctx.deleteReply().catch(() => { });
        });
        
        this.deleteTriggerMessage(ctx);
    }

    static async handleMute(ctx, targetUser) {
        const staff = ctx.member;
        const isOwner = ConfigManager.isOwner(staff);
        const isAdmin = staff.permissions.has(PermissionsBitField.Flags.Administrator);
        const allowedRoles = ConfigManager.get("Roles.Mute_Staff") || [];
        const hasRole = allowedRoles.some(roleId => staff.roles.cache.has(roleId));

        if (!isOwner && !isAdmin && !hasRole) {
            return this.sendError(ctx, "Bu komutu kullanmak için yetkiniz yok.");
        }

        if (!targetUser) {
            return this.sendError(ctx, "Bir kullanıcı veya ID belirtmelisiniz.");
        }

        const targetId = targetUser.id;
        if (targetId === staff.id) {
            return this.sendError(ctx, "Kendinize işlem uygulayamazsınız.");
        }

        let isGuildMember = ctx.guild.members.cache.has(targetId);
        let guildMember = isGuildMember ? ctx.guild.members.cache.get(targetId) : null;
        let target = guildMember || targetUser;

        if (!isOwner) {
            if (isGuildMember && staff.roles.highest.position <= guildMember.roles.highest.position) {
                return this.sendError(ctx, "Bu kullanıcıya işlem uygulayamazsınız.");
            }
        }

        const Punitives2 = require("../../Core/Database/Punitives");
        
        const hasMute = await Punitives2.findOne({ Member: targetId, Active: true, Type: "Metin Susturulma" });
        const hasVMute = await Punitives2.findOne({ Member: targetId, Active: true, Type: "Ses Susturulma" });

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
        const { toji_info, toji_nokta } = ConfigManager.get("Emojis") || {};
        const Reasons = ConfigManager.get("PunishmentReasons") || [];

        let ChatMuteBtn = new ButtonBuilder()
            .setCustomId(`chatmute`)
            .setLabel(hasMute ? `Metin Kanallarında (Aktif Cezası Var!)` : `Metin Kanallarında Sustur`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!!hasMute);

        let VoiceMuteBtn = new ButtonBuilder()
            .setCustomId(`voicemute`)
            .setLabel(hasVMute ? `Ses Kanallarında (Aktif Cezası Var!)` : `Ses Kanallarında Sustur`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!!hasVMute);

        let IptalBtn = new ButtonBuilder()
            .setCustomId(`muteiptal`)
            .setLabel(`İşlemi İptal Et`)
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(ChatMuteBtn, VoiceMuteBtn, IptalBtn);

        const getContainer = (descContent, actionRows = []) => {
            const contentComponents = [
                { type: 10, content: `## ${toji_info || "ℹ️"} Susturma İşlemi\n${toji_nokta || "•"} **Kullanıcı:** ${targetUser.toString()}` },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: descContent }
            ];

            if (actionRows.length > 0) {
                contentComponents.push({ type: 14, divider: true, spacing: 1 });
                actionRows.forEach(ar => {
                    contentComponents.push({
                        type: 1,
                        components: ar.components.map(c => c.toJSON())
                    });
                });
            }

            return {
                flags: [MessageFlags.IsComponentsV2],
                components: [
                    {
                        type: 17,
                        components: contentComponents
                    }
                ]
            };
        };

        const initialMsg = getContainer(`> Lütfen uygulamak istediğiniz **ceza türünü** seçin.`, [row]);
        
        let msg;
        if (ctx.isCommand && ctx.isCommand()) {
            msg = await ctx.reply({ ...initialMsg, fetchReply: true });
        } else {
            msg = await ctx.reply(initialMsg);
        }

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === staff.id,
            time: 120000
        });

        let selectedType = null;
        let selectedReasonId = null;

        collector.on("collect", async (i) => {
            try {
                if (i.customId === "muteiptal") {
                    collector.stop("iptal");
                    return;
                }

                if (i.customId === "chatmute" || i.customId === "voicemute") {
                    selectedType = i.customId === "chatmute" ? 5 : 4;
                    
                    const validReasons = Reasons.filter(r => r && r.value && r.label && r.type === selectedType);
                    
                    if (validReasons.length === 0) {
                        return i.reply({ content: `Seçtiğiniz ceza türü için ayarlanmış herhangi bir sebep bulunamadı.`, flags: [MessageFlags.Ephemeral] });
                    }

                    const selectSebep = new StringSelectMenuBuilder()
                        .setCustomId('select_sebep')
                        .setPlaceholder('Lütfen bir ceza sebebi seçin...')
                        .addOptions(validReasons.map(r => ({ label: String(r.label), description: `Sebep türü: ${i.customId === "chatmute" ? "Metin" : "Ses"}`, value: String(r.value) })));

                    const rowSebep = new ActionRowBuilder().addComponents(selectSebep);
                    const updatePayload = getContainer(`> Lütfen **${i.customId === "chatmute" ? "Metin Kanallarında" : "Ses Kanallarında"}** uygulanacak ceza için bir **sebep** seçin.`, [rowSebep]);
                    await i.update(updatePayload);
                }

                if (i.customId === "select_sebep") {
                    selectedReasonId = i.values[0];
                    const reasonObj = Reasons.find(r => r.value === selectedReasonId) || Reasons[0];

                    const Punitives = require("../../Core/Database/Punitives");
                    let previousPunishments = await Punitives.countDocuments({
                        Member: target.id,
                        Reason: reasonObj.label
                    });

                    let currentStrike = previousPunishments + 1;
                    let dateOptions = [reasonObj.date1, reasonObj.date2, reasonObj.date3].filter(Boolean);
                    
                    if (dateOptions.length === 0) {
                        dateOptions = ["5m"];
                    }

                    let muteDuration = dateOptions[Math.min(currentStrike, dateOptions.length) - 1];

                    await i.deferUpdate().catch(()=>{});
                    if (msg && msg.deletable) await msg.delete().catch(()=>{});
                    if (ctx.isCommand && ctx.isCommand()) ctx.deleteReply().catch(() => {});
                    
                    collector.stop("success");

                    await target.addPunitives(selectedType, staff, reasonObj.label, ctx, muteDuration);
                }
            } catch (err) {
                console.error("[Mute] Interaction error:", err);
            }
        });

        collector.on("end", (collected, reason) => {
            if (reason === "time" || reason === "iptal") {
                if (msg && msg.deletable) msg.delete().catch(() => {});
                if (ctx.isCommand && ctx.isCommand()) ctx.deleteReply().catch(() => {});
            }
        });

        this.deleteTriggerMessage(ctx);
    }
}

module.exports = ModerationService;
