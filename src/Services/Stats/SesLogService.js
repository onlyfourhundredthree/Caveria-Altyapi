const { PermissionsBitField, MessageFlags } = require('discord.js');
const VoiceLogs = require("../../Core/Database/VoiceLogs");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class SesLogService {
    static async execute(context, targetUserResolvable) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const executerMember = isInteraction ? context.member : context.member;
        const guild = context.guild;
        const client = context.client;

        const isOwner = ConfigManager.isOwner(executerMember);
        const warnStaff = ConfigManager.get("Roles.Warn_Staff") || [];
        const isStaff = isOwner || executerMember.permissions.has(PermissionsBitField.Flags.Administrator) || warnStaff.some(roleId => executerMember.roles.cache.has(roleId));

        if (!isStaff) {
            const errObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> # Yetki Yetersiz\n> Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz." }]
                }]
            };
            if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
            return context.reply(errObj).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        }

        let member;
        if (typeof targetUserResolvable === 'string') {
            member = guild.members.cache.get(targetUserResolvable) || await guild.members.fetch(targetUserResolvable).catch(() => null);
        } else if (targetUserResolvable && targetUserResolvable.id) {
            member = guild.members.cache.get(targetUserResolvable.id) || await guild.members.fetch(targetUserResolvable.id).catch(() => null);
        }

        if (!member) {
            const errObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> # Hata\n> Lütfen ses geçmişine bakmak istediğiniz bir kullanıcıyı etiketleyin veya ID'sini girin." }]
                }]
            };
            if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
            return context.reply(errObj).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        }

        try {
            const data = await VoiceLogs.find({ userID: member.id }).sort({ date: -1 }).lean();

            if (data.length === 0) {
                const emptyObj = {
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [
                            {
                                type: 9,
                                accessory: {
                                    type: 11,
                                    media: { url: member.user.displayAvatarURL({ extension: 'png' }) },
                                },
                                components: [
                                    {
                                        type: 10,
                                        content: `## ${member.user.globalName || member.user.username}\n> ${member.toString()} kullanıcısının sesli kanal işlem geçmişi.`
                                    }
                                ]
                            },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 10,
                                content: "> Kullanıcıya ait ses logu bulunamadı."
                            }
                        ]
                    }],
                    allowedMentions: { repliedUser: false }
                };
                return context.reply(emptyObj);
            }

            const emojis = ConfigManager.get("Emojis") || {};
            const itemEmoji = emojis.toji_nokta || "-";

            const logTypes = {
                "JOIN": "GİRDİ",
                "LEAVE": "ÇIKTI",
                "DISCONNECT": "RC SESTEN ATILDI",
                "MOVE": "DEĞİŞTİRDİ",
                "MUTE": "SUSTURDU",
                "UNMUTE": "SUSTURMAYI AÇTI",
                "DEAF": "SAĞIRLAŞTIRDI",
                "UNDEAF": "SAĞIRLAŞTIRMAYI AÇTI",
                "SERVER-MUTE": "RC SUSTURULDU",
                "SERVER-UNMUTE": "RC SUSTURMA AÇILDI",
                "SERVER-DEAF": "RC SAĞIRLAŞTIRILDI",
                "SERVER-UNDEAF": "RC SAĞIRLAŞTIRMA AÇILDI"
            };

            const pageSize = 15;
            const totalPages = Math.ceil(data.length / pageSize);
            let currentPage = 1;

            const getPageContent = (page) => {
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                const pageData = data.slice(start, end);

                return pageData.map(log => {
                    let channelText = "";
                    if (log.type === "MOVE") channelText = `[ <#${log.oldChannel}> -> <#${log.newChannel}> ]`;
                    else if (log.newChannel) channelText = `[ <#${log.newChannel}> ]`;
                    else if (log.oldChannel) channelText = `[ <#${log.oldChannel}> ]`;

                    let adminText = log.adminID ? ` **(Yetkili: <@${log.adminID}>)**` : "";

                    return `${itemEmoji} <t:${Math.floor(log.date / 1000)}:R> ${logTypes[log.type] || "İŞLEM YAPTI"} ${channelText}${adminText}`;
                }).join("\n");
            };

            const getComponents = (page) => {
                return [
                    {
                        type: 17,
                        components: [
                            {
                                type: 9,
                                accessory: {
                                    type: 11,
                                    media: { url: member.user.displayAvatarURL({ extension: 'png', size: 512 }) },
                                },
                                components: [
                                    {
                                        type: 10,
                                        content: `## ${member.user.globalName || member.user.username}\n> ${member.toString()} kullanıcısının sesli kanal işlem geçmişi.`
                                    }
                                ]
                            },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 10,
                                content: getPageContent(page)
                            },
                            ...(totalPages > 1 ? [
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 1,
                                    components: [
                                        {
                                            type: 2,
                                            style: 2,
                                            label: "◀ Geri",
                                            custom_id: "prev_page",
                                            disabled: page === 1
                                        },
                                        {
                                            type: 2,
                                            style: 2,
                                            label: `${page} / ${totalPages}`,
                                            custom_id: "page_info",
                                            disabled: true
                                        },
                                        {
                                            type: 2,
                                            style: 2,
                                            label: "İleri ▶",
                                            custom_id: "next_page",
                                            disabled: page === totalPages
                                        }
                                    ]
                                }
                            ] : [])
                        ]
                    }
                ];
            };

            const sendObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: getComponents(currentPage),
                allowedMentions: { repliedUser: false },
                fetchReply: true
            };

            const response = await context.reply(sendObj);
            const actualResponse = isInteraction ? await context.fetchReply() : response;

            if (totalPages > 1) {
                const collector = actualResponse.createMessageComponentCollector({
                    filter: i => i.user.id === author.id,
                    time: 300000
                });

                collector.on("collect", async (i) => {
                    if (i.customId === "prev_page") {
                        if (currentPage > 1) currentPage--;
                    } else if (i.customId === "next_page") {
                        if (currentPage < totalPages) currentPage++;
                    }

                    await i.update({
                        components: getComponents(currentPage)
                    });
                });

                collector.on("end", () => {
                    actualResponse.edit({ components: getComponents(currentPage).map(c => ({ ...c, components: c.components.filter(cc => cc.type !== 1) })) }).catch(() => { });
                });
            }

        } catch (err) {
            console.error("Ses logu çekilirken hata:", err);
            return context.reply({ content: "Ses logları çekilirken bir hata oluştu." });
        }
    }
}

module.exports = SesLogService;
