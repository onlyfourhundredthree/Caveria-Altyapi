const { AttachmentBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const StaffRoleSystem = require("../../../Core/Database/StaffRoleSystem");
const { renderDenetimCanvas } = require("../../../Services/Staff/DenetimTestCanvas");

module.exports = {
    conf: {
        description: "DenetimTest komutu.",
        aliases: ["denetimtest"],
        name: "denetimtest",
        help: "denetimtest <@kullanıcı/ID> veya <@rol/ID>",
        category: "Staff"
    },

    run: async (client, message, args) => {
        const allowedRoles = ConfigManager.get("Roles.Responsibilities.TaskStaff") || [];
        const hasPermission = ConfigManager.isOwner(message.member) || allowedRoles.some(r => message.member.roles.cache.has(r));
        if (!hasPermission) return;

        if (!args[0]) return message.reply("Lütfen denetlenecek bir kullanıcı veya rol belirtin.");

        const roleOpt = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        const userOpt = !roleOpt ? (message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null)) : null;

        if (!userOpt && !roleOpt) {
            return message.reply("Lütfen geçerli bir kullanıcı veya rol belirtin.");
        }

        const guildID = message.guild.id;
        const allRanks = await StaffRoleSystem.find({ guildID, active: true }).sort({ requiredXP: 1 });
        const staffIDs = allRanks.map(r => r.roleID);

        let targetMembers = [];

        if (roleOpt) {
            targetMembers = Array.from(roleOpt.members.values()).filter(m => !m.user.bot && staffIDs.some(rid => m.roles.cache.has(rid)));
            if (targetMembers.length === 0) {
                return message.reply("Seçilen rolde aktif yetkili bulunamadı.");
            }
        } else {
            const isStaff = staffIDs.some(roleID => userOpt.roles.cache.has(roleID));
            if (!isStaff) return message.reply("Belirtilen kullanıcının yetkili rolü bulunmuyor.");
            targetMembers = [userOpt];
        }

        let currentIndex = 0;

        const buildPanel = async (member, index, total) => {
            const buffers = await renderDenetimCanvas(client, member.user, member);
            if (!buffers || buffers.length === 0) return null;

            const attachments = [];
            const containerComponents = [];

            for (let i = 0; i < buffers.length; i++) {
                attachments.push(new AttachmentBuilder(buffers[i], { name: `denetim_${member.id}_${i}.png` }));
                containerComponents.push({
                    type: 12, // Container
                    items: [{ media: { url: `attachment://denetim_${member.id}_${i}.png` } }]
                });
                
                if (i !== buffers.length - 1) {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                }
            }
            
            const actionRow1 = {
                type: 1,
                components: [
                    { type: 2, custom_id: `gd_complete_${member.id}`, label: "Görev Tamamlandı", style: 1 },
                    { type: 2, custom_id: `gd_add_${member.id}`, label: "Görev Ekle", style: 3 },
                    { type: 2, custom_id: `gd_remove_${member.id}`, label: "Görev Çıkar", style: 4 },
                    { type: 2, custom_id: `gd_reset_${member.id}`, label: "Sıfırla", style: 4 }
                ]
            };

            const components = [
                { type: 17, components: containerComponents },
                actionRow1
            ];

            if (total > 1) {
                const navRow = {
                    type: 1,
                    components: [
                        { type: 2, custom_id: `gd_prev`, label: "Önceki", style: 2, disabled: index === 0 },
                        { type: 2, custom_id: `gd_next`, label: "Sonraki", style: 2, disabled: index === total - 1 },
                        { type: 2, custom_id: `gd_info`, label: `${index + 1}/${total} - ${member.user.username}`, style: 2, disabled: true }
                    ]
                };
                components.push(navRow);
            }

            return {
                content: null,
                files: attachments,
                components,
                flags: [1 << 15] // MessageFlags.IsComponentsV2
            };
        };

        const msg = await message.reply("Canvas verileri oluşturuluyor, lütfen bekleyin...");
        const payload = await buildPanel(targetMembers[0], 0, targetMembers.length);
        if (!payload) return msg.edit("Görsel oluşturulurken hata oluştu veya yetkili değil.");

        const panelMsg = await msg.edit(payload);

        const filter = i => i.user.id === message.author.id;
        const collector = panelMsg.createMessageComponentCollector({ filter, time: 300000 });

        collector.on("collect", async (i) => {
            if (i.customId === "gd_prev") {
                currentIndex--;
                await i.deferUpdate();
                const pl = await buildPanel(targetMembers[currentIndex], currentIndex, targetMembers.length);
                if (pl) await panelMsg.edit(pl);
            } else if (i.customId === "gd_next") {
                currentIndex++;
                await i.deferUpdate();
                const pl = await buildPanel(targetMembers[currentIndex], currentIndex, targetMembers.length);
                if (pl) await panelMsg.edit(pl);
            } else {
                // To keep this test simple and focused on UI, we just say feature coming soon. 
                // Full integration of completion buttons requires importing TaskManager, StaffUser logic from GorevDenetim.js.
                // We'll instruct the user that the logic will be ported once the UI is approved.
                await i.reply({ content: "Bu işlem şu an test (UI) aşamasındadır. Sisteme tam entegre edildiğinde çalışacaktır.", ephemeral: true });
            }
        });

        collector.on("end", () => {
            panelMsg.edit({ components: [] }).catch(() => {});
        });
    }
};
