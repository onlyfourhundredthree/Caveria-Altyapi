const {
    ChannelType,
    PermissionsBitField,
    MessageFlags
} = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Ticket = require("../../Core/Database/Ticket");
const TicketBan = require("../../Core/Database/TicketBan");
const TicketPanel = require("../../Core/Database/TicketPanel");
const Counter = require("../../Core/Database/Counter");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const transcriptHandler = require("../../Core/Handlers/TranscriptHandler");
const moment = require("moment");
require("moment-duration-format");
const client = global.bot;

function parseEmoji(str) {
    if (!str) return null;
    const match = str.match(/<(a?):(\w+):(\d+)>/);
    if (match) {
        return { animated: !!match[1], name: match[2], id: match[3] };
    }
    if (str.length <= 2) return { name: str };
    return null;
}

const r2 = new S3Client({
    region: "auto",
    endpoint: "https://3adbed4d7d394b5854b80abf588d5fc3.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: "a827b158a0c903d4594dafa8522b5c98",
        secretAccessKey: "03c73be129999a5e7b397d530370075110d04e9b2ac56133531754044663d432"
    }
});

module.exports = async (interaction) => {
    if (!interaction.guild) return;

    if (interaction.isButton() && (interaction.customId === "create_ticket" || interaction.customId.startsWith("ticket_start_"))) {
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        const panelId = interaction.customId.startsWith("ticket_start_") ? interaction.customId.split("ticket_start_")[1] : "default";
        
        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${panelId}`)
            .setTitle("Destek Talebi Oluştur");

        const ticketBan = await TicketBan.findOne({ guildID: interaction.guild.id, userID: interaction.user.id });
        if (ticketBan) {
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [{
                    type: 17,
                    components: [{
                        type: 10,
                        content: `> ${ConfigManager.get("Emojis.Red") || "❌"} **Hata:** Destek talebi açmanız yasaklanmıştır.\n` +
                            `> ${ConfigManager.get("Emojis.toji_sign") || "📋"} **Sebep:** \`\`\`${ticketBan.reason || "Belirtilmemiş"}\`\`\`\n` +
                            `> ${ConfigManager.get("Emojis.toji_staff") || "👮"} **Yasaklayan Yetkili:** <@${ticketBan.staffID}>`
                    }]
                }]
            });
        }

        const activeTicket = await Ticket.findOne({ userID: interaction.user.id });
        if (activeTicket) {
            return interaction.reply({
                content: "Zaten aktif bir destek talebiniz bulunuyor.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        let questions = [{ question: "Sorununuzu kısaca anlatın" }];
        if (panelId !== "default") {
            const panel = await TicketPanel.findOne({ customId: panelId, guildID: interaction.guild.id });
            if (panel && panel.questions && panel.questions.length > 0) {
                questions = panel.questions;
            }
        }

        questions.forEach((q, index) => {
            const reasonInput = new TextInputBuilder()
                .setCustomId(`ticket_reason_${index}`)
                .setLabel(q.question.substring(0, 45)) // Modal label limit
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        });

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const panelId = interaction.customId.split("ticket_modal_")[1];
        let panel = null;
        let reason = "";

        if (panelId !== "default") {
            panel = await TicketPanel.findOne({ customId: panelId, guildID: interaction.guild.id });
        }

        const questions = (panel && panel.questions && panel.questions.length > 0) 
            ? panel.questions 
            : [{ question: "Sorununuzu kısaca anlatın" }];

        questions.forEach((q, index) => {
            const val = interaction.fields.getTextInputValue(`ticket_reason_${index}`);
            if (questions.length === 1 && q.question === "Sorununuzu kısaca anlatın") {
                reason += `${val}\n\n`;
            } else {
                reason += `**${q.question}:**\n${val}\n\n`;
            }
        });
        reason = reason.trim();

        const counter = await Counter.findOneAndUpdate(
            { _id: "ticketID" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const ticketID = counter.seq.toString();

        const guild = interaction.guild;
        const user = interaction.user;

        const rawCategory = (panel && panel.categoryId) || ConfigManager.get("Channels.TicketCategory");
        const parentCategory = (typeof rawCategory === "string" && rawCategory.trim().length > 0) ? rawCategory.trim() : null;

        const channel = await guild.channels.create({
            name: `talep-${ticketID}`,
            type: ChannelType.GuildText,
            parent: parentCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks]
                },
                {
                    id: guild.members.me.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks]
                }
            ]
        });

        const ticketStaffRoles = panel && panel.staffRoles.length > 0 ? panel.staffRoles : (ConfigManager.get("Roles.Responsibilities.TicketStaff") || []);
        for (const roleId of ticketStaffRoles) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                await channel.permissionOverwrites.edit(role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                }).catch(() => { });
            }
        }

        const ticketManagerRoles = panel && panel.managerRoles.length > 0 ? panel.managerRoles : (ConfigManager.get("Roles.Responsibilities.TicketManager") || []);
        for (const roleId of ticketManagerRoles) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                await channel.permissionOverwrites.edit(role.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                    ManageMessages: true,
                    ManageChannels: true
                }).catch(() => { });
            }
        }

        const adminAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
        const ticketStaffMentions = ticketStaffRoles.length > 0 ? ticketStaffRoles.map(id => `<@&${id}>`).join(" ") : "";

        const mainV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: adminAvatar }
                        },
                        components: [
                            {
                                type: 10,
                                content: `> ## ${ConfigManager.get("Emojis.toji_ticket") || (ConfigManager.get("Emojis.toji_sparkles") || "✨")} Destek Talebi #${ticketID}\n> ## ${ticketStaffMentions}\n> -# Merhaba ${user}, destek talebiniz başarıyla oluşturuldu!\n> -# Lütfen sorununuzu detaylıca açıklayınız. Yetkililerimiz ilgilenecektir.`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> **Gönderen:** ${user} (\`${user.id}\`)\n` +
                            `> **Talep Sebebi:**\n\`\`\`${reason}\`\`\``
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### **Komut Bilgilendirmesi**\n` +
                            `> -# Talebe üye eklemek veya çıkarmak için aşağıdaki menüyü kullanabilirsiniz:`
                    },
                    {
                        type: 1,
                        components: [
                            { type: 5, custom_id: "ticket_user_manage", placeholder: "Talebe Üye Ekle / Çıkar", max_values: 10 }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: "ticket_take", label: "Talebi Devral", style: 1 },
                            { type: 2, custom_id: "ticket_lock_toggle", label: "Talebi Kilitle/Aç", style: 2 },
                            { type: 2, custom_id: "ticket_resolved", label: "Sorunum Çözüldü", style: 3 },
                            { type: 2, custom_id: "ticket_close", label: "Talebi Kapat", style: 4 },
                            { type: 2, custom_id: "ticket_ban_user", label: "Banla", style: 4 }
                        ]
                    }
                ]
            }
        ];

        const mainMessage = await channel.send({ components: mainV2, flags: [MessageFlags.IsComponentsV2] });

        const ticketData = new Ticket({
            userID: user.id,
            channelID: channel.id,
            messageID: mainMessage.id,
            ticketID: ticketID,
            panelId: panelId !== "default" ? panelId : "",
            reason: reason,
            date: Date.now(),
            resolved: false,
            locked: false
        });
        await ticketData.save();

        const ticketLogChannel = guild.channels.cache.get(ConfigManager.get("Channels.TicketLog"));
        if (ticketLogChannel) {
            const logV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## ${ConfigManager.get("Emojis.toji_ticket") || (ConfigManager.get("Emojis.toji_sparkles") || "✨")} Yeni Destek Talebi\n> -# ${user} bir destek talebi oluşturdu.`
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `> **Kullanıcı:** ${user} (\`${user.id}\`)\n` +
                                `> **Talep ID:** \`#${ticketID}\`\n` +
                                `> **Kanal:** ${channel}\n` +
                                `> **Sebep:** \`\`\`${reason}\`\`\``
                        }
                    ]
                }
            ];
            await ticketLogChannel.send({ components: logV2, flags: [MessageFlags.IsComponentsV2] });
        }

        const successV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `> ## ${ConfigManager.get("Emojis.Onay") || "✅"} Destek Talebi Oluşturuldu\n> -# Talebiniz başarıyla oluşturuldu. Yetkililerimiz en kısa sürede ilgilenecektir.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> **Talep ID:** \`#${ticketID}\`\n> **Kanal:** ${channel}`
                    }
                ]
            }
        ];

        await interaction.editReply({ components: successV2, flags: [MessageFlags.IsComponentsV2] });
    }

    if (interaction.isButton()) {
        if (!interaction.guild || !interaction.member) return;

        const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
        let ticketStaffRoles = ConfigManager.get("Roles.Responsibilities.TicketStaff") || [];
        let ticketManagerRoles = ConfigManager.get("Roles.Responsibilities.TicketManager") || [];

        if (ticketData && ticketData.panelId) {
            const panel = await TicketPanel.findOne({ customId: ticketData.panelId, guildID: interaction.guild.id });
            if (panel) {
                if (panel.staffRoles.length > 0) ticketStaffRoles = panel.staffRoles;
                if (panel.managerRoles.length > 0) ticketManagerRoles = panel.managerRoles;
            }
        }

        const isStaff = ticketStaffRoles.some(role => interaction.member.roles.cache.has(role));
        const isManager = ticketManagerRoles.some(role => interaction.member.roles.cache.has(role));
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || ConfigManager.isOwner(interaction.member);

        const isClaimedByMe = ticketData && ticketData.staffID === interaction.user.id;
        const canManageTicket = isAdmin || isClaimedByMe;

        if (interaction.customId === "ticket_take") {
            if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });
            if (!isStaff && !isAdmin) return interaction.reply({ content: "Bu işlemi yapmak için yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
            if (ticketData.staffID) return interaction.reply({ content: "Bu talep zaten bir yetkili tarafından devralınmış.", flags: [MessageFlags.Ephemeral] });

            const activeClaim = await Ticket.findOne({ staffID: interaction.user.id, active: true });
            if (activeClaim && !isAdmin) {
                return interaction.reply({ content: `Zaten ilgilendiğiniz aktif bir destek talebiniz var (<#${activeClaim.channelID}>). Lütfen önce onu kapatın veya çözüldü olarak işaretleyin.`, flags: [MessageFlags.Ephemeral] });
            }

            ticketData.staffID = interaction.user.id;
            await ticketData.save();

            await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true
            }).catch(() => { });

            if (ticketData.messageID) {
                try {
                    const axios = require("axios");
                    const res = await axios.get(`https://discord.com/api/v10/channels/${interaction.channel.id}/messages/${ticketData.messageID}`, {
                        headers: { Authorization: `Bot ${client.token}` }
                    });
                    if (res.data && res.data.components) {
                        const comps = res.data.components;
                        if (comps[0] && comps[0].type === 17) {
                            let currentContent = comps[0].components[2].content;
                            currentContent = currentContent.replace(
                                /(> \*\*Gönderen:\*\* .*\n)/,
                                `$1> ${ConfigManager.get("Emojis.toji_staff") || "👮"} **İlgilenen Yetkili:** <@${interaction.user.id}>\n`
                            );
                            comps[0].components[2].content = currentContent;
                            await axios.patch(`https://discord.com/api/v10/channels/${interaction.channel.id}/messages/${ticketData.messageID}`, {
                                components: comps,
                                flags: 32768
                            }, {
                                headers: { Authorization: `Bot ${client.token}` }
                            });
                        }
                    }
                } catch (e) {
                    console.error("V2 message update error:", e.response?.data || e.message);
                }
            }

            await interaction.reply({
                content: `${ConfigManager.get("Emojis.Onay") || "✅"} <@${interaction.user.id}> talebi devraldı.`
            });
        }

        if (interaction.customId === "ticket_lock_toggle") {
            if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });
            if (!ticketData.staffID) return interaction.reply({ content: "Bu işlem için talebin önce devralınması gerekiyor.", flags: [MessageFlags.Ephemeral] });
            if (!canManageTicket) return interaction.reply({ content: "Bu işlemi sadece talebi devralan yetkili veya yöneticiler yapabilir.", flags: [MessageFlags.Ephemeral] });

            ticketData.locked = !ticketData.locked;
            await ticketData.save();

            await interaction.channel.permissionOverwrites.edit(ticketData.userID, {
                SendMessages: ticketData.locked ? false : true
            }).catch(() => { });

            await interaction.reply({
                content: ticketData.locked ? "Talep kilitlendi." : "Talep kilidi açıldı."
            });
        }

        if (interaction.customId === "ticket_resolved") {
            if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });

            if (ticketData.userID !== interaction.user.id && !canManageTicket) {
                return interaction.reply({ content: "Bu işlemi sadece talebi oluşturan kişi, devralan yetkili veya yöneticiler yapabilir.", flags: [MessageFlags.Ephemeral] });
            }

            if (ticketData.resolved) {
                return interaction.reply({ content: "Bu destek talebi zaten çözüldü olarak işaretlenmiş.", flags: [MessageFlags.Ephemeral] });
            }

            ticketData.resolved = true;
            await ticketData.save();

            await interaction.reply({
                content: "Sorununuz çözüldü olarak işaretlendi."
            });
        }

        if (interaction.customId === "ticket_close") {
            if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });
            if (!ticketData.staffID && !isAdmin && !isManager) return interaction.reply({ content: "Bu işlem için talebin devralınması gerekiyor.", flags: [MessageFlags.Ephemeral] });
            if (!canManageTicket && !isManager) return interaction.reply({ content: "Bu işlemi sadece talebi devralan yetkili veya yöneticiler yapabilir.", flags: [MessageFlags.Ephemeral] });
            
            const isAssigned = ticketData.staffID === interaction.user.id;
            let canClose = isAdmin || isManager || isStaff;
            let gaveStats = false;
            if (ticketData.staffID) {
                if (isAdmin || (isAssigned && ticketData.resolved)) {
                    gaveStats = true;
                }
            } else if (isAdmin) {
                gaveStats = true;
            }

            if (!canClose) return interaction.reply({ content: "Bu talebi kapatma yetkiniz yok.", flags: [MessageFlags.Ephemeral] });

            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const closeModal = new ModalBuilder()
                .setCustomId("ticket_close_modal")
                .setTitle("Talebi Kapat");

            const subjectInput = new TextInputBuilder().setCustomId("ticket_subject").setLabel("Kapanış Özeti (Örn: Çözüldü, Reddedildi)").setStyle(TextInputStyle.Short).setRequired(true);
            const resultInput = new TextInputBuilder().setCustomId("ticket_result").setLabel("Detaylı Açıklama / Çözüm Notu").setStyle(TextInputStyle.Paragraph).setRequired(true);

            closeModal.addComponents(
                new ActionRowBuilder().addComponents(subjectInput),
                new ActionRowBuilder().addComponents(resultInput)
            );

            await interaction.showModal(closeModal);
        }

        if (interaction.customId === "ticket_ban") {
            if (!isAdmin && !isManager) {
                return interaction.reply({ content: "Bu işlemi yapmak için yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
            }
        }

        if (interaction.customId === "ticket_ban_user") {
            if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });
            if (!ticketData.staffID) return interaction.reply({ content: "Bu işlem için talebin önce devralınması gerekiyor.", flags: [MessageFlags.Ephemeral] });
            if (!canManageTicket) return interaction.reply({ content: "Bu işlemi sadece talebi devralan yetkili veya yöneticiler yapabilir.", flags: [MessageFlags.Ephemeral] });

            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
            const banModal = new ModalBuilder()
                .setCustomId("ticket_ban_modal")
                .setTitle("Destek Talebi Yasaklama");

            const reasonInput = new TextInputBuilder()
                .setCustomId("ticket_ban_reason")
                .setLabel("Yasaklama Sebebi")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            banModal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
            await interaction.showModal(banModal);
        }
    }

    if (interaction.isUserSelectMenu()) {
        if (!interaction.guild || !interaction.member) return;

        if (interaction.customId === "ticket_user_manage") {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (!ticketData) return interaction.editReply({ content: "Bu kanal bir destek talebi kanalı değil." });

            const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || ConfigManager.isOwner(interaction.member);
            const isClaimedByMe = ticketData.staffID === interaction.user.id;
            const canManageTicket = isAdmin || isClaimedByMe;

            if (!canManageTicket) {
                return interaction.editReply({ content: "Bu işlemi sadece talebi devralan yetkili veya yöneticiler yapabilir." });
            }

            if (!ticketData.permittedUsers) ticketData.permittedUsers = [];
            let added = [];
            let removed = [];

            for (const selectedUserId of interaction.values) {
                const targetMember = await interaction.guild.members.fetch(selectedUserId).catch(() => null);
                if (!targetMember) continue;
                if (targetMember.user.bot) continue;
                if (targetMember.id === ticketData.userID) continue;

                if (ticketData.permittedUsers.includes(targetMember.id)) {
                    await interaction.channel.permissionOverwrites.edit(targetMember.id, {
                        ViewChannel: false
                    }).catch(() => {});
                    
                    ticketData.permittedUsers = ticketData.permittedUsers.filter(id => id !== targetMember.id);
                    removed.push(`<@${targetMember.id}>`);
                } else {
                    await interaction.channel.permissionOverwrites.edit(targetMember.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        AttachFiles: true
                    }).catch(() => {});
                    
                    ticketData.permittedUsers.push(targetMember.id);
                    added.push(`<@${targetMember.id}>`);
                }
            }
            
            await ticketData.save();

            let replyStr = "";
            if (added.length > 0) replyStr += `✨ Eklendi: ${added.join(", ")}\n`;
            if (removed.length > 0) replyStr += `❌ Çıkarıldı: ${removed.join(", ")}\n`;
            if (replyStr === "") replyStr = "Seçilen kullanıcılar üzerinde işlem yapılamadı (Bot veya Talep Sahibi olabilir).";

            return interaction.editReply({ content: replyStr });
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === "ticket_ban_modal") {
        const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
        if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });

        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || ConfigManager.isOwner(interaction.member);
        const isClaimedByMe = ticketData.staffID === interaction.user.id;
        const canManageTicket = isAdmin || isClaimedByMe;

        if (!canManageTicket) {
            return interaction.reply({ content: "Bu işlemi yapmak için yetkiniz yok. Sadece devralan yetkili kullanabilir.", flags: [MessageFlags.Ephemeral] });
        }

        const reason = interaction.fields.getTextInputValue("ticket_ban_reason");
        const userId = ticketData.userID;

        await TicketBan.findOneAndUpdate(
            { guildID: interaction.guild.id, userID: userId },
            { guildID: interaction.guild.id, userID: userId, staffID: interaction.user.id, reason: reason, date: Date.now() },
            { upsert: true, new: true }
        );

        return interaction.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [{
                    type: 10,
                    content: `> ${ConfigManager.get("Emojis.Onay") || "✅"} <@${userId}> kullanıcısının destek talebi yasağı eklendi.`
                }]
            }]
        });
    }

    if (interaction.isModalSubmit() && interaction.customId === "ticket_close_modal") {
            const ticketData = await Ticket.findOne({ channelID: interaction.channel.id });
            if (!ticketData) return interaction.reply({ content: "Bu kanal bir destek talebi kanalı değil.", flags: [MessageFlags.Ephemeral] });

            const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
            const isAssigned = ticketData.staffID === interaction.user.id;
            const ticketStaffRoles = ConfigManager.get("Roles.Responsibilities.TicketStaff") || [];
            const ticketManagerRoles = ConfigManager.get("Roles.Responsibilities.TicketManager") || [];
            
            const isManager = ticketManagerRoles.some(role => interaction.member.roles.cache.has(role));
            const isStaff = ticketStaffRoles.some(role => interaction.member.roles.cache.has(role));

            let canClose = isAdmin || isManager || isStaff;
            let gaveStats = false;
            if (ticketData.staffID) {
                if (isAdmin || (isAssigned && ticketData.resolved)) {
                    gaveStats = true;
                }
            } else if (isAdmin) {
                gaveStats = true;
            }

            if (!canClose) return interaction.reply({ content: "Bu talebi kapatma yetkiniz yok.", flags: [MessageFlags.Ephemeral] });

            const subject = interaction.fields.getTextInputValue("ticket_subject");
            const result = interaction.fields.getTextInputValue("ticket_result");

            Object.assign(ticketData, { subject, result, problem: "", solution: "" });
            await ticketData.save();

            if (ticketData.userID) {
                await interaction.channel.permissionOverwrites.edit(ticketData.userID, { SendMessages: false }).catch(() => { });
            }

            const closeV2 = [
                {
                    type: 17,
                    components: [
                        { type: 10, content: `> **Talep Kapatılıyor...**\n> -# Kanal birkaç saniye içerisinde silinecektir.` }
                    ]
                }
            ];

            await interaction.reply({ components: closeV2, flags: [MessageFlags.IsComponentsV2] });



            if (gaveStats && ticketData.staffID) {
                const staffMember = await interaction.guild.members.fetch(ticketData.staffID).catch(() => null);
                if (staffMember) {
                    

                    const StatHistory = require("../../Core/Database/StatHistory");
                    const today = moment().format("YYYY-MM-DD");
                    try {
                        await StatHistory.findOneAndUpdate(
                            { guildID: interaction.guild.id, userID: staffMember.id, date: today },
                            { $inc: { ticket: 1 } },
                            { upsert: true, setDefaultsOnInsert: true }
                        );
                    } catch (err) { }

                    const TaskManager = require("../../Core/Handlers/TaskManager");
                    await TaskManager.progressTask(interaction.guild, staffMember, "TICKET", 1);
                    
                    const XPManager = require("../../Core/Handlers/XPManager");
                    if (ticketData.resolved) {
                        await XPManager.addXP(interaction.guild, staffMember, 15, "TICKET_CLOSED");
                    }

                    const RatingManager = require("../../Core/Handlers/RatingManager");
                    const ticketUser = await interaction.guild.members.fetch(ticketData.userID).catch(() => null);
                    if (ticketUser) {
                        await RatingManager.sendRatingRequest(interaction.guild, ticketUser.user, staffMember.user, "TICKET");
                    }

                    const ticketLogChannel = interaction.guild.channels.cache.get(ConfigManager.get("Channels.TicketLog"));
                
                    if (ticketLogChannel) {
                        const ticketAdminAvatar = staffMember.user.displayAvatarURL({ dynamic: true, size: 256 });
                        const ticketManagerRoles = ConfigManager.get("Roles.Responsibilities.TicketManager") || [];
                        const ticketManagerMentions = ticketManagerRoles.length > 0 ? ticketManagerRoles.map(id => `<@&${id}>`).join(", ") : "Ayarlanmadı";

                        const resolvedTicketV2 = [
                            {
                                type: 17,
                                components: [
                                    {
                                        type: 9,
                                        accessory: {
                                            type: 11,
                                            media: { url: ticketAdminAvatar }
                                        },
                                        components: [
                                            {
                                                type: 10,
                                                content: `> ## ${ConfigManager.get("Emojis.toji_sparkles") || "✨"} ${staffMember.user} Bir talebi çözdü.\n` +
                                                    `> -# ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Gereken Etiketler:** ${ticketManagerMentions}`
                                            }
                                        ]
                                    },
                                    { type: 14, divider: true, spacing: 1 },
                                    {
                                        type: 9,
                                        accessory: {
                                            type: 2,
                                            style: 4,
                                            label: "Desteği İptal Et",
                                            custom_id: `admin_cancel_ticket_${staffMember.id}_${ticketData.ticketID}_${ticketData.userID}`
                                        },
                                        components: [
                                            {
                                                type: 10,
                                                content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Talep ID:** \`#${ticketData.ticketID}\`\n` +
                                                    `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Yardım Alan:** <@${ticketData.userID}> (\`${ticketData.userID}\`)\n` +
                                                    `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Yardım Eden:** ${staffMember.user} (\`${staffMember.id}\`)`
                                            }
                                        ]
                                    }
                                ]
                            }
                        ];
                        staffLogChannel.send({ components: resolvedTicketV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
                    }
                }
            }

            const transcriptChannel = interaction.guild.channels.cache.get(ConfigManager.get("Channels.TicketTranscript"));
            if (transcriptChannel) {
                try {
                    const { html, messageCount } = await transcriptHandler(interaction.channel, ticketData, client, interaction.user);
                    const transcriptBuffer = Buffer.from(html, 'utf-8');

                    const fileName = `ticket-${ticketData.ticketID}.html`;
                    await r2.send(new PutObjectCommand({
                        Bucket: "caveria",
                        Key: fileName,
                        Body: transcriptBuffer,
                        ContentType: "text/html"
                    }));

                    const publicUrl = `https://pub-638bd1a8e7a94a808d3eeec6c96888d1.r2.dev/${fileName}`;
                    const now = Date.now();
                    const duration = moment.duration(now - ticketData.date).format("D [gün], H [saat], m [dakika], s [saniye]");
                    const staffMember = ticketData.staffID ? `<@${ticketData.staffID}>` : "Yetkili Atanmadı";

                    const ticketUser = await client.users.fetch(ticketData.userID).catch(() => null);
                    const ticketMember = await interaction.guild.members.fetch(ticketData.userID).catch(() => null);

                    const accountCreated = ticketUser ? Math.floor(ticketUser.createdTimestamp / 1000) : null;
                    const joinedAt = ticketMember ? Math.floor(ticketMember.joinedTimestamp / 1000) : null;

                    const transcriptV2 = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: {
                                        type: 11,
                                        media: { url: interaction.user.displayAvatarURL({ dynamic: true, size: 256 }) }
                                    },
                                    components: [
                                        {
                                            type: 10,
                                            content: `> ## ${ConfigManager.get("Emojis.pr_locked") || (ConfigManager.get("Emojis.toji_hubsparkles") || "✨")} Talep Kapatıldı\n> -# **${interaction.channel.name}** kanalı başarıyla arşivlendi.`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_sign") || (ConfigManager.get("Emojis.toji_hubsparkles") || "✨")} Ticket Bilgileri`
                                },
                                {
                                    type: 10,
                                    content: `> **Ticket ID:** \`#${ticketData.ticketID}\`\n` +
                                        `> **Durum:** ${ticketData.resolved ? `${ConfigManager.get("Emojis.Onay") || (ConfigManager.get("Emojis.toji_onay") || "✨")} Çözüldü` : `${ConfigManager.get("Emojis.Red") || (ConfigManager.get("Emojis.toji_iptal") || "✨")} Çözülmedi`} · ${ticketData.locked ? `${ConfigManager.get("Emojis.pr_locked") || (ConfigManager.get("Emojis.toji_hubsparkles") || "✨")} Kilitli` : `${ConfigManager.get("Emojis.pr_unlocked") || (ConfigManager.get("Emojis.toji_hubsparkles") || "✨")} Kilitli Değil`}\n` +
                                        `> **Açılış:** <t:${Math.floor(ticketData.date / 1000)}:F> · <t:${Math.floor(ticketData.date / 1000)}:R>\n` +
                                        `> **Kapanış:** <t:${Math.floor(now / 1000)}:F> · <t:${Math.floor(now / 1000)}:R>\n` +
                                        `> **Toplam Süre:** \`${duration}\`\n` +
                                        `> **Mesaj Sayısı:** \`${messageCount}\``
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_user") || (ConfigManager.get("Emojis.toji_sparkles") || "✨")} Kullanıcı Bilgileri`
                                },
                                {
                                    type: 10,
                                    content: `> **Kullanıcı:** <@${ticketData.userID}> (\`${ticketData.userID}\`)\n` +
                                        `> **Hesap Oluşturma:** ${accountCreated ? `<t:${accountCreated}:F>` : "Bilinmiyor"}\n` +
                                        `> **Sunucuya Katılma:** ${joinedAt ? `<t:${joinedAt}:F>` : "Bilinmiyor"}`
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_staff") || (ConfigManager.get("Emojis.toji_sparkles") || "✨")} Yetkili Bilgileri`
                                },
                                {
                                    type: 10,
                                    content: `> **Kapatan Yetkili:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
                                        `> **İlgilenen Yetkili:** ${staffMember}`
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> ### ${ConfigManager.get("Emojis.toji_sign") || (ConfigManager.get("Emojis.toji_hubsparkles") || "✨")} Talep Detayları`
                                },
                                {
                                    type: 10,
                                    content: `> **Talep Sebebi:**\n\`\`\`${ticketData.reason || "Belirtilmemiş"}\`\`\``
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> **Kapanış Özeti:** ${subject}\n` +
                                        `> **Açıklama / Sonuç:** ${result}`
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 1,
                                    components: [
                                        { type: 2, style: 5, label: "Transcripti Görüntüle", url: publicUrl, emoji: parseEmoji(ConfigManager.get("Emojis.toji_sign") || (ConfigManager.get("Emojis.toji_hubsparkles") || "✨")) || { name: "📄" } }
                                    ]
                                }
                            ]
                        }
                    ];

                    await transcriptChannel.send({ components: transcriptV2, flags: [MessageFlags.IsComponentsV2] });
                } catch (err) {
                    console.error("Transcript R2 Error:", err);
                }
            }

            const channelId = interaction.channel.id;
            setTimeout(async () => {
                await Ticket.deleteOne({ channelID: channelId });
                const channel = interaction.guild.channels.cache.get(channelId);
                if (channel) channel.delete().catch(() => { });
            }, 6000);

            return;
        }
};
