const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const { PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    conf: {
        usages: ["sil", "temizle", "clear", "purge", "delete", "mesaj-sil", "mesaj-temizle", "mesaj-silme"],
        description: "Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.",
        category: "Staff",
        usage: ".sil <miktar|amount> | .sil hepsi"
    },

    run: async (client, message, args) => {
        const emojis = ConfigManager.get("Emojis") || {};
        const toji_info = emojis.toji_info || "ℹ️";
        const toji_nokta = emojis.toji_nokta || "⛔";

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !ConfigManager.isOwner(message.member)) {
            return message.reply({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_info} Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısınız.` }] }]
            }).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        }

        let amount = args[0];

        if (amount && ["hepsi", "all", "tümü", "h"].includes(amount.toLowerCase())) {
            let deletedCount = 0;
            let deleted;
            do {
                deleted = await message.channel.bulkDelete(100, true).catch(() => new Map());
                deletedCount += deleted.size;
            } while (deleted && deleted.size > 0);

            return message.channel.send({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_nokta} Kanalda 14 günden yeni olan toplam **${deletedCount}** adet mesaj başarıyla silindi.` }] }]
            }).then(x => setTimeout(() => x.delete().catch(() => { }), 8000));
        }

        if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_info} Lütfen 1 ile 100 arasında bir sayı belirtin veya **.sil hepsi** yazın.` }] }]
            }).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        }

        await message.delete().catch(() => { });

        message.channel.bulkDelete(amount, true).then(deletedMessages => {
            message.channel.send({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_nokta} Başarıyla **${deletedMessages.size}** adet mesaj silindi.` }] }]
            }).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        });
    },
};

