const { AttachmentBuilder } = require("discord.js");
const { renderTaskCanvas } = require("../../../Services/Staff/TaskCanvas");

module.exports = {
    conf: {
        aliases: ["görev", "tasks", "gorevlerim", "gorev"],
        name: "görevlerim",
        help: "görevlerim [@Kullanıcı]",
        category: "Staff"
    },
    run: async (client, message, args) => {
        const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
        const member = targetUser ? await message.guild.members.fetch(targetUser.id).catch(() => null) : null;

        if (!member) {
            return message.reply("Belirtilen kullanıcı sunucuda bulunamadı.");
        }

        const msg = await message.reply("Görev bilgileri Canvas üzerinden hazırlanıyor, lütfen bekleyin...");
        
        try {
            const buffers = await renderTaskCanvas(client, targetUser, member);
            if (!buffers || buffers.length === 0) {
                return msg.edit("Bu kullanıcının yetkili bilgisi bulunamadı.");
            }

            const attachments = buffers.map((buf, i) => new AttachmentBuilder(buf, { name: `task_panel_${i}.png` }));
            
            const containerComponents = [];
            for (let i = 0; i < buffers.length; i++) {
                containerComponents.push({
                    type: 12, // Container
                    items: [{ media: { url: `attachment://task_panel_${i}.png` } }]
                });
                if (i !== buffers.length - 1) {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                }
            }

            const components = [{ type: 17, components: containerComponents }];
            return msg.edit({
                content: null,
                components,
                files: attachments,
                flags: [1 << 15]
            });
        } catch (error) {
            console.error("GörevTest komutu hatası:", error);
            await msg.edit("Görsel oluşturulurken bir hata meydana geldi.");
        }
    }
};
