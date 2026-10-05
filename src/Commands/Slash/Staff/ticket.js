const { SlashCommandBuilder, PermissionsBitField, MessageFlags, EmbedBuilder } = require("discord.js");
const Ticket = require("../../../Core/Database/Ticket");
const TicketBan = require("../../../Core/Database/TicketBan");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket")
        .setDescription("Destek talebi ve yetkilendirme sistemi yönetim komutları.")
        .addSubcommand(sub =>
            sub.setName("ekle")
                .setDescription("Destek talebine bir kullanıcı ekler.")
                .addUserOption(opt => opt.setName("kullanıcı").setDescription("Eklenecek kullanıcı").setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("çıkar")
                .setDescription("Destek talebinden bir kullanıcıyı çıkarır.")
                .addUserOption(opt => opt.setName("kullanıcı").setDescription("Çıkarılacak kullanıcı").setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("izin")
                .setDescription("Bir kullanıcıya özel bir yetki/izin sağlar.")
                .addUserOption(opt => opt.setName("kullanıcı").setDescription("Kullanıcı").setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("banla")
                .setDescription("Bir kullanıcının ticket açmasını yasaklar.")
                .addUserOption(opt => opt.setName("kullanıcı").setDescription("Yasaklanacak kullanıcı").setRequired(true))
                .addStringOption(opt => opt.setName("sebep").setDescription("Yasaklama sebebi").setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("ban-kaldir")
                .setDescription("Bir kullanıcının ticket açma yasağını kaldırır.")
                .addUserOption(opt => opt.setName("kullanıcı").setDescription("Yasağı kaldırılacak kullanıcı").setRequired(true)))
        .addSubcommand(sub =>
            sub.setName("ban-liste")
                .setDescription("Ticket açması yasaklanan tüm kullanıcıları listeler.")),

    async execute(interaction) {
        const { channel, member, guild, options } = interaction;
        const subcommand = options.getSubcommand();
        let targetMember = null;
        if (subcommand !== "ban-liste") {
            targetMember = options.getMember("kullanıcı");
            if (!targetMember && subcommand !== "banla" && subcommand !== "ban-kaldir") { // fallback for ID inputs which might not be in cache immediately
                const userOpt = options.getUser("kullanıcı");
                if (userOpt) targetMember = await guild.members.fetch(userOpt.id).catch(() => null);
            }
        }

        const requiresTicketData = ["ekle", "çıkar", "izin"];
        let ticketData = null;
        if (requiresTicketData.includes(subcommand)) {
            ticketData = await Ticket.findOne({ guildID: guild.id, channelID: channel.id });
        }

        if (requiresTicketData.includes(subcommand) && !ticketData) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Bu komut sadece destek taleplerinde kullanılabilir." }]
                }]
            });
        }

        const StaffRank = require("../../../Core/Database/StaffRank");
        const dbRanks = await StaffRank.find({ guildID: guild.id });
        const rankRoles = dbRanks.map(r => r.roleID).filter(Boolean);
        const ticketStaffRoles = ConfigManager.get("Roles.Responsibilities.TicketStaff") || [];

        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
        const isStaff = rankRoles.some(role => member.roles.cache.has(role)) || ticketStaffRoles.some(role => member.roles.cache.has(role));

        const isOwner = ConfigManager.isOwner(member);
        if (!isAdmin && !isStaff && !isOwner) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Bu komutu kullanmak için yetkiniz yok." }]
                }]
            });
        }

        if (subcommand !== "ban-liste" && !targetMember) {
            // For ban/unban we can operate on raw User ID if member isn't in server
            const rawUser = options.getUser("kullanıcı");
            if (!rawUser) {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Belirtilen kullanıcı bulunamadı." }]
                    }]
                });
            }
        }

        if (subcommand === "ekle") {
            await channel.permissionOverwrites.edit(targetMember.id, {
                ViewChannel: true,
                SendMessages: true,
                AttachFiles: true
            });

            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${targetMember} kullanıcısı başarıyla destek talebine eklendi.` }]
                }]
            });
        }

        if (subcommand === "çıkar") {
            if (targetMember.id === ticketData.userID) {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: "> " + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Destek talebi sahibini kanaldan çıkartamazsınız!" }]
                    }]
                });
            }

            await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: false });

            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${targetMember} kullanıcısı başarıyla destek talebinden çıkartıldı.` }]
                }]
            });
        }

        if (subcommand === "izin") {
            const isPermitted = ticketData.permittedUsers.includes(targetMember.id);
            if (isPermitted) {
                ticketData.permittedUsers = ticketData.permittedUsers.filter(id => id !== targetMember.id);
                await ticketData.save();

                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${targetMember} kullanıcısının mesaj izni **kaldırıldı**.` }]
                    }]
                });
            } else {
                ticketData.permittedUsers.push(targetMember.id);
                await ticketData.save();

                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✨"} ${targetMember} kullanıcısına mesaj yazma izni **verildi**.` }]
                    }]
                });
            }
        }

        const ticketManagerRoles = ConfigManager.get("Roles.Responsibilities.TicketManager") || [];
        const isManager = ticketManagerRoles.some(role => member.roles.cache.has(role));
        if (["banla", "ban-kaldir", "ban-liste"].includes(subcommand) && !isAdmin && !isManager) {
            return interaction.reply({ content: "Bu işlemi yapmak için yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === "banla") {
            const reason = options.getString("sebep");
            const user = options.getUser("kullanıcı");

            const existing = await TicketBan.findOne({ guildID: guild.id, userID: user.id });
            if (existing) {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_iptal") || "✨"} **Hata:** <@${user.id}> zaten destek talebi sisteminden yasaklanmış.` }]
                    }]
                });
            }

            await TicketBan.create({
                guildID: guild.id,
                userID: user.id,
                staffID: member.id,
                reason: reason,
                date: Date.now()
            });

            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✅"} <@${user.id}> kullanıcısı destek talebi sisteminden yasaklandı.` }]
                }]
            });
        }

        if (subcommand === "ban-kaldir") {
            const user = options.getUser("kullanıcı");

            const existing = await TicketBan.findOne({ guildID: guild.id, userID: user.id });
            if (!existing) {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_iptal") || "✨"} **Hata:** <@${user.id}> kullanıcısının destek talebi yasağı bulunmuyor.` }]
                    }]
                });
            }

            await TicketBan.deleteOne({ guildID: guild.id, userID: user.id });

            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_onay") || "✅"} <@${user.id}> kullanıcısının destek talebi yasağı kaldırıldı.` }]
                }]
            });
        }

        if (subcommand === "ban-liste") {
            const bans = await TicketBan.find({ guildID: guild.id }).sort({ date: -1 });

            if (bans.length === 0) {
                return interaction.reply({
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `> ${ConfigManager.get("Emojis.toji_nokta") || "🔹"} Sunucuda destek talebi sisteminden yasaklanan kimse bulunmuyor.` }]
                    }]
                });
            }

            const list = bans.map((b, i) => `**${i + 1}.** <@${b.userID}> - Yetkili: <@${b.staffID}> - Sebep: \`${b.reason}\``).join("\n");
            
            const embed = new EmbedBuilder()
                .setTitle("Destek Talebi Yasaklıları")
                .setDescription(list)
                .setColor("Red");

            return interaction.reply({ embeds: [embed] });
        }
    }
};

