const { PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class RoleService {
    static async execute(context, actionType = "ADD") {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator) || ConfigManager.isOwner(member);
        const isStaff = member.permissions.has(PermissionsBitField.Flags.ManageRoles) || ConfigManager.get("Roles.RolVer_Staff").some(roleId => member.roles.cache.has(roleId));

        if (!isAdmin && !isStaff) {
            const errObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> ## " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Yetki Yetersiz\n> Bu menüye erişim sağlayamazsınız." }]
                }]
            };
            if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
            return context.reply(errObj);
        }

        if (!isAdmin && isStaff) {
            return this.handleStaffMode(context, actionType);
        } else {
            return this.handleAdminMode(context, actionType);
        }
    }

    static async handleStaffMode(context, actionType) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        let selectedUserIds = [];
        let selectedRoleIds = [];

        const isAdd = actionType === "ADD";
        const titleName = isAdd ? "Rol Verme Sistemi" : "Rol Alma Sistemi";
        const descName = isAdd ? "vermek" : "almak";
        const actionNameText = isAdd ? "verilecek" : "alınacak";
        const confirmLabel = isAdd ? "İşlemleri Başlat" : "İşlemleri Başlat";

        const renderUI = (errorText = null) => {
            const comps = [
                {
                    type: 9,
                    accessory: { type: 11, media: { url: guild.iconURL() } },
                    components: [{ type: 10, content: `> ## ${ConfigManager.get("Emojis.toji_sparkles") || "✨"} ${titleName}\n> -# ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} Rol ${descName} istediğiniz kullanıcıları ve rolleri listeden seçin.` }]
                },
                { type: 14, divider: true, spacing: 1 }
            ];

            if (errorText) {
                comps.push({ type: 10, content: `> **${ConfigManager.get("Emojis.toji_iptal") || "✨"} Sistem Uyarısı:** ${errorText}\n` }, { type: 14, divider: true, spacing: 1 });
            }

            const previewText = (selectedUserIds.length > 0 && selectedRoleIds.length > 0)
                ? `> **Seçim Durumu:** \`${selectedUserIds.length}\` hesap sahibine toplam \`${selectedRoleIds.length}\` adet rol ${isAdd ? 'tanımlanacak' : 'geri alınacak'}.`
                : `> **Seçim Durumu:** Eksik seçimleriniz bulunuyor. (En az 1 kişi ve 1 rol)`;

            comps.push(
                { type: 10, content: previewText },
                { type: 1, components: [{ type: 5, custom_id: "staff_sel_user", placeholder: `Rol(lerin) ${actionNameText} üye(leri) seçin.`, min_values: 1, max_values: 25 }] },
                { type: 1, components: [{ type: 6, custom_id: "staff_sel_role", placeholder: `Kullanıcılara ${actionNameText} rol(leri) seçin.`, min_values: 1, max_values: 25 }] },
                { type: 1, components: [{ type: 2, style: 3, label: confirmLabel, custom_id: "staff_confirm", disabled: (selectedUserIds.length === 0 || selectedRoleIds.length === 0) }] }
            );

            const sendObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: comps }]
            };
            if (isInteraction) sendObj.ephemeral = true;
            return sendObj;
        };

        const responseObj = renderUI();
        responseObj.fetchReply = true;
        
        let responseMsg;
        if (isInteraction) {
            responseMsg = await context.reply(responseObj);
            responseMsg = await context.fetchReply();
        } else {
            responseMsg = await context.reply(responseObj);
        }

        const collector = responseMsg.createMessageComponentCollector({ time: 60000, filter: i => i.user.id === author.id });

        collector.on("collect", async i => {
            if (i.customId === "staff_sel_user") { selectedUserIds = i.values; await i.update(renderUI()); }
            if (i.customId === "staff_sel_role") { selectedRoleIds = i.values; await i.update(renderUI()); }
            if (i.customId === "staff_confirm") {
                const targetRolesObj = selectedRoleIds.map(rid => guild.roles.cache.get(rid)).filter(Boolean);

                for (const tr of targetRolesObj) {
                    if (tr.position >= guild.members.me.roles.highest.position || (tr.position >= member.roles.highest.position && guild.ownerId !== author.id)) {
                        return i.update(renderUI(`Seçmiş olduğunuz <@&${tr.id}> rolü hiyerarşide sizden veya sistemden daha yüksek/eşit!`));
                    }
                }

                collector.stop();
                await i.update({ components: [{ type: 17, components: [{ type: 10, content: `> ## ${ConfigManager.get("Emojis.loading") || "✨"} İşlem Devam Ediyor...\n> Toplam \`${selectedUserIds.length}\` hesaba roller ${isAdd ? 'tanımlanıyor' : 'geri alınıyor'}...` }] }] });

                try {
                    for (const uid of selectedUserIds) {
                        const targetMember = await guild.members.fetch(uid).catch(() => null);
                        if (targetMember) {
                            guild.client.roleLogCache?.set(targetMember.id, author.id);
                            if (isAdd) {
                                await targetMember.roles.add(targetRolesObj, `${author.tag} tarafından verildi.`);
                            } else {
                                await targetMember.roles.remove(targetRolesObj, `${author.tag} tarafından alındı.`);
                            }
                        }
                    }

                    return i.editReply({
                        components: [{ type: 17, components: [{ type: 10, content: `> ## ${ConfigManager.get("Emojis.toji_onay") || "✨"} İşlem Başarılı\n> Belirtilen toplam \`${selectedUserIds.length}\` hesaba \`${selectedRoleIds.length}\` rol sorunsuz şekilde ${isAdd ? 'işlendi' : 'alındı'}.` }] }]
                    });
                } catch (e) { return i.editReply(renderUI(`İşlem sırasında hata oluştu: ${e.message}`)); }
            }
        });
    }

    static async handleAdminMode(context, actionType) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const isAdd = actionType === "ADD";
        const titleName = isAdd ? "Yönetim İşlem Paneli" : "Yönetim İşlem Paneli (Geri Alma)";
        const descName = isAdd ? "atama" : "alma";
        const actionNameText = isAdd ? "verilecek" : "alınacak";

        let baseRoleIds = [];
        let targetUserIds = [];
        let targetRoleIds = [];
        let targetChannelIds = [];
        let filter = 'none';

        let finalMembersForProcess = null;
        let cachedRoleObjs = null;

        const getFilterOptions = () => [
            { label: "Herkes", value: "none" },
            { label: "Sadece Rolsüzler", value: "unroled", description: "Hiçbir rolü olmayan üyelere işlem yapar." },
            { label: "Ses Kanalında Bulunanlar", value: "voice" },
            { label: "Ses Kanalında Bulunmayanlar", value: "no_voice" },
            { label: "Çevrimiçi Kullanıcılar", value: "online" },
            { label: "Çevrimdışı Kullanıcılar", value: "offline" },
            { label: "Botları Dahil Et", value: "bots", description: "İşlem listesine botları da dahil eder." }
        ];

        const getFilterLabel = (val) => {
            if (!val) return "Herkes";
            return getFilterOptions().find(x => x.value === val)?.label || "Herkes";
        }

        const renderUI = (err = null) => {
            let content = `> ## ${ConfigManager.get("Emojis.toji_sparkles") || "✨"} ${titleName}\n> -# Menü üzerinden bireylere, rol gruplarına veya tüm sunucuya toplu ${descName} yapabilirsiniz.\n\n`;

            if (err) content += `> **${ConfigManager.get("Emojis.toji_iptal") || "✨"} Sistem Uyarısı:** ${err}\n\n`;

            content += `> **1.** İşlem Yapılacak Rol Sayısı: **${baseRoleIds.length || 0} Adet**\n`;
            content += `> **2.** Filtreleme Sistemi: **${getFilterLabel(filter)}**\n`;
            content += `> **3.** Seçili Kitle / Alan: `;

            if (targetUserIds.length > 0) content += `\`${targetUserIds.length}\` Adet Hedef Profil`
            else if (targetRoleIds.length > 0) content += `\`${targetRoleIds.length}\` Adet Rol Grubu`
            else if (targetChannelIds.length > 0) content += `\`${targetChannelIds.length}\` Adet Ses Kanalı`
            else content += `⚠️ \`Tüm Sunucu\``;

            const disabledBtn = baseRoleIds.length === 0;

            const sendObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [
                        { type: 9, accessory: { type: 11, media: { url: guild.iconURL() } }, components: [{ type: 10, content }] },
                        { type: 14, divider: true, spacing: 1 },
                        { type: 1, components: [{ type: 6, custom_id: "adm_sel_base", placeholder: `Kullanıcılara ${actionNameText} rol(leri) seçin.`, min_values: 1, max_values: 25 }] },
                        { type: 1, components: [{ type: 3, custom_id: "adm_sel_filter", placeholder: "Opsiyonel: Filtreleme.", options: getFilterOptions() }] },
                        { type: 1, components: [{ type: 5, custom_id: "adm_sel_user", placeholder: `Rol(lerin) ${actionNameText} üye(leri) seçin.`, min_values: 1, max_values: 25 }] },
                        { type: 1, components: [{ type: 6, custom_id: "adm_sel_role", placeholder: `Rol(lerin) ${actionNameText} hedef rol grupları.`, min_values: 1, max_values: 25 }] },
                        { type: 1, components: [{ type: 8, custom_id: "adm_sel_channel", placeholder: `Rol(lerin) ${actionNameText} ses kanalları (isteğe bağlı).`, min_values: 1, max_values: 25, channel_types: [2] }] },
                        { type: 1, components: [{ type: 2, style: 3, label: `Rol işlemine başla.`, custom_id: "adm_run", disabled: disabledBtn }] }
                    ]
                }]
            };

            if (isInteraction) sendObj.ephemeral = true;
            return sendObj;
        };

        const responseObj = renderUI();
        responseObj.fetchReply = true;

        let responseMsg;
        if (isInteraction) {
            responseMsg = await context.reply(responseObj);
            responseMsg = await context.fetchReply();
        } else {
            responseMsg = await context.reply(responseObj);
        }

        const collector = responseMsg.createMessageComponentCollector({ time: 300000, filter: i => i.user.id === author.id });

        async function processBulkMode(btnInteraction) {
            collector.stop();
            let sc = 0, fc = 0;
            const total = finalMembersForProcess.size;
            const startTime = Date.now();

            await btnInteraction.update({ components: [{ type: 17, components: [{ type: 10, content: `> ## ${ConfigManager.get("Emojis.loading") || "✨"} İşlem Devam Ediyor...\n> Yükleniyor: \`0 / ${total}\`` }] }] }).catch(() => { });

            for (const [id, m] of finalMembersForProcess) {
                try {
                    guild.client.roleLogCache?.set(m.id, author.id);
                    if (isAdd) {
                        await m.roles.add(cachedRoleObjs);
                    } else {
                        await m.roles.remove(cachedRoleObjs);
                    }
                    sc++;
                } catch { fc++; }

                if ((sc + fc) % 20 === 0) {
                    await btnInteraction.editReply({
                        components: [{
                            type: 17,
                            components: [{ type: 10, content: `> ## ${ConfigManager.get("Emojis.loading") || "✨"} İşlem Devam Ediyor...\n> -# Yükleniyor: \` ${sc + fc} / ${total} \` (**%${Math.floor(((sc + fc) / total) * 100)}**)\n> Başarılı: \` ${sc} \` | Reddedilen: \` ${fc} \`` }]
                        }]
                    }).catch(() => { });
                }
            }

            const dur = ((Date.now() - startTime) / 1000).toFixed(1);
            return btnInteraction.editReply({
                components: [{
                    type: 17,
                    components: [
                        { type: 10, content: `> ## ${ConfigManager.get("Emojis.toji_onay") || "✨"} İşlem Tamamlandı!\n> Toplam **${sc}** hesabın profiline başarıyla \`${cachedRoleObjs.length}\` adet rol ${isAdd ? 'eklendi' : 'silindi'}.\n> İşlem Süresi: \`${dur} Saniye\`` }
                    ]
                }]
            });
        }

        collector.on("collect", async i => {
            if (i.customId === "adm_sel_base") {
                baseRoleIds = i.values;
                const targetRolesObj = baseRoleIds.map(id => guild.roles.cache.get(id)).filter(Boolean);

                for (const tr of targetRolesObj) {
                    if (tr.position >= guild.members.me.roles.highest.position || (tr.position >= member.roles.highest.position && guild.ownerId !== author.id)) {
                        baseRoleIds = [];
                        return i.update(renderUI(`Seçtiğiniz rol (<@&${tr.id}>) botun veya sizin hiyerarşi yetkinizin üzerinde.`));
                    }
                }
                await i.update(renderUI());
            }

            if (i.customId === "adm_sel_filter") { filter = i.values[0]; await i.update(renderUI()); }
            if (i.customId === "adm_sel_user") { targetUserIds = i.values; targetRoleIds = []; targetChannelIds = []; await i.update(renderUI()); }
            if (i.customId === "adm_sel_role") { targetRoleIds = i.values; targetUserIds = []; targetChannelIds = []; await i.update(renderUI()); }
            if (i.customId === "adm_sel_channel") { targetChannelIds = i.values; targetUserIds = []; targetRoleIds = []; await i.update(renderUI()); }

            if (i.customId === "adm_run") {
                if (baseRoleIds.length === 0) return i.update(renderUI(`Sistemin çalışması için ${actionNameText} ana rolleri seçmelisiniz.`));
                cachedRoleObjs = baseRoleIds.map(id => guild.roles.cache.get(id)).filter(Boolean);

                if (targetUserIds.length > 0) {
                    collector.stop();
                    try {
                        for (const uId of targetUserIds) {
                            const trg = await guild.members.fetch(uId).catch(() => null);
                            if (trg) {
                                guild.client.roleLogCache?.set(trg.id, author.id);
                                if (isAdd) await trg.roles.add(cachedRoleObjs);
                                else await trg.roles.remove(cachedRoleObjs);
                            }
                        }
                        return i.update({ components: [{ type: 17, components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} **Bireysel İşlem Başarılı:** Toplam \`${targetUserIds.length}\` kullanıcının profilinde \`${cachedRoleObjs.length}\` rol güncellendi.` }] }] });
                    } catch (e) { return i.update(renderUI(e.message)); }
                }

                await i.update({ components: [{ type: 17, components: [{ type: 10, content: "> ## " + (ConfigManager.get("Emojis.loading") || "✨") + " Veri Tarama İşlemi...\n> Sunucu üyeleri taranıyor ve filtreleriniz hesaplanıyor." }] }] });

                let collection = await guild.members.fetch();

                if (targetRoleIds.length > 0) {
                    collection = collection.filter(m => targetRoleIds.some(r => m.roles.cache.has(r)));
                }

                if (targetChannelIds.length > 0) {
                    collection = collection.filter(m => targetChannelIds.includes(m.voice.channelId));
                }

                let finalMembers;
                if (isAdd) {
                    finalMembers = collection.filter(m => !baseRoleIds.every(br => m.roles.cache.has(br)));
                } else {
                    finalMembers = collection.filter(m => baseRoleIds.some(br => m.roles.cache.has(br)));
                }

                if (filter !== 'bots') finalMembers = finalMembers.filter(m => !m.user.bot);

                switch (filter) {
                    case "unroled": finalMembers = finalMembers.filter(m => m.roles.cache.size <= 1); break;
                    case "voice": finalMembers = finalMembers.filter(m => m.voice.channelId); break;
                    case "no_voice": finalMembers = finalMembers.filter(m => !m.voice.channelId); break;
                    case "online": finalMembers = finalMembers.filter(m => m.presence && m.presence.status !== 'offline'); break;
                    case "offline": finalMembers = finalMembers.filter(m => !m.presence || m.presence.status === 'offline'); break;
                }

                if (finalMembers.size === 0) return i.editReply({ components: [{ type: 17, components: [{ type: 10, content: "> ## " + (ConfigManager.get("Emojis.toji_info") || "✨") + " Uygun Hesap Bulunamadı\n> Kapsama ve filtrelere uyan hiçbir etkilenebilecek hesap tespit edilemedi." }] }] });

                finalMembersForProcess = finalMembers;

                if (finalMembers.size > 50) {
                    return i.editReply({
                        components: [{
                            type: 17,
                            components: [
                                { type: 10, content: `> ## ${ConfigManager.get("Emojis.toji_info") || "✨"} İşlem Onayı\n> Toplam **${finalMembers.size}** kişiye işlem uygulanacak. Devam etmek istediğinizden emin misiniz?` },
                                {
                                    type: 1, components: [
                                        { type: 2, style: 4, label: "İşlemi İptal Et", custom_id: "adm_cancel_run" },
                                        { type: 2, style: 3, label: "Devam Et", custom_id: "adm_confirm_run" }
                                    ]
                                }
                            ]
                        }]
                    });
                } else {
                    return processBulkMode(i);
                }
            }

            if (i.customId === "adm_cancel_run") {
                collector.stop();
                return i.update({ components: [{ type: 17, components: [{ type: 10, content: `> ## İşlem İptal Edildi\n> Kritik veri işlemi isteğiniz üzerine durduruldu.` }] }] });
            }

            if (i.customId === "adm_confirm_run") {
                return processBulkMode(i);
            }
        });
    }
}

module.exports = RoleService;
