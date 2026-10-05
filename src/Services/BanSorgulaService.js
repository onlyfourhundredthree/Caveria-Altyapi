const ConfigManager = require("../Handlers/ConfigManager");
const { PermissionsBitField, MessageFlags, AttachmentBuilder } = require('discord.js');
const Punitives = require("../Core/Database/Punitives");
const { renderBanTable } = require("../Utils/BanSorgulaCanvas");

class BanSorgulaService {
    static async execute(context, targetUserResolvable) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const client = context.client;
        const guild = context.guild;

        if (isInteraction) {
            await context.deferReply().catch(() => {});
        }

        const warnStaff = ConfigManager.get("Roles.Warn_Staff") || [];
        const banStaff = ConfigManager.get("Roles.Ban_Staff") || [];
        const isOwner = ConfigManager.isOwner(member);
        const isStaff = isOwner || member.permissions.has(PermissionsBitField.Flags.Administrator) || warnStaff.some(roleId => member.roles.cache.has(roleId)) || banStaff.some(roleId => member.roles.cache.has(roleId));

        if (!isStaff) {
            const replyObj = { content: "Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz." };
            if (isInteraction) return context.editReply(replyObj).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
            return context.reply(replyObj).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        }

        let user = targetUserResolvable;
        if (typeof targetUserResolvable === 'string') {
            user = client.users.cache.get(targetUserResolvable) || await client.users.fetch(targetUserResolvable).catch(() => null);
            if (!user) user = { id: targetUserResolvable, tag: "Bilinmeyen Üye #" + targetUserResolvable };
        }

        if (!user || (typeof user === 'object' && !user.id)) {
            const err = { content: "Lütfen geçerli bir kullanıcı veya ID belirtiniz." };
            if (isInteraction) return context.editReply(err).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
            return context.reply(err);
        }

        const targetId = user.id;
        const emojis = ConfigManager.get("Emojis") || {};
        const itemEmoji = emojis.toji_nokta || "-";

        // Fetch all ban history from database
        let banHistory = await Punitives.find({ 
            Member: targetId, 
            Type: { $in: ["Kalkmaz Yasaklama", "Yasaklama", "Underworld"] } 
        }).sort({ Date: -1 }).lean();

        // Also check if they are currently banned via Discord but not in DB
        const guildBan = await guild.bans.fetch(targetId).catch(() => null);
        if (guildBan) {
            const isAlreadyActiveInDb = banHistory.some(b => b.Active);
            if (!isAlreadyActiveInDb) {
                banHistory.unshift({
                    No: "N/A",
                    Active: true,
                    Type: "Discord Yasaklaması",
                    Reason: guildBan.reason || "Sebep belirtilmemiş.",
                    Date: Date.now()
                });
            }
        }

        const totalCezalar = banHistory.length;
        const pageSize = 10;
        let currentPage = 0;
        let totalPages = Math.ceil(totalCezalar / pageSize) || 1;

        const getBanLayout = (page) => {
            const start = page * pageSize;
            const end = start + pageSize;
            const currentBans = banHistory.slice(start, end);

            const avatarUrl = user.displayAvatarURL ? user.displayAvatarURL({ extension: 'png' }) : client.user.displayAvatarURL();

            const containerComponents = [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: avatarUrl },
                    },
                    components: [
                        {
                            type: 10,
                            content: `## Ban Sorgulama Sonucu\n${itemEmoji} **Kullanıcı:** <@${targetId}> (\`${targetId}\`)\n${itemEmoji} **Toplam Ban Kaydı:** \`${totalCezalar}\``
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 }
            ];

            let attachment = null;
            if (currentBans.length > 0) {
                const tableBuffer = renderBanTable(currentBans, page, totalPages, totalCezalar);
                attachment = new AttachmentBuilder(tableBuffer, { name: 'ban_table.png' });
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: 'attachment://ban_table.png' } }]
                });
            } else {
                containerComponents.push({
                    type: 10,
                    content: `> ✨ Bu kullanıcıya ait aktif veya geçmiş bir yasaklama kaydı bulunamadı.`
                });
            }

            // Pagination Buttons
            if (totalPages > 1) {
                containerComponents.push({ type: 14, divider: true, spacing: 1 });
                containerComponents.push({
                    type: 1,
                    components: [
                        { type: 2, custom_id: 'prev_ban_page', style: 2, emoji: { name: '⬅️' }, disabled: page === 0 },
                        { type: 2, custom_id: 'next_ban_page', style: 2, emoji: { name: '➡️' }, disabled: page >= totalPages - 1 }
                    ]
                });
            }

            return { components: [{ type: 17, components: containerComponents }], attachment };
        };

        const layout = getBanLayout(currentPage);
        const payload = {
            flags: [MessageFlags.IsComponentsV2],
            components: layout.components,
            files: layout.attachment ? [layout.attachment] : [],
            allowedMentions: { repliedUser: false }
        };

        let initialMsg;
        if (isInteraction) {
            initialMsg = await context.editReply(payload);
        } else {
            payload.fetchReply = true;
            initialMsg = await context.reply(payload);
        }

        if (totalPages > 1) {
            const collector = initialMsg.createMessageComponentCollector({
                filter: i => i.user.id === member.id,
                time: 300000
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'prev_ban_page') currentPage--;
                else if (i.customId === 'next_ban_page') currentPage++;

                const newLayout = getBanLayout(currentPage);
                await i.update({
                    components: newLayout.components,
                    files: newLayout.attachment ? [newLayout.attachment] : []
                }).catch(() => {});
            });

            collector.on('end', () => {
                const finalLayout = getBanLayout(currentPage);
                initialMsg.edit({ components: finalLayout.components, files: finalLayout.attachment ? [finalLayout.attachment] : [] }).catch(() => {});
            });
        }
    }
}

module.exports = BanSorgulaService;
