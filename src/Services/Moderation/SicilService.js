const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { PermissionsBitField, MessageFlags, AttachmentBuilder } = require('discord.js');
const Punitives = require("../../Core/Database/Punitives");
const StatHistory = require("../../Core/Database/StatHistory");
const moment = require("moment");
const { renderSicilCanvas } = require("../../Core/Handlers/SicilCanvas");

class SicilService {
    static async execute(context, targetMember, cezaNoArg) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const guild = context.guild;
        const client = context.client;
        const executerMember = isInteraction ? context.member : context.member;

        if (isInteraction) {
            await context.deferReply().catch(() => {});
        }

        let member;
        let initialCezaNo = null;

        if (cezaNoArg && !isNaN(cezaNoArg)) {
            const puni = await Punitives.findOne({ No: Number(cezaNoArg) });
            if (puni) {
                initialCezaNo = Number(cezaNoArg);
                member = guild.members.cache.get(puni.Member) || await client.users.fetch(puni.Member).catch(() => null);
                if (member && !member.id) member = null;
            }
        }

        if (!member) {
            if (targetMember) {
                if (typeof targetMember === 'string') {
                    member = await guild.members.fetch(targetMember).catch(() => null) || await client.users.fetch(targetMember).catch(() => null);
                } else if (targetMember.id) {
                    member = targetMember;
                }
            }
            if (!member) member = executerMember;
        }

        const isOwner = ConfigManager.isOwner(executerMember);
        const roles = ConfigManager.get("Roles") || {};
        const staffRoles = [
            ...(roles.Warn_Staff || []),
            ...(roles.Mute_Staff || []),
            ...(roles.Jail_Staff || []),
            ...(roles.Ban_Staff || []),
            ...(roles.RealBan_Staff || [])
        ];
        const isStaff = isOwner || executerMember.permissions.has(PermissionsBitField.Flags.Administrator) || staffRoles.some(roleId => executerMember.roles.cache.has(roleId));

        if (!isStaff && member.id !== author.id) {
            const replyObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    accent_color: 0xFF3B30,
                    components: [{ type: 10, content: "> # Hata\n> Üzgünüm, sadece kendi sicilinize bakabilirsiniz. Başkasının siciline bakmak için gerekli yetkiye sahip değilsiniz." }]
                }]
            };
            if (isInteraction) {
                return context.editReply(replyObj).then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
            } else {
                return context.reply(replyObj).then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
            }
        }

        try {
            const emojis = ConfigManager.get("Emojis") || {};
            const itemEmoji = emojis.toji_nokta || "-";
            const sparklyEmoji = emojis.toji_sparkly || "✨";

            const currentWeekStart = moment().startOf('isoWeek').format("YYYY-MM-DD");
            const respectAgg = await StatHistory.aggregate([
                { $match: { userID: member.id, guildID: guild.id } },
                { $group: { _id: "$userID", total: { $sum: "$respect" }, weekly: { $sum: { $cond: [{ $gte: ["$date", currentWeekStart] }, "$respect", 0] } } } }
            ]);
            const resData = respectAgg[0] || { total: 0, weekly: 0 };

            const allPunitives = await Punitives.find({ Member: member.id, Hidden: { $ne: true } }).sort({ Date: -1, No: -1 }).lean();
            let totalCezalar = allPunitives.length;

            let cezaPuani = 0;
            allPunitives.forEach(p => {
                const reason = (p.Reason || "").toLowerCase();
                if (reason.includes("otomatik ceza") || reason.includes("otomatik puan")) return;

                const type = (p.Type || "").toLowerCase();
                if (type.includes("cezalandır") || type.includes("jail")) cezaPuani += 30;
                else if (type.includes("sustur") || type.includes("mute")) cezaPuani += 15;
                else if (type.includes("uyarı")) cezaPuani += 5;
            });

            const pageSize = 10;
            let currentPage = 0;
            let totalPages = Math.ceil(totalCezalar / pageSize) || 1;

            const getPaginationButtons = (page) => {
                if (totalPages <= 1) return null;
                return {
                    type: 1,
                    components: [
                        { type: 2, custom_id: 'prev_page', style: 2, emoji: parseEmj(ConfigManager.get("Emojis.toji_leftarrow") || "✨"), disabled: page === 0 },
                        { type: 2, custom_id: 'next_page', style: 2, emoji: parseEmj(ConfigManager.get("Emojis.toji_rightarrow") || "✨"), disabled: page >= totalPages - 1 }
                    ]
                };
            };

            const getSelectMenuComponent = (page) => {
                const start = page * pageSize;
                const end = start + pageSize;
                const currentPunitives = allPunitives.slice(start, end);

                if (currentPunitives.length === 0) return null;

                return {
                    type: 1,
                    components: [{
                        type: 3,
                        custom_id: 'ceza_detay_menu',
                        placeholder: 'Detayını görmek istediğiniz cezayı seçin',
                        options: currentPunitives.map((p, index) => {
                            let aE = { name: "✅" };
                            let iE = { name: "❌" };
                            const aStr = ConfigManager.get("Emojis.toji_onay");
                            const iStr = ConfigManager.get("Emojis.toji_iptal");
                            if (aStr) {
                                const m = aStr.match(/<a?:.+?:(\d+)>/);
                                aE = m ? { id: m[1] } : { name: aStr };
                            }
                            if (iStr) {
                                const m = iStr.match(/<a?:.+?:(\d+)>/);
                                iE = m ? { id: m[1] } : { name: iStr };
                            }
                            return {
                                label: `Ceza #${p.No}`,
                                description: `${p.Type} - ${p.Reason.substring(0, 50)}`,
                                value: `${p.No}_${index}`,
                                emoji: p.Active ? aE : iE
                            };
                        })
                    }]
                };
            };

            const parseEmj = (str) => {
                if (!str) return undefined;
                const match = str.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
                if (match) return { name: match[1], id: match[2], animated: str.startsWith('<a:') };
                return { name: str };
            };

            const getSicilLayout = async (page) => {
                const start = page * pageSize;
                const end = start + pageSize;
                const currentPunitives = (allPunitives || []).slice(start, end);

                const selectMenu = getSelectMenuComponent(page);
                const pagination = getPaginationButtons(page);
                const avatarUrl = (member.user || member).displayAvatarURL ? (member.user || member).displayAvatarURL({ extension: 'png' }) : client.user.displayAvatarURL();

                const containerComponents = [];
                let attachment = null;

                const memberData = {
                    avatarUrl: avatarUrl,
                    tag: member.displayName || (member.user || member).username || 'Bilinmeyen Kullanıcı',
                    id: member.id,
                    cezaPuani: cezaPuani,
                    resWeekly: resData.weekly,
                    resTotal: resData.total
                };
                
                const tableBuffer = await renderSicilCanvas(currentPunitives, page, totalPages, totalCezalar, memberData);
                attachment = new AttachmentBuilder(tableBuffer, { name: 'sicil_canvas.png' });
                
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: 'attachment://sicil_canvas.png' } }]
                });

                if (selectMenu) {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                    containerComponents.push(selectMenu);
                }

                if (pagination) {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                    containerComponents.push(pagination);
                }

                const components = [{
                    type: 17,
                    components: containerComponents
                }];

                return { components, attachment };
            };

            const getDetayLayout = async (cezaNo) => {
                const res = await Punitives.findOne({ No: cezaNo });
                if (!res) return null;

                const cezalanan = await client.users.fetch(res.Member).catch(() => ({ tag: "Bilinmeyen Üye", id: res.Member }));
                const yetkili = await client.users.fetch(res.Staff).catch(() => ({ tag: "Bilinmeyen Yetkili", id: res.Staff }));

                let cezaSuresi = "Kalıcı";
                if (res.Duration) {
                    const durationMs = res.Duration - res.Date;
                    cezaSuresi = moment.duration(durationMs).format("Y [Yıl,] M [Ay,] d [Gün,] h [Saat,] m [Dakika]");
                }

                let extraInfo = "";
                if (res.Remover) {
                    const remover = await client.users.fetch(res.Remover).catch(() => ({ tag: "Bilinmeyen", id: res.Remover }));
                    extraInfo = `\n${itemEmoji} **Cezayı Kaldıran:** <@${remover.id}> (\`${remover.id}\`)`;
                }

                const buttonRow = {
                    type: 1,
                    components: [
                        { type: 2, custom_id: 'back_to_sicil', label: '⬅️ Sicile Dön', style: 2 }
                    ]
                };

                if (res.Active) {
                    buttonRow.components.push({ type: 2, custom_id: `remove_ceza_${cezaNo}`, label: 'Cezayı Kaldır', style: 3 });
                }

                buttonRow.components.push({ type: 2, custom_id: `clear_ceza_${cezaNo}`, label: 'Cezayı Temizle', style: 4 });

                let kanitBilgisi = "";
                if (res.Evidence && res.Evidence.length > 0) {
                    kanitBilgisi = `\n> ${itemEmoji} **Kanıtlar:** ` + res.Evidence.map((e, index) => `[Kanıt ${index + 1}](${e.url})`).join(", ");
                } else {
                    kanitBilgisi = `\n> ${itemEmoji} **Kanıtlar:** Yok`;
                }

                return [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `## Ceza Detayı (#${res.No} / ${res.Type})\n` +
                                    `> ${itemEmoji} **Cezalanan:** <@${cezalanan.id}> (\`${cezalanan.id}\`)\n` +
                                    `> ${itemEmoji} **Yetkili:** <@${yetkili.id}> (\`${yetkili.id}\`)\n` +
                                    `> ${itemEmoji} **Sebep:** \`${res.Reason}\`\n` +
                                    `> ${itemEmoji} **Tarih:** <t:${Math.floor(res.Date / 1000)}:f> (<t:${Math.floor(res.Date / 1000)}:R>)\n` +
                                    `> ${itemEmoji} **Süre:** \`${cezaSuresi}\`\n` +
                                    `> ${itemEmoji} **Durum:** ${res.Active ? (ConfigManager.get("Emojis.toji_onay") || "✨") + " Aktif" : (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Aktif Değil"}${extraInfo}${kanitBilgisi}`
                            },
                            { type: 14, divider: true, spacing: 1 },
                            buttonRow
                        ]
                    }
                ];
            };

            let initialSendObj;

            if (initialCezaNo) {
                const detayLayout = await getDetayLayout(initialCezaNo);
                if (detayLayout) {
                    initialSendObj = {
                        flags: [MessageFlags.IsComponentsV2],
                        components: detayLayout,
                        files: [],
                        allowedMentions: { repliedUser: false }
                    };
                }
            }

            if (!initialSendObj) {
                const sicil = await getSicilLayout(currentPage);
                initialSendObj = {
                    flags: [MessageFlags.IsComponentsV2],
                    components: sicil.components,
                    files: sicil.attachment ? [sicil.attachment] : [],
                    allowedMentions: { repliedUser: false }
                };
            }

            let initialMsg;
            if (isInteraction) {
                initialMsg = await context.editReply(initialSendObj);
            } else {
                initialSendObj.fetchReply = true;
                initialMsg = await context.reply(initialSendObj);
            }

            const collector = initialMsg.createMessageComponentCollector({
                time: 300000
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== author.id) {
                    return interaction.reply({ content: "Bu işlemi sadece komutu kullanan kişi yapabilir.", ephemeral: true });
                }

                if (interaction.isButton()) {
                    if (interaction.customId === 'prev_page') {
                        currentPage--;
                        const sicil = await getSicilLayout(currentPage);
                        await interaction.update({
                            components: sicil.components,
                            files: sicil.attachment ? [sicil.attachment] : []
                        }).catch(() => {});
                    } else if (interaction.customId === 'next_page') {
                        currentPage++;
                        const sicil = await getSicilLayout(currentPage);
                        await interaction.update({
                            components: sicil.components,
                            files: sicil.attachment ? [sicil.attachment] : []
                        }).catch(() => {});
                    } else if (interaction.customId === 'back_to_sicil') {
                        const sicil = await getSicilLayout(currentPage);
                        await interaction.update({
                            components: sicil.components,
                            files: sicil.attachment ? [sicil.attachment] : []
                        }).catch(() => {});
                    } else if (interaction.customId.startsWith('remove_ceza_') || interaction.customId.startsWith('clear_ceza_')) {
                        const cezaNo = parseInt(interaction.customId.split('_')[2]);
                        const res = await Punitives.findOne({ No: cezaNo });

                        if (!res) {
                            return interaction.reply({ content: "Bu ceza veritabanında bulunamadı.", ephemeral: true });
                        }

                        const isOwnerInteraction = ConfigManager.isOwner(interaction.member);
                        const realBanStaff = ConfigManager.get("Roles.RealBan_Staff") || [];
                        const isStaffInteraction = isOwnerInteraction || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || realBanStaff.some(roleId => interaction.member.roles.cache.has(roleId));
                        const isAuthorOfPunish = res.Staff === interaction.user.id;

                        if (!isStaffInteraction && !isAuthorOfPunish) {
                            return interaction.reply({ content: "Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.", ephemeral: true });
                        }

                        const applyUnpunish = async (guild, memberId, punishType) => {
                            const pType = punishType || "";
                            if (pType.includes("Yasaklama") || pType.includes("Forceban")) {
                                await guild.members.unban(memberId, "Cezası kaldırıldı").catch(() => {});
                            }

                            const guildMember = await guild.members.fetch(memberId).catch(() => null);
                            if (!guildMember) return;

                            if (pType.includes("Metin Susturulma")) {
                                const muteRole = ConfigManager.get("Roles.Muted");
                                if (muteRole) await guildMember.roles.remove(muteRole).catch(() => {});
                                if (guildMember.timeout) await guildMember.timeout(null).catch(() => {});
                            } else if (pType.includes("Ses Susturulma")) {
                                if (guildMember.voice && guildMember.voice.channel) await guildMember.voice.setMute(false).catch(() => {});
                            }

                            if (pType.includes("Cezalandır") || pType.includes("Jail") || pType.includes("Underworld") || pType.includes("Cezalı")) {
                                const jailRole = ConfigManager.get("Roles.Jailed");
                                const uwRole = ConfigManager.get("Roles.Underworld");
                                if (jailRole) await guildMember.roles.remove(jailRole).catch(() => {});
                                if (uwRole) await guildMember.roles.remove(uwRole).catch(() => {});

                                const unjailRoles = ConfigManager.get("Roles.Unjail_Roles");
                                const memberRole = ConfigManager.get("Roles.Member");
                                const rolesToAdd = [];
                                if (unjailRoles) rolesToAdd.push(...(Array.isArray(unjailRoles) ? unjailRoles : [unjailRoles]));
                                if (memberRole) rolesToAdd.push(...(Array.isArray(memberRole) ? memberRole : [memberRole]));

                                const boosterRoleId = guild.roles?.premiumSubscriberRole?.id;
                                if (boosterRoleId && guildMember.roles.cache.has(boosterRoleId)) rolesToAdd.push(boosterRoleId);

                                const cleanRoles = Array.from(new Set(rolesToAdd.filter(r => typeof r === "string" && r.length > 5 && guild.roles.cache.has(r))));
                                if (cleanRoles.length > 0) {
                                    await guildMember.roles.add(cleanRoles).catch(err => console.error("[SicilService] Role add failed:", err));
                                }
                            }
                        };

                        if (interaction.customId.startsWith('remove_ceza_')) {
                            if (res.Active) {
                                res.Active = false;
                                res.Remover = interaction.user.id;
                                await res.save();

                                await applyUnpunish(interaction.guild, res.Member, res.Type);

                                const findIdx = allPunitives.findIndex(p => p.No == cezaNo);
                                if (findIdx !== -1) allPunitives[findIdx].Active = false;

                                const newDetay = await getDetayLayout(cezaNo);
                                await interaction.update({
                                    components: newDetay
                                }).catch(() => {});
                            } else {
                                await interaction.reply({ content: "Bu ceza zaten aktif değil.", ephemeral: true });
                            }
                        } else if (interaction.customId.startsWith('clear_ceza_')) {
                            if (res && res.Active) {
                                await applyUnpunish(interaction.guild, res.Member, res.Type);
                            }

                            await Punitives.updateOne({ No: parseInt(cezaNo) }, { Hidden: true, Active: false });

                            const findIdx = allPunitives.findIndex(p => p.No == cezaNo);
                            if (findIdx !== -1) allPunitives.splice(findIdx, 1);
                            totalCezalar = allPunitives.length;

                            totalPages = Math.ceil(totalCezalar / pageSize) || 1;
                            if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

                            const sicilAfterClear = await getSicilLayout(currentPage);
                            await interaction.update({
                                components: sicilAfterClear.components,
                                files: sicilAfterClear.attachment ? [sicilAfterClear.attachment] : []
                            }).catch(() => {});

                            await interaction.followUp({ content: `\`#${cezaNo}\` numaralı ceza başarıyla veritabanından silindi.${res && res.Active ? " Ceza aktif olduğu için kullanıcının cezası da kaldırıldı." : ""}`, ephemeral: true });
                        }
                    }
                } else if (interaction.isStringSelectMenu()) {
                    if (interaction.customId === 'ceza_detay_menu') {
                        const cezaNo = parseInt(interaction.values[0].split('_')[0]);
                        const detayLayout = await getDetayLayout(cezaNo);
                        const res = await Punitives.findOne({ No: cezaNo });

                        if (detayLayout) {
                            await interaction.update({
                                components: detayLayout
                            }).catch(() => {});
                        }
                    }
                }
            });

            collector.on('end', async () => {
                const sicilEnd = await getSicilLayout(currentPage);
                initialMsg.edit({ components: sicilEnd.components, files: sicilEnd.attachment ? [sicilEnd.attachment] : [] }).catch(() => { });
            });

        } catch (err) {
            console.error("Ceza bilgileri alınırken hata oluştu:", err);
            const errObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> # Hata\n> Sunucu verileri çekilirken teknik bir aksaklık yaşandı. Lütfen daha sonra tekrar deneyiniz." }]
                }]
            };
            if (isInteraction) {
                return context.editReply(errObj).then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
            } else {
                return context.reply(errObj).then(x => setTimeout(() => x.delete().catch(() => {}), 5000));
            }
        }
    }
}

module.exports = SicilService;
