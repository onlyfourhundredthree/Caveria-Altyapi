const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField,
    ChannelType,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    PermissionFlagsBits,
    LabelBuilder,
    MessageFlags
} = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const PermanentRoom = require("../../Core/Database/PermanentRoom");
const PermanentRoomProfile = require("../../Core/Database/PermanentRoomProfile");
const PermanentRoomUtils = require("../../Core/Handlers/PermanentRoomUtils");

module.exports = async (interaction) => {
    if (!interaction.guild) return;

    if (interaction.isButton()) {
        const PermanentRoomService = require("../../Services/PermanentRoomService");

        if (interaction.customId === "poda_select_admin") {
            const payload = await PermanentRoomService.getDashboardPayload(interaction.client, interaction.member, "ADMIN");
            return interaction.update(payload).catch(() => {});
        }
        if (interaction.customId === "poda_select_owner") {
            const payload = await PermanentRoomService.getDashboardPayload(interaction.client, interaction.member, "OWNER");
            return interaction.update(payload).catch(() => {});
        }
        if (interaction.customId === "poda_go_back") {
            const payload = await PermanentRoomService.getSelectionPayload();
            return interaction.update(payload).catch(() => {});
        }
    }

    if (interaction.isButton() && interaction.customId === "poda_apply") {
        const existingRoom = await PermanentRoom.findOne({ ownerID: interaction.member.id, status: "ACTIVE" });
        if (existingRoom) return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Zaten bir kalıcı odanız veya başvurunuz bulunuyor.", flags: [MessageFlags.Ephemeral] });

        const config = ConfigManager.get("PermanentRoomSettings") || { MinMembers: 4 };
        const minOthers = Math.max(1, config.MinMembers - 1);

        const modal = new ModalBuilder()
            .setCustomId("teamCreateModal")
            .setTitle("Kalıcı Oda Başvurusu");

        const teamNameInput = new TextInputBuilder()
            .setCustomId("team_name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Örn: toji")
            .setRequired(true);

        const teamNameLabel = new LabelBuilder()
            .setLabel("Oda/Ekip Adı")
            .setDescription("Oluşturacağınız ekibin/odanın adını yazın")
            .setTextInputComponent(teamNameInput);

        const teamMembersSelect = new UserSelectMenuBuilder()
            .setCustomId("team_members")
            .setPlaceholder("Ekip üyelerini seçin")
            .setMinValues(minOthers)
            .setMaxValues(25)
            .setRequired(true);

        const teamMembersLabel = new LabelBuilder()
            .setLabel("Ekip Üyeleri")
            .setDescription(`Kendiniz hariç en az ${minOthers} kişi seçmelisiniz.`)
            .setUserSelectMenuComponent(teamMembersSelect);

        modal.addLabelComponents(teamNameLabel, teamMembersLabel);

        await interaction.showModal(modal);
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "teamCreateModal") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const name = interaction.fields.getTextInputValue("team_name");
        const rawMembers = interaction.fields.getSelectedUsers("team_members")?.map(user => user.id) || [];
        const selectedMembers = [...new Set(rawMembers.filter(id => id !== interaction.user.id))];

        const config = ConfigManager.get("PermanentRoomSettings") || { MinMembers: 4, MinWeeklyVoice: 60 };
        const count = selectedMembers.length + 1;

        if (count < config.MinMembers) {
            return interaction.editReply({ content: `${ConfigManager.get("Emojis.toji_iptal") || "✨"} En az ${config.MinMembers} kişi olmalısınız (Siz + ${config.MinMembers - 1} üye).` });
        }

        const allUsers = [interaction.user.id, ...selectedMembers];
        const alreadyInTeam = await PermanentRoom.find({
            guildID: interaction.guild.id,
            $or: [
                { ownerID: { $in: allUsers } },
                { teamMembers: { $in: allUsers } }
            ]
        });

        if (alreadyInTeam.length > 0) {
            const problematicUsers = allUsers.filter(id =>
                alreadyInTeam.some(r => r.ownerID === id || r.teamMembers.includes(id))
            );
            return interaction.editReply({
                content: `${ConfigManager.get("Emojis.toji_iptal") || "✨"} Başvuru başarısız. Aşağıdaki kullanıcılar zaten bir ekibe dahil:\n${problematicUsers.map(u => `<@${u}>`).join(", ")}\nBir kullanıcı aynı anda sadece bir kalıcı odaya ait olabilir.`
            });
        }

        const logChannelID = ConfigManager.get("Channels.PermanentRoomAppLog");
        const logChannel = interaction.guild.channels.cache.get(logChannelID);

        const applicant = interaction.user;
        const memberMentions = selectedMembers.map(m => `<@${m}>`).join(", ");

        if (!logChannel) {
            return interaction.editReply({ content: "Başvuru log kanalı ayarlı değil." });
        }

        const ticketThread = await interaction.channel.threads.create({
            name: `basvuru-${applicant.username}`,
            autoArchiveDuration: 1440,
            type: ChannelType.PrivateThread,
            reason: `Kalıcı Oda Başvurusu: ${applicant.tag}`
        });

        await ticketThread.members.add(applicant.id).catch(() => { });

        await Promise.all(
            selectedMembers.map(mID => ticketThread.members.add(mID).catch(err => console.error(`Member ${mID} eklenemedi:`, err)))
        );

        const staffRoles = ConfigManager.get("Roles.Responsibilities.PermanentRoomStaff") || [];
        for (const rID of staffRoles) {
            const role = interaction.guild.roles.cache.get(rID);
            if (role) {
                await Promise.all(role.members.map(m => ticketThread.members.add(m.id).catch(() => { })));
            }
        }

        const v2Message = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Yeni Kalıcı Oda Başvurusu**\nMerhaba ${applicant}, başvurunuz başarıyla alındı. Yetkililerimiz birazdan sizinle ilgilenecektir.`
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 1
                    },
                    {
                        type: 10,
                        content: `> **Oda Adı:** \`${name}\`\n> **Oda Sahibi:** ${applicant} (\`${applicant.id}\`)\n> **Üyeler:** ${memberMentions || "Yok"}\n> **Toplam Kişi:** \`${count}\``
                    },
                    {
                        type: 14,
                        divider: true,
                        spacing: 1
                    },
                    {
                        type: 9,
                        accessory: {
                            type: 2,
                            style: 3,
                            custom_id: "poda_approve",
                            label: "Onayla",
                            emoji: (() => {
                                const raw = (ConfigManager.get("Emojis") || {}).toji_onay;
                                if (!raw || typeof raw !== 'string' || raw.trim() === '') return { name: "✅" };
                                const m = raw.match(/<a?:(.+):(\d+)>/);
                                return m ? { name: m[1], id: m[2] } : { name: raw };
                            })()
                        },
                        components: [
                            { type: 10, content: "-# Başvuruyu onaylamak için butona tıklayın." }
                        ]
                    },
                    {
                        type: 9,
                        accessory: {
                            type: 2,
                            style: 4,
                            custom_id: "poda_reject",
                            label: "Reddet",
                            emoji: (() => {
                                const raw = (ConfigManager.get("Emojis") || {}).toji_iptal;
                                if (!raw || typeof raw !== 'string' || raw.trim() === '') return { name: "🔨" };
                                const m = raw.match(/<a?:(.+):(\d+)>/);
                                return m ? { name: m[1], id: m[2] } : { name: raw };
                            })()
                        },
                        components: [
                            { type: 10, content: "-# Başvuruyu reddetmek için butona tıklayın." }
                        ]
                    }
                ]
            }
        ];


        await ticketThread.send({
            components: v2Message,
            flags: [MessageFlags.IsComponentsV2]
        });



        await interaction.editReply({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} Başvurunuz alındı ve sizinle ekibinizin görebileceği bir altbaşlık oluşturuldu: ${ticketThread}` });
    }

    if (interaction.isButton() && (interaction.customId === "poda_approve" || interaction.customId === "poda_reject")) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const staffRoles = ConfigManager.get("Roles.Responsibilities.PermanentRoomStaff") || [];
            if (!staffRoles.some(roleId => interaction.member.roles.cache.has(roleId))) {
                return interaction.reply({ content: "Bu işlemi sadece yöneticiler veya oda yetkilileri yapabilir.", flags: [MessageFlags.Ephemeral] });
            }
        }

        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => { });

        if (interaction.customId === "poda_reject") {
            await interaction.editReply({ components: [], content: "\u200b" }).catch(() => { });
            await interaction.followUp({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Başvuru reddedildi. Bu konu kapatılıyor." });
            if (interaction.channel.isThread()) {
                setTimeout(() => interaction.channel.setArchived(true).catch(() => { }), 5000);
            }
            return;
        }

        const allComponents = interaction.message.components[0].components || [];
        const content = allComponents.map(c => c.content || "").join("\n");

        const roomNameMatch = content.match(/Oda Adı:\*\* `(.+?)`/) || content.match(/Oda Adı: `(.+?)`/);
        const applicantIDMatch = content.match(/Oda Sahibi:\*\* <@!?(\d+)>/) || content.match(/\(`(\d+)`\)/);

        const membersComponent = allComponents.find(c => c.content?.includes("Üyeler:"));
        const membersLine = membersComponent ? membersComponent.content : "";
        const teamMemberIDs = (membersLine.match(/\d{17,20}/g) || []).filter(id => id !== interaction.client.user.id);

        if (!roomNameMatch || !applicantIDMatch) {
            return interaction.followUp({ content: "Veriler okunamadı. Başvuru mesajı formatı hatalı.", flags: [MessageFlags.Ephemeral] });
        }

        const roomName = roomNameMatch[1];
        const applicantID = applicantIDMatch[1];

        await interaction.editReply({ components: [] }).catch(() => { });

        try {
            const guild = interaction.guild;
            const parentID = ConfigManager.get("Channels.PermanentRoomCategory");
            const parentChannel = guild.channels.cache.get(parentID);

            const overwrites = parentChannel ? parentChannel.permissionOverwrites.cache.map(o => ({
                id: o.id,
                allow: o.allow.bitfield,
                deny: o.deny.bitfield,
                type: o.type
            })) : [];

            const updateOverwrite = (id, { allow = 0n, deny = 0n, type = 1 }) => {
                const allowBits = PermissionsBitField.resolve(allow);
                const denyBits = PermissionsBitField.resolve(deny);
                const existingIndex = overwrites.findIndex(o => o.id === id);
                if (existingIndex > -1) {
                    const currentAllow = BigInt(overwrites[existingIndex].allow);
                    const currentDeny = BigInt(overwrites[existingIndex].deny);
                    overwrites[existingIndex].allow = (currentAllow | allowBits) & ~denyBits;
                    overwrites[existingIndex].deny = (currentDeny | denyBits) & ~allowBits;
                } else {
                    overwrites.push({ id, allow: allowBits, deny: denyBits, type });
                }
            };

            updateOverwrite(guild.id, { allow: PermissionFlagsBits.ViewChannel, deny: PermissionFlagsBits.Connect, type: 0 });
            updateOverwrite(applicantID, {
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.Stream,
                    PermissionFlagsBits.MuteMembers,
                    PermissionFlagsBits.DeafenMembers,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.PrioritySpeaker,
                    PermissionFlagsBits.UseVAD
                ],
                type: 1
            });

            teamMemberIDs.forEach(mID => {
                if (mID === applicantID) return;
                updateOverwrite(mID, {
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak,
                        PermissionFlagsBits.Stream,
                        PermissionFlagsBits.UseVAD
                    ],
                    type: 1
                });
            });

            const staffRoles = ConfigManager.get("Roles.Responsibilities.PermanentRoomStaff") || [];
            staffRoles.forEach(rID => {
                updateOverwrite(rID, {
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak,
                        PermissionFlagsBits.Stream,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.MoveMembers
                    ],
                    type: 0
                });
            });

            const channel = await guild.channels.create({
                name: roomName,
                type: ChannelType.GuildVoice,
                parent: parentID || null,
                permissionOverwrites: overwrites
            });

            const newRoom = new PermanentRoom({
                guildID: guild.id,
                ownerID: applicantID,
                channelID: channel.id,
                channelName: roomName,
                teamMembers: teamMemberIDs,
                moderators: [applicantID],
                totalCount: teamMemberIDs.length + 1,
                createdAt: Date.now()
            });
            await newRoom.save();

            await PermanentRoomUtils.sendControlPanel(channel, newRoom);

            const ownersChannelID = ConfigManager.get("Channels.PermanentRoomOwners");
            const ownersChannel = guild.channels.cache.get(ownersChannelID);
            if (ownersChannel) {
                const filteredTeamMembers = teamMemberIDs.filter(id => id !== applicantID);
                const logV2 = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Yeni Kalıcı Oda Aktif Edildi!**\nOda başarıyla oluşturuldu ve sahibine teslim edildi.`
                            },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 10,
                                content: `> **Oda:** ${channel}\n> **Sahibi:** <@${applicantID}> (\`${applicantID}\`)\n> **Üyeler:** ${filteredTeamMembers.map(m => `<@${m}>`).join(", ") || "Yok"}\n> **Kişi Sayısı:** \`${filteredTeamMembers.length + 1}\``
                            }
                        ]
                    }
                ];

                await ownersChannel.send({
                    components: logV2,
                    flags: [MessageFlags.IsComponentsV2]
                }).catch(() => { });
            }

            const member = await guild.members.fetch(applicantID).catch(() => null);
            if (member && member.voice.channelId) {
                await member.voice.setChannel(channel).catch(() => { });
            }

            await interaction.followUp({ content: `İşlem tamamlandı! Oda oluşturuldu: ${channel}\nBu konu kapatılıyor.` });
            if (interaction.channel.isThread()) {
                setTimeout(() => interaction.channel.setArchived(true).catch(() => { }), 5000);
            }

        } catch (err) {
            console.error(err);
            const errorMsg = { content: `${ConfigManager.get("Emojis.toji_iptal") || "✨"} Hata: ${err.message}`, flags: [MessageFlags.Ephemeral] };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg).catch(() => { });
            } else {
                await interaction.reply(errorMsg).catch(() => { });
            }
        }
    }

    if (interaction.customId && interaction.customId.startsWith("POD_ADMIN_")) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "Bu özellik sadece sunucu yöneticilerine özeldir.", flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === "POD_ADMIN_ROOM_SELECT") {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            const roomId = interaction.values[0];
            const roomData = await PermanentRoom.findById(roomId);
            if (!roomData) return interaction.editReply({ content: "Oda veritabanında bulunamadı." });

            const ownerMember = await interaction.guild.members.fetch(roomData.ownerID).catch(() => null);
            const voiceChannel = await interaction.guild.channels.fetch(roomData.channelID).catch(() => null);

            const recruiterAvatar = ownerMember ? ownerMember.user.displayAvatarURL({ extension: 'png', size: 1024 }) : null;

            const adminV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: recruiterAvatar ? {
                                type: 11,
                                media: { url: recruiterAvatar },
                                description: null,
                                spoiler: false
                            } : null,
                            components: [
                                {
                                    type: 10,
                                    content: `## **Kalıcı Oda Yönetimi: ${roomData.channelName || "İsimsiz"}**\n-# Sistem üzerinden odayı yönetebilirsiniz.`
                                }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `> **Oda Sahibi:** ${ownerMember ? `${ownerMember} (\`${ownerMember.id}\`)` : `Bilinmiyor (\`${roomData.ownerID}\`)`}\n` +
                                `> **Ses Kanalı:** ${voiceChannel ? `${voiceChannel} (\`${roomData.channelID}\`)` : "Bulunamadı"}\n` +
                                `> **Toplam Üye:** \`${roomData.teamMembers?.length || 0}\` Üye\n` +
                                `> **Ekip Rolü:** ${roomData.teamRoleID ? `<@&${roomData.teamRoleID}>` : "Yok"}\n` +
                                `> **Haftalık Ses:** \`${Math.floor((roomData.weeklyVoiceTime || 0) / 3600000)}s ${Math.floor(((roomData.weeklyVoiceTime || 0) % 3600000) / 60000)}dk\`\n` +
                                `> **Oluşturulma:** <t:${Math.floor(roomData.createdAt / 1000)}:R>`
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `### **Gelişmiş Bilgiler**\n> Ekip Rolü İzni: **${roomData.canCreateTeamRole ? "AKTİF" : "DEVRE DIŞI"}**\n> Durum: **${roomData.status === "ACTIVE" ? "AKTİF" : "KİLİTLİ"}**`
                        },
                        {
                            type: 1,
                            components: [
                                {
                                    type: 2,
                                    custom_id: `POD_ADMIN_ROLE_${roomData._id}`,
                                    label: "Rol İznini Değiştir",
                                    style: roomData.canCreateTeamRole ? 4 : 3
                                },
                                {
                                    type: 2,
                                    custom_id: `POD_ADMIN_LOCK_${roomData._id}`,
                                    label: roomData.status === "ACTIVE" ? "Odayı Kilitle" : "Odayı Aktifleştir",
                                    style: 1
                                },
                                {
                                    type: 2,
                                    custom_id: `POD_ADMIN_DEL_${roomData._id}`,
                                    label: "Odayı Sil",
                                    style: 4
                                }
                            ]
                        }
                    ].filter(c => c.type !== 9 || c.accessory !== null) 
                }
            ];

            return interaction.editReply({
                components: adminV2,
                flags: [MessageFlags.IsComponentsV2]
            });
        }

        if (interaction.isButton()) {
            const parts = interaction.customId.split("_");
            const action = parts[2];
            const targetId = parts[3];
            const roomData = await PermanentRoom.findById(targetId);
            if (!roomData) return interaction.reply({ content: "Oda verisi artık mevcut değil.", flags: [MessageFlags.Ephemeral] });

            if (action === "ROLE") {
                roomData.canCreateTeamRole = !roomData.canCreateTeamRole;
                await roomData.save();
                return interaction.reply({ content: `**${roomData.channelName}** için ekip rolü oluşturma izni: **${roomData.canCreateTeamRole ? "AKTİF" : "KAPALI"}**`, flags: [MessageFlags.Ephemeral] });
            }
            if (action === "LOCK") {
                const newState = roomData.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
                roomData.status = newState;
                await roomData.save();

                const lockV2 = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 9,
                                accessory: {
                                    type: 11,
                                    media: { url: interaction.user.displayAvatarURL({ extension: 'png', size: 1024 }) }
                                },
                                components: [
                                    {
                                        type: 10,
                                        content: `### <a:lock:${newState === "ACTIVE" ? "1424426541571244104" : "1424426543592898681"}> **Oda Durumu Güncellendi**\n-# Yönetim paneli üzerinden oda erişimi ${newState === "ACTIVE" ? "açıldı" : "kısıtlandı"}.`
                                    }
                                ]
                            },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 10,
                                content: `> **Oda:** <#${roomData.channelID}>\n` +
                                    `> **Yeni Durum:** \`${newState}\`\n` +
                                    `> **Sorumlu:** ${interaction.user}`
                            }
                        ]
                    }
                ];

                await interaction.reply({ components: lockV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
                return;
            }
            if (action === "DEL") {
                const guild = interaction.guild;
                const channelName = roomData.channelName;
                const ownerID = roomData.ownerID;
                const channel = guild.channels.cache.get(roomData.channelID);
                if (channel) await channel.delete().catch(() => { });
                if (roomData.teamRoleID) {
                    const role = guild.roles.cache.get(roomData.teamRoleID);
                    if (role) await role.delete().catch(() => { });
                }
                await PermanentRoom.deleteOne({ _id: roomData._id });

                const deleteV2 = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 9,
                                accessory: {
                                    type: 11,
                                    media: { url: interaction.user.displayAvatarURL({ extension: 'png', size: 1024 }) }
                                },
                                components: [
                                    {
                                        type: 10,
                                        content: `### ${ConfigManager.get("Emojis.toji_iptal") || "✨"} **Kalıcı Oda Silindi**\n-# Yönetim paneli üzerinden oda ve tüm verileri temizlendi.`
                                    }
                                ]
                            },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 10,
                                content: `> **Oda Adı:** \`${channelName}\`\n> **Oda Sahibi:** <@${ownerID}> (\`${ownerID}\`)\n` +
                                    `> **Sorumlu Yetkili:** ${interaction.user} (\`${interaction.user.id}\`)`
                            }
                        ]
                    }
                ];

                await interaction.reply({ components: deleteV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
                return;
            }
        }
        return;
    }

    if (interaction.customId && interaction.customId.startsWith("POD_")) {
        const room = await PermanentRoom.findOne({ channelID: interaction.channelId });
        if (!room) return; 

        const isOwner = room.ownerID === interaction.user.id;
        const isModerator = room.moderators?.includes(interaction.user.id);
        const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isOwner && !isModerator && !isAdmin) {
            return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Bu odayı sadece oda sahibi veya oda moderatörleri yönetebilir.", flags: [MessageFlags.Ephemeral] });
        }

        const channel = interaction.channel;

        if (interaction.isButton()) {
            switch (interaction.customId) {
                case "POD_BTN_RENAME":
                    const renameModal = new ModalBuilder().setCustomId("POD_MODAL_RENAME").setTitle("Oda İsmi Değiştir").addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Yeni Oda İsmi").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32))
                    );
                    await interaction.showModal(renameModal);
                    break;

                case "POD_BTN_LIMIT":
                    const limitModal = new ModalBuilder().setCustomId("POD_MODAL_LIMIT").setTitle("Oda Limiti Belirle").addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("limit").setLabel("Limit (0-99)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2))
                    );
                    await interaction.showModal(limitModal);
                    break;

                case "POD_BTN_LOCK":
                    await interaction.deferUpdate();
                    const lockPerm = channel.permissionOverwrites.cache.get(interaction.guild.id);
                    const isLockedNow = lockPerm && lockPerm.deny.has(PermissionFlagsBits.Connect);
                    const userProfileForLock = await PermanentRoomProfile.findOne({ userId: room.ownerID });
                    const adminStatusNow = userProfileForLock && userProfileForLock.profiles.length > 0 ? userProfileForLock.profiles[0].adminEntryControl : false;

                    let nextState; 
                    let statusText, statusEmoji;
                    if (!isLockedNow) {
                        nextState = 2; 
                        statusText = "Kilitli (Sadece Üyeler & Yetkililer)";
                        statusEmoji = "1424426543592898681"; 
                    } else if (isLockedNow && !adminStatusNow) {
                        nextState = 3; 
                        statusText = "Admin Korumalı (Girişler Sahibine Sorulur)";
                        statusEmoji = "1458319688462762014"; 
                    } else {
                        nextState = 1; 
                        statusText = "Herkese Açık";
                        statusEmoji = "1424426541571244104"; 
                    }

                    if (nextState === 1) { 
                        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                        if (userProfileForLock && userProfileForLock.profiles.length > 0) {
                            userProfileForLock.profiles[0].adminEntryControl = false;
                            await userProfileForLock.save();
                        }
                    } else if (nextState === 2) { 
                        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                        if (userProfileForLock && userProfileForLock.profiles.length > 0) {
                            userProfileForLock.profiles[0].adminEntryControl = false;
                            await userProfileForLock.save();
                        }
                    } else { 
                        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                        if (userProfileForLock && userProfileForLock.profiles.length > 0) {
                            userProfileForLock.profiles[0].adminEntryControl = true;
                            await userProfileForLock.save();
                        }
                    }

                    const lockLogV2 = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: {
                                        type: 11,
                                        media: { url: interaction.user.displayAvatarURL({ extension: 'png', size: 1024 }) }
                                    },
                                    components: [
                                        {
                                            type: 10,
                                            content: `### <a:lock:${statusEmoji}> **Oda Kilidi Güncellendi**\n-# Oda sahibi tarafından erişim izinleri değiştirildi.`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `> **Oda:** ${channel} (\`${channel.id}\`)\n` +
                                        `> **Sorumlu:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
                                        `> **Yeni Durum:** \`${statusText}\``
                                }
                            ]
                        }
                    ];

                    await interaction.followUp({ components: lockLogV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });

                    await updatePodPanel(interaction, room);
                    break;

                case "POD_BTN_CAMERA":
                    await interaction.deferUpdate();
                    const videoPerm = channel.permissionOverwrites.cache.get(interaction.guild.id);
                    const hasVideo = videoPerm && videoPerm.allow.has(PermissionFlagsBits.Stream);
                    await channel.permissionOverwrites.edit(interaction.guild.id, { Stream: !hasVideo });
                    await interaction.followUp({ content: `Kamera izni ${!hasVideo ? 'Açıldı' : 'Kapatıldı'}.` });
                    await updatePodPanel(interaction, room);
                    break;

                case "POD_BTN_ROLE":
                    const prSettings = ConfigManager.get("PermanentRoomSettings") || {};
                    if (!prSettings.TeamRoleEnabled) {
                        return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Bu özellik sunucu ayarlarında devre dışı bırakılmıştır.", flags: [MessageFlags.Ephemeral] });
                    }

                    if (!room.canCreateTeamRole && !room.teamRoleID) {
                        return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Bu oda için ekip rolü oluşturma yetkisi **Yönetim** tarafından verilmemiştir.", flags: [MessageFlags.Ephemeral] });
                    }

                    const menu = new StringSelectMenuBuilder()
                        .setCustomId("POD_ROLE_ACTION_SELECT")
                        .setPlaceholder("Yapmak istediğiniz işlemi seçin.");

                    if (room.teamRoleID) {
                        const role = interaction.guild.roles.cache.get(room.teamRoleID);
                        menu.addOptions([
                            { label: "İsim Değiştir", value: "POD_ROLE_EDIT_NAME", emoji: "📝", description: "Ekip rolünün adını günceller." },
                            { label: "Renk Değiştir", value: "POD_ROLE_EDIT_COLOR", emoji: "🎨", description: "Ekip rolünün rengini günceller." },
                            { label: "Üyeleri Eşitle", value: "POD_ROLE_SYNC", emoji: "🔄", description: "Eksik üyeler varsa onlara rolü tekrar verir." },
                            { label: "Rolü Sil", value: "POD_ROLE_DELETE", emoji: "🗑️", description: "Ekip rolünü tamamen kaldırır." }
                        ]);
                        await interaction.reply({
                            content: `**Ekip Rolü Yönetimi**\nMevcut Rol: ${role ? role : "Rol Bulunamadı (Silinmiş)"}`,
                            components: [new ActionRowBuilder().addComponents(menu)],
                            ephemeral: true
                        });
                    } else {
                        menu.addOptions([
                            { label: "Ekip Rolü Oluştur", value: "POD_ROLE_CREATE", emoji: "➕", description: "Odanıza özel bir ekip rolü oluşturur." }
                        ]);
                        await interaction.reply({
                            content: "**Ekip Rolü Yönetimi**\nHenüz bir ekip rolünüz bulunmuyor. Oluşturmak ister misiniz?\n*Not: Ekip rolü oluşturduğunuzda, odanızdaki izinli üyeler bu rolü alacaktır. Kalıcı oda üyeliği bulunan kullanıcılar sistem gereği başka bir ekibe katılamayacaklar.*",
                            components: [new ActionRowBuilder().addComponents(menu)],
                            ephemeral: true
                        });
                    }
                    break;

                case "POD_ROLE_CREATE":
                    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => { });
                    if (room.teamRoleID) return interaction.followUp({ content: "Zaten bir rolünüz var.", ephemeral: true });
                    const settings = ConfigManager.get("PermanentRoomSettings") || {};

                    const newRole = await interaction.guild.roles.create({
                        name: room.channelName || "Ekip Rolü",
                        colors: {
                            primaryColor: settings.DefaultTeamRoleColor || "#FF0000",
                            secondaryColor: null
                        },
                        reason: `Permanent Room Team Role for ${room.channelName}`
                    });

                    room.teamRoleID = newRole.id;
                    room.teamRoleEnabled = true;
                    await room.save();

                    const membersToSync = [room.ownerID, ...(room.teamMembers || [])];
                    let addedCount = 0;
                    for (const memberId of membersToSync) {
                        const member = await interaction.guild.members.fetch(memberId).catch(() => null);
                        if (member) {
                            await member.roles.add(newRole).catch(() => { });
                            addedCount++;
                        }
                    }

                    await interaction.reply({ content: `Ekip rolü oluşturuldu: ${newRole}\n${addedCount} kişiye rol verildi.`, ephemeral: true });
                    break;

                case "POD_ROLE_DELETE":
                    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => { });
                    if (!room.teamRoleID) return interaction.followUp({ content: "Rol bulunamadı.", ephemeral: true });
                    const roleToDelete = interaction.guild.roles.cache.get(room.teamRoleID);
                    if (roleToDelete) await roleToDelete.delete().catch(() => { });

                    room.teamRoleID = null;
                    room.teamRoleEnabled = false;
                    await room.save();

                    await interaction.reply({ content: "Ekip rolü silindi.", ephemeral: true });
                    break;

                case "POD_ROLE_SYNC":
                    if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => { });
                    if (!room.teamRoleID) return interaction.followUp({ content: "Rol bulunamadı.", ephemeral: true });
                    const roleToSync = interaction.guild.roles.cache.get(room.teamRoleID);
                    if (!roleToSync) return interaction.reply({ content: "Discord rolü bulunamadı.", ephemeral: true });

                    const syncMembers = [room.ownerID, ...(room.teamMembers || [])];
                    let synced = 0;
                    for (const id of syncMembers) {
                        const m = await interaction.guild.members.fetch(id).catch(() => null);
                        if (m && !m.roles.cache.has(roleToSync.id)) {
                            await m.roles.add(roleToSync).catch(() => { });
                            synced++;
                        }
                    }
                    await interaction.reply({ content: `${synced} üyeye rol tekrar verildi.`, ephemeral: true });
                    break;

                case "POD_ROLE_EDIT_NAME":
                    const nameModal = new ModalBuilder().setCustomId("POD_MODAL_ROLE_NAME").setTitle("Rol İsmi Düzenle").addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Yeni Rol İsmi").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                    await interaction.showModal(nameModal);
                    break;

                case "POD_ROLE_EDIT_COLOR":
                    const colorModal = new ModalBuilder().setCustomId("POD_MODAL_ROLE_COLOR").setTitle("Rol Rengi Düzenle").addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("color").setLabel("Yeni Renk (HEX)").setPlaceholder("#FF0000").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                    await interaction.showModal(colorModal);
                    break;
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "POD_PROFILE_SELECT") {
                const value = interaction.values[0];
                if (value === "CREATE_NEW_PROFILE") {
                    const profileModal = new ModalBuilder().setCustomId("POD_MODAL_NEW_PROFILE").setTitle("Yeni Profil").addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("name").setLabel("Profil İsmi").setStyle(TextInputStyle.Short).setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("chanName").setLabel("Kanal İsmi (Opsiyonel)").setStyle(TextInputStyle.Short).setRequired(false)
                        )
                    );
                    await interaction.showModal(profileModal);
                } else if (value.startsWith("PSELECT_PROFILE_")) {
                    await interaction.deferUpdate();
                    const profileId = value.replace("PSELECT_PROFILE_", "");
                    const userData = await PermanentRoomProfile.findOne({ userId: room.ownerID });
                    if (userData) {
                        const profile = userData.profiles.find(p => p.profileId === profileId);
                        if (profile) {
                            userData.lastUsedProfileId = profileId;
                            await userData.save();

                            const parentID = ConfigManager.get("Channels.PermanentRoomCategory");
                            const parentChannel = interaction.guild.channels.cache.get(parentID);

                            const overwrites = parentChannel ? parentChannel.permissionOverwrites.cache.map(o => ({
                                id: o.id,
                                allow: o.allow.bitfield,
                                deny: o.deny.bitfield,
                                type: o.type
                            })) : [];

                            const updateOverwrite = (id, allow = 0n, deny = 0n) => {
                                const allowBits = PermissionsBitField.resolve(allow);
                                const denyBits = PermissionsBitField.resolve(deny);
                                const existingIndex = overwrites.findIndex(o => o.id === id);
                                if (existingIndex > -1) {
                                    const currentAllow = BigInt(overwrites[existingIndex].allow);
                                    const currentDeny = BigInt(overwrites[existingIndex].deny);
                                    overwrites[existingIndex].allow = (currentAllow | allowBits) & ~denyBits;
                                    overwrites[existingIndex].deny = (currentDeny | denyBits) & ~allowBits;
                                } else {
                                    overwrites.push({ id, allow: allowBits, deny: denyBits });
                                }
                            };

                            updateOverwrite(interaction.guild.id, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect);
                            updateOverwrite(room.ownerID, [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.Stream,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.PrioritySpeaker,
                                PermissionFlagsBits.UseVAD
                            ]);

                            (profile.moderators || []).forEach(mID => {
                                if (mID === room.ownerID) return;
                                updateOverwrite(mID, [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.Connect,
                                    PermissionFlagsBits.Speak,
                                    PermissionFlagsBits.Stream,
                                    PermissionFlagsBits.MuteMembers,
                                    PermissionFlagsBits.MoveMembers,
                                    PermissionFlagsBits.UseVAD
                                ]);
                            });

                            (profile.allowedUsers || []).forEach(mID => {
                                if (mID === room.ownerID) return;
                                if (!(profile.moderators || []).includes(mID)) {
                                    updateOverwrite(mID, [
                                        PermissionFlagsBits.ViewChannel,
                                        PermissionFlagsBits.Connect,
                                        PermissionFlagsBits.Speak,
                                        PermissionFlagsBits.Stream,
                                        PermissionFlagsBits.UseVAD
                                    ]);
                                }
                            });

                            await channel.permissionOverwrites.set(overwrites);

                            if (profile.channelName) await channel.setName(`${profile.channelName}`).catch(() => { });
                            if (profile.userLimit !== undefined) await channel.setUserLimit(profile.userLimit).catch(() => { });

                            room.channelName = profile.channelName || room.channelName;
                            room.moderators = profile.moderators || [];
                            room.teamMembers = profile.allowedUsers || [];
                            await room.save();

                            await interaction.followUp({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} Profil **${profile.profileName}** uygulandı.`, ephemeral: true });
                            await updatePodPanel(interaction, room);
                        } else {
                            await interaction.followUp({ content: "Profil bulunamadı.", ephemeral: true });
                        }
                    }
                }
            } else if (interaction.customId === "POD_ROLE_ACTION_SELECT") {
                await interaction.deferUpdate();
                const action = interaction.values[0];
                const guild = interaction.guild;
                const settings = ConfigManager.get("PermanentRoomSettings") || {};

                switch (action) {
                    case "POD_ROLE_CREATE":
                        if (room.teamRoleID) return interaction.followUp({ content: "Zaten bir rolünüz var.", ephemeral: true });
                        try {
                            const newRole = await guild.roles.create({
                                name: room.channelName || "Ekip Rolü",
                                colors: {
                                    primaryColor: settings.DefaultTeamRoleColor || "#FF0000",
                                    secondaryColor: null
                                },
                                reason: `Permanent Room Team Role for ${room.channelName}`
                            });
                            room.teamRoleID = newRole.id;
                            room.teamRoleEnabled = true;
                            await room.save();
                            const membersToSync = [room.ownerID, ...(room.teamMembers || [])];
                            let addedCount = 0;
                            for (const memberId of membersToSync) {
                                const member = await guild.members.fetch(memberId).catch(() => null);
                                if (member) {
                                    await member.roles.add(newRole).catch(() => { });
                                    addedCount++;
                                }
                            }
                            await interaction.followUp({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} Ekip rolü oluşturuldu: ${newRole}\n${addedCount} kişiye rol verildi.`, ephemeral: true });
                        } catch (err) {
                            console.error("Role Create Error:", err);
                            await interaction.followUp({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Rol oluşturulurken bir hata oluştu. Botun rol oluşturma yetkisi olduğundan emin olun.", ephemeral: true });
                        }
                        break;

                    case "POD_ROLE_DELETE":
                        if (!room.teamRoleID) return interaction.followUp({ content: "Rol bulunamadı.", ephemeral: true });
                        const roleToDelete = guild.roles.cache.get(room.teamRoleID);
                        if (roleToDelete) await roleToDelete.delete().catch(() => { });
                        room.teamRoleID = null;
                        room.teamRoleEnabled = false;
                        await room.save();
                        await interaction.followUp({ content: "🗑️ Ekip rolü silindi.", ephemeral: true });
                        break;

                    case "POD_ROLE_SYNC":
                        if (!room.teamRoleID) return interaction.followUp({ content: "Rol bulunamadı.", ephemeral: true });
                        const roleToSync = guild.roles.cache.get(room.teamRoleID);
                        if (!roleToSync) return interaction.followUp({ content: "Discord rolü bulunamadı.", ephemeral: true });
                        const syncMembers = [room.ownerID, ...(room.teamMembers || [])];
                        let synced = 0;
                        for (const id of syncMembers) {
                            const m = await guild.members.fetch(id).catch(() => null);
                            if (m && !m.roles.cache.has(roleToSync.id)) {
                                await m.roles.add(roleToSync).catch(() => { });
                                synced++;
                            }
                        }
                        await interaction.followUp({ content: `🔄 ${synced} üyeye rol tekrar verildi.`, ephemeral: true });
                        break;

                    case "POD_ROLE_EDIT_NAME":
                        const nameModal = new ModalBuilder().setCustomId("POD_MODAL_ROLE_NAME").setTitle("Rol İsmi Düzenle").addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Yeni Rol İsmi").setStyle(TextInputStyle.Short).setRequired(true))
                        );
                        await interaction.showModal(nameModal);
                        break;

                    case "POD_ROLE_EDIT_COLOR":
                        const colorModal = new ModalBuilder().setCustomId("POD_MODAL_ROLE_COLOR").setTitle("Rol Rengi Düzenle").addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("primary").setLabel("Birincil Renk (HEX)").setPlaceholder("#FF0000").setStyle(TextInputStyle.Short).setRequired(true)),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("secondary").setLabel("İkincil Renk (HEX / Opsiyonel)").setPlaceholder("#000000").setStyle(TextInputStyle.Short).setRequired(false))
                        );
                        await interaction.showModal(colorModal);
                        break;
                }
            }
        }

        if (interaction.isUserSelectMenu()) {
            const rawIds = interaction.values;
            const targetIds = [...new Set(rawIds.filter(id => id !== room.ownerID))];

            if (interaction.customId === "POD_MOD_SELECT") {
                await interaction.deferUpdate().catch(() => {});
                let newOverwrites = Array.from(channel.permissionOverwrites.cache.values()).map(ow => ({
                    id: ow.id,
                    type: ow.type,
                    allow: ow.allow.toArray(),
                    deny: ow.deny.toArray()
                }));

                const oldMods = room.moderators || [];
                const revoked = oldMods.filter(id => !targetIds.includes(id));

                for (const id of revoked) {
                    if (id !== room.ownerID) {
                        const existingIndex = newOverwrites.findIndex(ow => ow.id === id);
                        if (existingIndex >= 0) {
                            const allowSet = new Set(newOverwrites[existingIndex].allow);
                            allowSet.delete('MuteMembers');
                            allowSet.delete('DeafenMembers');
                            allowSet.delete('MoveMembers');
                            newOverwrites[existingIndex].allow = Array.from(allowSet);
                        }
                    }
                }

                for (const id of targetIds) {
                    const allowFlags = ['Connect', 'Speak', 'Stream', 'MuteMembers', 'DeafenMembers', 'MoveMembers', 'ViewChannel', 'UseVAD'];
                    const existingIndex = newOverwrites.findIndex(ow => ow.id === id);
                    if (existingIndex >= 0) {
                        const mergedAllow = new Set([...newOverwrites[existingIndex].allow, ...allowFlags]);
                        newOverwrites[existingIndex].allow = Array.from(mergedAllow);
                    } else {
                        newOverwrites.push({ id: id, type: 1, allow: allowFlags, deny: [] });
                    }
                }

                await channel.permissionOverwrites.set(newOverwrites).catch(() => {});
                await PermanentRoom.findByIdAndUpdate(room._id, { $set: { moderators: targetIds } });
                await saveToActivePermanentProfile(room.ownerID, { moderators: targetIds });
                await updatePodPanel(interaction, room);
            }

            if (interaction.customId === "POD_ALLOW_SELECT") {
                await interaction.deferUpdate().catch(() => {});
                const currentRoleID = room.teamRoleID;
                const role = currentRoleID ? interaction.guild.roles.cache.get(currentRoleID) : null;

                const currentMembers = room.teamMembers || [];
                const revoked = currentMembers.filter(id => !targetIds.includes(id));

                let newOverwrites = Array.from(channel.permissionOverwrites.cache.values()).map(ow => ({
                    id: ow.id,
                    type: ow.type,
                    allow: ow.allow.toArray(),
                    deny: ow.deny.toArray()
                }));

                newOverwrites = newOverwrites.filter(ow => {
                    if (revoked.includes(ow.id) && ow.id !== room.ownerID && !(room.moderators && room.moderators.includes(ow.id))) return false;
                    return true;
                });

                for (const id of targetIds) {
                    const allowFlags = ['Connect', 'ViewChannel', 'Speak', 'Stream', 'UseVAD'];
                    const existingIndex = newOverwrites.findIndex(ow => ow.id === id);
                    if (existingIndex >= 0) {
                        const mergedAllow = new Set([...newOverwrites[existingIndex].allow, ...allowFlags]);
                        newOverwrites[existingIndex].allow = Array.from(mergedAllow);
                    } else {
                        newOverwrites.push({ id: id, type: 1, allow: allowFlags, deny: [] });
                    }
                }

                await channel.permissionOverwrites.set(newOverwrites).catch(() => {});

                if (role) {
                    targetIds.forEach(id => {
                        let member = interaction.guild.members.cache.get(id);
                        if (!member) interaction.guild.members.fetch(id).then(m => m.roles.add(role).catch(()=>{})).catch(()=>{});
                        else member.roles.add(role).catch(()=>{});
                    });
                    revoked.forEach(id => {
                        if (room.moderators && room.moderators.includes(id)) return;
                        if (id === room.ownerID) return;
                        let member = interaction.guild.members.cache.get(id);
                        if (!member) interaction.guild.members.fetch(id).then(m => m.roles.remove(role).catch(()=>{})).catch(()=>{});
                        else member.roles.remove(role).catch(()=>{});
                    });
                }

                await PermanentRoom.findByIdAndUpdate(room._id, { $set: { teamMembers: targetIds } });
                await saveToActivePermanentProfile(room.ownerID, { allowedUsers: targetIds });
                await updatePodPanel(interaction, room);
            }

            if (interaction.customId === "POD_BLOCK_SELECT") {
                await interaction.deferUpdate().catch(() => {});
                let newOverwrites = Array.from(channel.permissionOverwrites.cache.values()).map(ow => ({
                    id: ow.id,
                    type: ow.type,
                    allow: ow.allow.toArray(),
                    deny: ow.deny.toArray()
                }));

                for (const id of targetIds) {
                    const denyFlags = ['Connect', 'ViewChannel'];
                    const existingIndex = newOverwrites.findIndex(ow => ow.id === id);
                    if (existingIndex >= 0) {
                        const mergedDeny = new Set([...newOverwrites[existingIndex].deny, ...denyFlags]);
                        newOverwrites[existingIndex].deny = Array.from(mergedDeny);
                    } else {
                        newOverwrites.push({ id: id, type: 1, allow: [], deny: denyFlags });
                    }
                    
                    const targetMember = interaction.guild.members.cache.get(id);
                    if (targetMember?.voice.channelId === channel.id) targetMember.voice.disconnect().catch(() => {});
                }
                
                await channel.permissionOverwrites.set(newOverwrites).catch(() => {});
                await saveToActivePermanentProfile(room.ownerID, { blockedUsers: targetIds });
                await updatePodPanel(interaction, room);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === "POD_MODAL_RENAME") {
                await interaction.deferReply();
                const newName = interaction.fields.getTextInputValue("name");
                await channel.setName(`${newName}`);
                await PermanentRoom.findByIdAndUpdate(room._id, { $set: { channelName: newName } });
                await saveToActivePermanentProfile(room.ownerID, { channelName: newName });
                await interaction.editReply({ content: `Oda ismi \`${newName}\` olarak değiştirildi.` });
                await updatePodPanel(interaction, room);
            }
            if (interaction.customId === "POD_MODAL_LIMIT") {
                await interaction.deferReply();
                const limit = parseInt(interaction.fields.getTextInputValue("limit"));
                if (isNaN(limit) || limit < 0 || limit > 99) return interaction.editReply({ content: "Geçersiz limit!" });
                await channel.setUserLimit(limit);
                await saveToActivePermanentProfile(room.ownerID, { userLimit: limit });
                await interaction.editReply({ content: `Oda limiti \`${limit}\` olarak ayarlandı.` });
                await updatePodPanel(interaction, room);
            }
            if (interaction.customId === "POD_MODAL_NEW_PROFILE") {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const pName = interaction.fields.getTextInputValue("name");
                const cName = interaction.fields.getTextInputValue("chanName") || `${pName}`;

                let userData = await PermanentRoomProfile.findOne({ userId: room.ownerID });
                if (!userData) userData = new PermanentRoomProfile({ userId: room.ownerID, profiles: [] });

                const config = ConfigManager.get("privateRooms"); 
                if (userData.profiles.length >= (config.maxProfilesPerUser || 3)) {
                    return interaction.editReply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Maksimum profil sayısına ulaştınız!" });
                }

                const newProfileId = Date.now().toString();
                userData.profiles.push({
                    profileId: newProfileId,
                    profileName: pName,
                    channelName: cName,
                    userLimit: channel.userLimit || 0,
                    permissions: { connect: true, speak: true, video: true, stream: true },
                    moderators: room.moderators || [],
                    allowedUsers: room.teamMembers || []
                });
                userData.lastUsedProfileId = newProfileId;
                await userData.save();

                await interaction.editReply({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} \`${pName}\` isimli yeni profil oluşturuldu. Mevcut ayarlarınız bu profile kaydedildi.` });
                await updatePodPanel(interaction, room);
            }

            if (interaction.customId === "POD_MODAL_ROLE_NAME") {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const newName = interaction.fields.getTextInputValue("name");
                if (room.teamRoleID) {
                    const role = interaction.guild.roles.cache.get(room.teamRoleID);
                    if (role) await role.setName(newName).catch(() => { });
                }
                await interaction.editReply({ content: `Rol ismi \`${newName}\` olarak güncellendi.` });
            }

            if (interaction.customId === "POD_MODAL_ROLE_COLOR") {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
                const primary = interaction.fields.getTextInputValue("primary");
                const secondary = interaction.fields.getTextInputValue("secondary") || null;

                if (!hexRegex.test(primary)) return interaction.editReply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Birincil renk geçersiz (Örn: #FF0000)." });
                if (secondary && !hexRegex.test(secondary)) return interaction.editReply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " İkincil renk geçersiz (Örn: #000000)." });

                if (room.teamRoleID) {
                    const role = interaction.guild.roles.cache.get(room.teamRoleID);
                    if (role) {
                        try {
                            await role.edit({
                                colors: {
                                    primaryColor: primary,
                                    secondaryColor: secondary
                                },
                                reason: `Permanent Room Team Role Color update: ${interaction.user.tag}`
                            });
                        } catch (err) {
                            await role.setColor(primary).catch(() => { });
                        }
                    }
                }
                await interaction.editReply({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} Rol rengi güncellendi. (Birincil: \`${primary}\`${secondary ? `, İkincil: \`${secondary}\`` : ""})` });
            }
        }
    }

    if (interaction.isButton() && (interaction.customId.startsWith("poda_unlock_") || interaction.customId.startsWith("poda_delete_"))) {
        if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => { });
        const [, , roomId] = interaction.customId.split("_");
        const room = await PermanentRoom.findById(roomId);
        if (!room) return interaction.followUp({ content: "Oda verisi bulunamadı.", flags: [MessageFlags.Ephemeral] });

        if (interaction.customId.startsWith("poda_unlock_")) {
            const guild = interaction.guild;
            const channel = guild.channels.cache.get(room.channelID);
            if (channel) {
                await channel.permissionOverwrites.edit(guild.id, {
                    ViewChannel: true,
                    Connect: false
                });
                await channel.permissionOverwrites.edit(room.ownerID, {
                    ViewChannel: true,
                    Connect: true,
                    Speak: true,
                    Stream: true,
                    MuteMembers: true,
                    DeafenMembers: true,
                    MoveMembers: true,
                    UseVAD: true
                });
            }
            room.status = "ACTIVE";
            await room.save();

            const unlockV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 11,
                                media: { url: interaction.user.displayAvatarURL({ extension: 'png', size: 1024 }) }
                            },
                            components: [
                                {
                                    type: 10,
                                    content: `### (ConfigManager.get("Emojis.toji_onay") || "✨") **Oda Kilidi Açıldı**\n-# Sistem logu üzerinden oda erişimi tekrar sağlandı.`
                                }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `> **Oda:** ${channel || room.channelName}\n> **Sorumlu:** ${interaction.user} (\`${interaction.user.id}\`)`
                        }
                    ]
                }
            ];

            await interaction.followUp({ components: unlockV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });

            await interaction.message.delete().catch(() => { });
        }

        if (interaction.customId.startsWith("poda_delete_")) {
            const guild = interaction.guild;
            const channelName = room.channelName;
            const channel = guild.channels.cache.get(room.channelID);
            if (channel) await channel.delete().catch(() => { });

            const ownersChanId = ConfigManager.get("Channels.PermanentRoomOwners");
            if (ownersChanId) {
                const ownersChan = guild.channels.cache.get(ownersChanId);
                if (ownersChan) {
                    try {
                        const msgs = await ownersChan.messages.fetch({ limit: 100 });
                        for (const [, m] of msgs) {
                            if (m.author.id !== client.user.id) continue;
                            const c = m.components?.[0]?.components?.find(x => x.type === 10)?.content || "";
                            if (c.includes(room.channelID)) await m.delete().catch(() => {});
                        }
                    } catch (_) {}
                }
            }

            await PermanentRoom.deleteOne({ _id: room._id });

            const deleteV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 11,
                                media: { url: interaction.user.displayAvatarURL({ extension: 'png', size: 1024 }) }
                            },
                            components: [
                                {
                                    type: 10,
                                    content: `### ${ConfigManager.get("Emojis.toji_iptal") || "✨"} **Kalıcı Oda Silindi**\n-# Sistem logu üzerinden oda ve tüm verileri temizlendi.`
                                }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `> **Oda Adı:** \`${channelName}\`\n> **Sorumlu:** ${interaction.user} (\`${interaction.user.id}\`)`
                        }
                    ]
                }
            ];

            await interaction.followUp({ components: deleteV2, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });

            await interaction.message.delete().catch(() => { });
        }
    }
};

async function updatePodPanel(interaction, room) {
    try {
        const channel = await interaction.guild.channels.fetch(interaction.channelId, { force: true }).catch(() => interaction.channel);
        const profileData = await PermanentRoomProfile.findOne({ userId: room.ownerID });
        const components = await PermanentRoomUtils.getControlComponents(channel, room, profileData);
        await interaction.message.edit({ components: components }).catch(() => null);
    } catch (e) {
        console.error("Pod Panel Update Error:", e);
    }
}

async function saveToActivePermanentProfile(userId, updates) {
    try {
        const userData = await PermanentRoomProfile.findOne({ userId });
        if (!userData || !userData.lastUsedProfileId) return;

        const profileIdx = userData.profiles.findIndex(p => p.profileId === userData.lastUsedProfileId);
        if (profileIdx === -1) return;

        for (const [key, value] of Object.entries(updates)) {
            userData.profiles[profileIdx][key] = value;
        }

        await userData.save();
    } catch (e) {
        console.error("Save to Active Permanent Profile Error:", e);
    }
}
