const { PermissionsBitField, EmbedBuilder, MessageFlags } = require("discord.js");
const Ticket = require("../../../Core/Database/Ticket");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["ticket", "destek", "destek-talebi", "ticket-sistemi"],
        description: "Destek talebinde üye ekleme, çıkarma ve mesaj izni verme işlemlerini yapmanızı sağlar.",
        category: "Staff",
        usage: ".ticket ekle/çıkar/izin @üye"
    },


    run: async (client, message, args) => {
        let ticketData = await Ticket.findOne({ channelID: message.channel.id });

        if (!ticketData) {
            return message.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> **Hata:** Bu komut sadece destek taleplerinde kullanılabilir." }]
                }],
                allowedMentions: { repliedUser: false }
            });
        }

        const StaffRank = require("../../../Core/Database/StaffRank");
        const dbRanks = await StaffRank.find({ guildID: message.guild.id });
        const rankRoles = dbRanks.map(r => r.roleID).filter(Boolean);
        const ticketStaffRoles = ConfigManager.get("Roles.Responsibilities.TicketStaff") || [];

        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        const isStaff = rankRoles.some(role => message.member.roles.cache.has(role)) || ticketStaffRoles.some(role => message.member.roles.cache.has(role));

        const isOwner = ConfigManager.isOwner(message.member);
        if (!isAdmin && !isStaff && !isOwner) {
            return message.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Bu komutu kullanmak için yetkiniz yok." }]
                }],
                allowedMentions: { repliedUser: false }
            });
        }

        const action = args[0]?.toLowerCase();
        if (!action) return message.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [{ type: 10, content: "> ?? **Kullanım:** `.ticket ekle/çıkar/izin @üye`" }]
            }],
            allowedMentions: { repliedUser: false }
        });

        let member = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
        if (!member) return message.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Lütfen bir üye belirtin." }]
            }],
            allowedMentions: { repliedUser: false }
        });

        if (action === "ekle") {
            await message.channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                SendMessages: true,
                AttachFiles: true
            }).catch(() => { });

            return message.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${member} kullanıcısı başarıyla destek talebine eklendi.` }]
                }],
                allowedMentions: { repliedUser: false }
            });
        }

        if (action === "çıkar" || action === "cikar") {
            if (member.id === ticketData.userID) {
                return message.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Destek talebi sahibini kanaldan çıkartamazsınız!" }]
                    }],
                    allowedMentions: { repliedUser: false }
                });
            }

            await message.channel.permissionOverwrites.edit(member.id, { ViewChannel: false }).catch(() => { });

            return message.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${member} kullanıcısı başarıyla destek talebinden çıkartıldı.` }]
                }],
                allowedMentions: { repliedUser: false }
            });
        }

        if (action === "izin") {
            const isPermitted = ticketData.permittedUsers.includes(member.id);
            if (isPermitted) {
                ticketData.permittedUsers = ticketData.permittedUsers.filter(id => id !== member.id);
                await ticketData.save();

                return message.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${member} kullanıcısının mesaj izni **kaldırıldı**.` }]
                    }],
                    allowedMentions: { repliedUser: false }
                });
            } else {
                ticketData.permittedUsers.push(member.id);
                await ticketData.save();

                return message.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${member} kullanıcısına mesaj yazma izni **verildi**.` }]
                    }],
                    allowedMentions: { repliedUser: false }
                });
            }
        }
    },
};

