const { PermissionsBitField, MessageFlags } = require("discord.js");
const Ticket = require("../../../Core/Database/Ticket");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["ticketbugfix", "ticketbufix", "ticket-bug-fix", "ticket-sifirla"],
        description: "Buga giren (kanalı silinmiş ama veritabanında açık görünen) bilet verisini temizler.",
        category: "Staff",
        usage: ".ticketbugfix <@kullanıcı/ID>"
    },

    run: async (client, message, args) => {
        const allowedRoles = ConfigManager.get("Roles.Responsibilities.TicketManager") || [];
        const hasPermission = ConfigManager.isOwner(message.member) || message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || allowedRoles.some(r => message.member.roles.cache.has(r));
        
        if (!hasPermission) {
            return message.reply("Bu komutu kullanmak için yetkiniz yok.");
        }

        const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

        if (!target) {
            return message.reply("Lütfen verisi sıfırlanacak kullanıcıyı etiketleyin veya ID'sini girin.");
        }

        const activeTickets = await Ticket.find({ guildID: message.guild.id, userID: target.id, active: true });

        if (activeTickets.length === 0) {
            return message.reply("Bu kullanıcının veritabanında zaten aktif bir bileti (ticketi) bulunmuyor. Ticket açmasına engel bir durum yok.");
        }

        await Ticket.deleteMany({ guildID: message.guild.id, userID: target.id, active: true });

        const emojis = ConfigManager.get("Emojis") || {};
        const toji_onay = emojis.toji_onay || "✅";
        
        return message.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `> ${toji_onay} **Başarılı!** ${target} kullanıcısının veritabanında askıda kalan (buga giren) **${activeTickets.length}** adet aktif bilet kaydı temizlendi. Artık sorunsuzca yeni bilet oluşturabilir.`
                }]
            }]
        });
    }
};
