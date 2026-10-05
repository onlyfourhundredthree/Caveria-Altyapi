const { PermissionsBitField, MessageFlags, parseEmoji } = require("discord.js");
const RoleLog = require("../../Core/Database/RoleLog");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const moment = require("moment");
moment.locale("tr");

class RolLogService {
    static async execute(context, targetMember) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const guild = context.guild;
        const client = context.client;
        
        const statsStaffs = ConfigManager.get("Roles.StatsStaffs") || [];
        const member = isInteraction ? context.member : context.member;
        
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !statsStaffs.some(role => member.roles.cache.has(role)) && !ConfigManager.isOwner(member)) {
            const replyContent = "Bu komutu kullanmak için yetkiniz yok.";
            if (isInteraction) return context.reply({ content: replyContent, ephemeral: true });
            return;
        }

        if (!targetMember) {
            const replyContent = "Lütfen bir kullanıcı belirtin.";
            if (isInteraction) return context.reply({ content: replyContent, ephemeral: true });
            return context.reply({ content: replyContent });
        }

        const allLogs = await RoleLog.find({ guildID: guild.id, userID: targetMember.id }).sort({ date: -1 }).lean();

        const emojis = ConfigManager.get("Emojis") || {};
        const { toji_sparkly } = emojis;
        const prevEmojiRaw = emojis.toji_leftarrow || "⬅️";
        const nextEmojiRaw = emojis.toji_rightarrow || "➡️";
        const prevEmojiObj = prevEmojiRaw.startsWith("<") ? parseEmoji(prevEmojiRaw) : { name: prevEmojiRaw };
        const nextEmojiObj = nextEmojiRaw.startsWith("<") ? parseEmoji(nextEmojiRaw) : { name: nextEmojiRaw };

        if (allLogs.length === 0) {
            const replyObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ## ${ConfigManager.get("Emojis.toji_iptal") || "✨"} Kayıt Bulunamadı\n> ${targetMember} kullanıcısı için geçmiş rol kaydı bulunamadı.` }]
                }]
            };
            if (isInteraction) replyObj.ephemeral = true;
            return context.reply(replyObj);
        }

        let currentFilterRole = null;
        let currentFilterStaff = null;
        let currentPage = 0;
        let activeMenu = null; 
        const pageSize = 10;

        const uniqueRoles = [...new Set(allLogs.map(l => l.roleID))].slice(0, 25);
        const uniqueAuthorIDs = [...new Set(allLogs.map(l => l.adminID))].slice(0, 25);

        const getFilteredLogs = () => {
            let logs = allLogs;
            if (currentFilterRole) logs = logs.filter(l => l.roleID === currentFilterRole);
            if (currentFilterStaff) logs = logs.filter(l => l.adminID === currentFilterStaff);
            return logs;
        };

        const getComponents = async (page) => {
            const logs = getFilteredLogs();
            const totalPages = Math.ceil(logs.length / pageSize) || 1;
            const start = page * pageSize;
            const end = start + pageSize;
            const currentLogs = logs.slice(start, end);

            const logList = currentLogs.map(log => {
                const date = `<t:${Math.floor(log.date / 1000)}:R>`;
                const action = log.type === "ADD" ? "Ekleme" : "Çıkarma";
                const method = log.method === "BOT" ? "(Bot Komutu)" : "(Sağ Tık)";
                return `> <@${log.adminID}> **${action} ${method}** | ${date} - <@&${log.roleID}>`;
            }).join("\n");

            let filterText = "";
            if (currentFilterRole) filterText += `\n> **Rol Filtresi:** <@&${currentFilterRole}>`;
            if (currentFilterStaff) filterText += `\n> **Yetkili Filtresi:** <@${currentFilterStaff}>`;

            const containerComponents = [
                {
                    type: 9,
                    accessory: { type: 11, media: { url: targetMember.user.displayAvatarURL({ dynamic: true }) } },
                    components: [{ type: 10, content: `> ## ${toji_sparkly || ""} Rol Geçmişi: ${targetMember.user.tag}\n> -# Toplam ${logs.length} kayıt listelendi.${filterText}` }]
                },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: logList || "> Filtreleme sonucunda kayıt bulunamadı." },
                { type: 14, divider: true, spacing: 1 }
            ];

            if (totalPages > 1) {
                const pageOptions = [];
                const startP = Math.max(0, Math.min(page - 12, totalPages - 25));
                const endP = Math.min(totalPages, startP + 25);
                for (let p = startP; p < endP; p++) {
                    pageOptions.push({ label: `Sayfa ${p + 1}`, value: p.toString(), default: p === page });
                }
                containerComponents.push({
                    type: 1,
                    components: [{ type: 3, custom_id: "jump_page", placeholder: "Gitmek istediğiniz sayfayı seçin", options: pageOptions }]
                });
            }

            if (activeMenu === 'ROLE') {
                const options = uniqueRoles.map(roleID => {
                    const r = guild.roles.cache.get(roleID);
                    return { label: r ? r.name : `Bilinmeyen Rol (${roleID})`, value: roleID, default: roleID === currentFilterRole };
                });
                containerComponents.push({ type: 1, components: [{ type: 3, custom_id: "apply_role_filter", placeholder: "Filtrelemek istediğiniz rolü seçin", options }] });
            } else if (activeMenu === 'STAFF') {
                const options = await Promise.all(uniqueAuthorIDs.map(async (authorID) => {
                    const u = await client.users.fetch(authorID).catch(() => null);
                    return { label: u ? u.tag : `Bilinmeyen Yetkili (${authorID})`, value: authorID, default: authorID === currentFilterStaff };
                }));
                containerComponents.push({ type: 1, components: [{ type: 3, custom_id: "apply_staff_filter", placeholder: "Filtrelemek istediğiniz yetkiliyi seçin", options }] });
            }

            containerComponents.push({
                type: 1,
                components: [
                    { type: 2, custom_id: "prev", style: 2, emoji: prevEmojiObj, disabled: page === 0 },
                    { type: 2, custom_id: "filter_role_btn", label: "Rol Filtresi", style: activeMenu === 'ROLE' ? 3 : (currentFilterRole ? 1 : 2) },
                    { type: 2, custom_id: "filter_staff_btn", label: "Yetkili Filtresi", style: activeMenu === 'STAFF' ? 3 : (currentFilterStaff ? 1 : 2) },
                    { type: 2, custom_id: "next", style: 2, emoji: nextEmojiObj, disabled: page >= totalPages - 1 }
                ]
            });

            containerComponents.push({
                type: 1,
                components: [
                    { type: 2, custom_id: "filter_reset", label: "Filtreleri Sıfırla", style: 4, disabled: !currentFilterRole && !currentFilterStaff && !activeMenu }
                ]
            });

            return [{
                type: 17,
                components: containerComponents
            }];
        };

        const msg = await context.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: await getComponents(currentPage),
            allowedMentions: { parse: [] },
            fetchReply: true
        });

        const msgObj = isInteraction ? await context.fetchReply() : msg;

        const collector = msgObj.createMessageComponentCollector({
            time: 300000
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== author.id) {
                return i.reply({ content: "Bu menüyü sadece komutu kullanan kişi kontrol edebilir.", ephemeral: true });
            }

            const currentLogs = getFilteredLogs();
            const totalPages = Math.ceil(currentLogs.length / pageSize) || 1;

            if (i.customId === "prev") { currentPage = Math.max(0, currentPage - 1); activeMenu = null; }
            else if (i.customId === "next") { currentPage = Math.min(totalPages - 1, currentPage + 1); activeMenu = null; }
            else if (i.customId === "filter_reset") { currentFilterRole = null; currentFilterStaff = null; currentPage = 0; activeMenu = null; }
            else if (i.customId === "filter_role_btn") { activeMenu = activeMenu === 'ROLE' ? null : 'ROLE'; }
            else if (i.customId === "filter_staff_btn") { activeMenu = activeMenu === 'STAFF' ? null : 'STAFF'; }
            else if (i.customId === "jump_page") { currentPage = parseInt(i.values[0]); activeMenu = null; }
            else if (i.customId === "apply_role_filter") { currentFilterRole = i.values[0]; currentPage = 0; activeMenu = null; }
            else if (i.customId === "apply_staff_filter") { currentFilterStaff = i.values[0]; currentPage = 0; activeMenu = null; }

            await i.update({ components: await getComponents(currentPage) }).catch(() => {});
        });

        collector.on("end", () => {
            getComponents(currentPage).then(comps => {
                if (isInteraction) {
                    context.editReply({ components: [comps[0]] }).catch(() => { });
                } else {
                    msgObj.edit({ components: [comps[0]] }).catch(() => { });
                }
            });
        });
    }
}

module.exports = RolLogService;
