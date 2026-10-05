const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Room = require("../../Core/Database/Rooms");
const PrivateRoomUser = require("../../Core/Database/PrivateRoomUser");
const PermissionManager = require("../../Services/Systems/PrivateRooms/Permissions");
const ProfileApplier = require("../../Services/Systems/PrivateRooms/ApplyProfile");
const { interactionCooldowns, PrivateRoomLogger } = require("../../Services/Systems/PrivateRooms/PrivateRoomUtils");

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isUserSelectMenu() && !interaction.isModalSubmit()) return;

    const isOurId = interaction.customId.startsWith("PR_") ||
        interaction.customId.startsWith("rename_") ||
        interaction.customId.startsWith("relimit_");

    if (!isOurId) {
        if (interaction.customId !== "NEW_PROFILE_MODAL") return;
    }

    const roomData = await Room.findOne({ channelID: interaction.channelId });
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!roomData && !interaction.customId.includes("PROFILE")) {
    }

    if (roomData && interaction.user.id !== roomData.ownerID && !isAdmin) {
        return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Bu odayı sadece sahibi yönetebilir!", ephemeral: true });
    }

    if (interactionCooldowns.isCoolingDown(interaction.user.id)) {
        return interaction.reply({ content: "⏳ Lütfen biraz bekleyin...", ephemeral: true });
    }
    interactionCooldowns.setCooldown(interaction.user.id, 1000);

    try {
        if (interaction.isButton()) {
            const channel = interaction.channel;

            switch (interaction.customId) {
                case "PR_BTN_RENAME":
                    const renameModal = new ModalBuilder().setCustomId("PR_MODAL_RENAME").setTitle("Oda İsmi Değiştir").addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("name").setLabel("Yeni Oda İsmi").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)
                        )
                    );
                    await interaction.showModal(renameModal);
                    break;

                case "PR_BTN_LIMIT":
                    const limitModal = new ModalBuilder().setCustomId("PR_MODAL_LIMIT").setTitle("Oda Limiti Belirle").addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("limit").setLabel("Limit (0-99)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2)
                        )
                    );
                    await interaction.showModal(limitModal);
                    break;

                case "PR_BTN_LOCK":
                    const everyonePerm = channel.permissionOverwrites.cache.get(interaction.guild.id);
                    const isLocked = everyonePerm && everyonePerm.deny.has(PermissionFlagsBits.Connect);
                    await PermissionManager.applyLock(channel, !isLocked);
                    await interaction.reply({ content: `Oda ${!isLocked ? 'Kilitlendi' : 'Açıldı'}.`, ephemeral: true });
                    await PrivateRoomLogger.log(interaction.guild, "Oda Kilidi Değiştirildi", `Yetkili: ${interaction.user}\nİşlem: ${!isLocked ? 'Kilitleme' : 'Kilit Açma'}\nKanal: ${channel}`);
                    await updateControlPanel(interaction);
                    break;

                case "PR_BTN_CAMERA":
                    const videoPerm = channel.permissionOverwrites.cache.get(interaction.guild.id);
                    const hasVideo = videoPerm && videoPerm.allow.has(PermissionFlagsBits.Stream);
                    await channel.permissionOverwrites.edit(interaction.guild.id, {
                        Stream: !hasVideo
                    });
                    await interaction.reply({ content: `Kamera izni ${!hasVideo ? 'Açıldı' : 'Kapatıldı'}.`, ephemeral: true });
                    await PrivateRoomLogger.log(interaction.guild, "Kamera İzni Değiştirildi", `Yetkili: ${interaction.user}\nDurum: ${!hasVideo ? 'Açık' : 'Kapalı'}\nKanal: ${channel}`);
                    await updateControlPanel(interaction);
                    break;

                case "PR_BTN_ADMIN_CTRL":
                    let userProfiles = await PrivateRoomUser.findOne({ userId: interaction.user.id });
                    if (userProfiles && userProfiles.profiles.length > 0) {
                        userProfiles.profiles.forEach(p => p.adminEntryControl = !p.adminEntryControl);
                        await userProfiles.save();
                        const status = userProfiles.profiles[0].adminEntryControl ? 'AKTİF' : 'DEVRE DIŞI';
                        await interaction.reply({ content: `Admin Giriş Kontrolü: **${status}**\n*(Not: Bu ayar tüm profilleriniz için güncellendi)*`, ephemeral: true });
                        await PrivateRoomLogger.log(interaction.guild, "Admin Giriş Kontrolü", `Yetkili: ${interaction.user}\nYeni Durum: ${status}`);
                        await updateControlPanel(interaction);
                    } else {
                        await interaction.reply({ content: "Önce bir profil oluşturmalısınız!", ephemeral: true });
                    }
                    break;
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === "PR_PROFILE_SELECT") {
                const value = interaction.values[0];
                if (value === "CREATE_NEW_PROFILE") {
                    const profileModal = new ModalBuilder().setCustomId("PR_MODAL_NEW_PROFILE").setTitle("Yeni Profil").addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("name").setLabel("Profil İsmi").setStyle(TextInputStyle.Short).setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("chanName").setLabel("Kanal İsmi (Opsiyonel)").setStyle(TextInputStyle.Short).setRequired(false)
                        )
                    );
                    await interaction.showModal(profileModal);
                } else if (value.startsWith("SELECT_PROFILE_")) {
                    const profileId = value.replace("SELECT_PROFILE_", "");
                    const success = await ProfileApplier.apply(interaction.channel, interaction.member, profileId);
                    if (success) {
                        await PrivateRoomUser.findOneAndUpdate(
                            { userId: interaction.user.id },
                            { lastUsedProfileId: profileId }
                        );
                        await PrivateRoomLogger.log(interaction.guild, "Profil Uygulandı", `Yetkili: ${interaction.user}\nProfil ID: ${profileId}\nKanal: ${interaction.channel}`);
                    }
                    await interaction.reply({ content: success ? "Profil başarıyla uygulandı." : "Profil bulunamadı.", ephemeral: true });
                }
            }
        }

        if (interaction.isUserSelectMenu()) {
            const channel = await interaction.guild.channels.fetch(interaction.channelId, { force: true }).catch(() => interaction.channel);
            const targetIds = interaction.values;

            if (interaction.customId === "PR_MOD_SELECT") {
                const currentMods = channel.permissionOverwrites.cache
                    .filter(o => o.type === 1 && o.id !== interaction.user.id && o.allow.has(PermissionFlagsBits.MuteMembers))
                    .map(o => o.id);

                const toRemove = currentMods.filter(id => !targetIds.includes(id));
                for (const id of toRemove) {
                    await channel.permissionOverwrites.delete(id).catch(() => null);
                }

                for (const id of targetIds) {
                    await channel.permissionOverwrites.edit(id, {
                        Connect: true,
                        Speak: true,
                        Stream: true,
                        MuteMembers: true,
                        MoveMembers: true,
                        ViewChannel: true
                    });
                }

                await saveToActiveProfile(interaction.user.id, { moderators: targetIds });

                await interaction.reply({ content: `Moderatör listesi güncellendi.`, ephemeral: true });
                await PrivateRoomLogger.log(interaction.guild, "Moderatör Listesi Güncellendi", `Yetkili: ${interaction.user}\nYeni Liste: ${targetIds.map(id => `<@${id}>`).join(", ") || 'Yok'}`);
                await updateControlPanel(interaction);
            }

            if (interaction.customId === "PR_ALLOW_SELECT") {
                const currentAllowed = channel.permissionOverwrites.cache
                    .filter(o => o.type === 1 && o.id !== interaction.user.id && o.allow.has(PermissionFlagsBits.Connect) && !o.allow.has(PermissionFlagsBits.MuteMembers))
                    .map(o => o.id);

                const toRemove = currentAllowed.filter(id => !targetIds.includes(id));
                for (const id of toRemove) {
                    await channel.permissionOverwrites.delete(id).catch(() => null);
                }

                for (const id of targetIds) {
                    await channel.permissionOverwrites.edit(id, { Connect: true, ViewChannel: true });
                }

                await saveToActiveProfile(interaction.user.id, { allowedUsers: targetIds });

                await interaction.reply({ content: `İzinli listesi güncellendi.`, ephemeral: true });
                await PrivateRoomLogger.log(interaction.guild, "İzinli Listesi Güncellendi", `Yetkili: ${interaction.user}\nYeni Liste: ${targetIds.map(id => `<@${id}>`).join(", ") || 'Yok'}`);
                await updateControlPanel(interaction);
            }

            if (interaction.customId === "PR_BLOCK_SELECT") {
                const currentBlocked = channel.permissionOverwrites.cache
                    .filter(o => o.type === 1 && o.id !== interaction.user.id && o.deny.has(PermissionFlagsBits.Connect))
                    .map(o => o.id);

                const toRemove = currentBlocked.filter(id => !targetIds.includes(id));
                for (const id of toRemove) {
                    await channel.permissionOverwrites.delete(id).catch(() => null);
                }

                for (const id of targetIds) {
                    await channel.permissionOverwrites.edit(id, { Connect: false, ViewChannel: false });
                    const targetMember = interaction.guild.members.cache.get(id);
                    if (targetMember?.voice.channelId === channel.id) {
                        await targetMember.voice.disconnect().catch(() => null);
                    }
                }

                await saveToActiveProfile(interaction.user.id, { blockedUsers: targetIds });

                await interaction.reply({ content: `Engelli listesi güncellendi.`, ephemeral: true });
                await PrivateRoomLogger.log(interaction.guild, "Engelli Listesi Güncellendi", `Yetkili: ${interaction.user}\nYeni Liste: ${targetIds.map(id => `<@${id}>`).join(", ") || 'Yok'}`);
                await updateControlPanel(interaction);
            }

            if (interaction.customId === "PR_KICK_SELECT") {
                const targetId = interaction.values[0];
                const targetMember = interaction.guild.members.cache.get(targetId);
                if (targetMember?.voice.channelId === channel.id) {
                    await targetMember.voice.disconnect().catch(() => null);
                    await interaction.reply({ content: `${targetMember} kanaldan atıldı.`, ephemeral: true });
                    await PrivateRoomLogger.log(interaction.guild, "Kullanıcı Kanaldan Atıldı", `Yetkili: ${interaction.user}\nHedef: ${targetMember}\nKanal: ${channel}`);
                } else {
                    await interaction.reply({ content: "Kullanıcı kanalda değil.", ephemeral: true });
                }
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === "PR_MODAL_RENAME") {
                const newName = interaction.fields.getTextInputValue("name");
                await interaction.channel.setName(newName);
                await saveToActiveProfile(interaction.user.id, { channelName: newName });
                await interaction.reply({ content: `Oda ismi \`${newName}\` olarak değiştirildi.`, ephemeral: true });
                await PrivateRoomLogger.log(interaction.guild, "Oda İsmi Değiştirildi", `Yetkili: ${interaction.user}\nYeni İsim: ${newName}`);
                await updateControlPanel(interaction);
            }

            if (interaction.customId === "PR_MODAL_LIMIT") {
                const limit = parseInt(interaction.fields.getTextInputValue("limit"));
                if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: "Geçersiz limit!", ephemeral: true });
                await interaction.channel.setUserLimit(limit);
                await saveToActiveProfile(interaction.user.id, { userLimit: limit });
                await interaction.reply({ content: `Oda limiti \`${limit}\` olarak ayarlandı.`, ephemeral: true });
                await PrivateRoomLogger.log(interaction.guild, "Oda Limiti Güncellendi", `Yetkili: ${interaction.user}\nYeni Limit: ${limit}`);
                await updateControlPanel(interaction);
            }

            if (interaction.customId === "PR_MODAL_NEW_PROFILE") {
                const pName = interaction.fields.getTextInputValue("name");
                const cName = interaction.fields.getTextInputValue("chanName") || `🔊 ${pName}`;

                let userData = await PrivateRoomUser.findOne({ userId: interaction.user.id });
                if (!userData) userData = new PrivateRoomUser({ userId: interaction.user.id, profiles: [] });

                if (userData.profiles.length >= (ConfigManager.get("privateRooms.maxProfilesPerUser") || 3)) {
                    return interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Maksimum profil sayısına ulaştınız!", ephemeral: true });
                }

                const newProfileId = Date.now().toString();
                userData.profiles.push({
                    profileId: newProfileId,
                    profileName: pName,
                    channelName: cName,
                    userLimit: interaction.channel.userLimit,
                    permissions: { connect: true, speak: true, video: true, stream: true }
                });
                userData.lastUsedProfileId = newProfileId;

                await userData.save();
                await interaction.reply({ content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} \`${pName}\` isimli profil oluşturuldu.`, ephemeral: true });
            }
        }

    } catch (err) {
        console.error("Interaction Error:", err);
        if (!interaction.replied) await interaction.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Bir hata oluştu!", ephemeral: true }).catch(() => null);
    }
};

async function saveToActiveProfile(userId, updates) {
    try {
        const userData = await PrivateRoomUser.findOne({ userId });
        if (!userData || !userData.lastUsedProfileId) return;

        const profileIdx = userData.profiles.findIndex(p => p.profileId === userData.lastUsedProfileId);
        if (profileIdx === -1) return;

        for (const [key, value] of Object.entries(updates)) {
            userData.profiles[profileIdx][key] = value;
        }

        await userData.save();
    } catch (e) {
        console.error("Save to Active Profile Error:", e);
    }
}

async function updateControlPanel(interaction) {
    try {
        const channel = await interaction.guild.channels.fetch(interaction.channelId, { force: true }).catch(() => interaction.channel);
        if (!channel) return;

        const userData = await PrivateRoomUser.findOne({ userId: interaction.user.id });
        const profiles = userData ? userData.profiles : [];
        const lastUsedId = userData ? userData.lastUsedProfileId : null;

        const profileOptions = [{ label: "Profil Oluştur", value: "CREATE_NEW_PROFILE", emoji: "➕" }];
        profiles.forEach(p => {
            profileOptions.push({
                label: p.profileName,
                value: `SELECT_PROFILE_${p.profileId}`,
                description: `Oda Adı: ${p.channelName || 'Varsayılan'}`,
                emoji: "📄",
                default: p.profileId === lastUsedId
            });
        });

        const profileRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("PR_PROFILE_SELECT")
                .setPlaceholder("Profil seçin.")
                .addOptions(profileOptions)
        );

        const currentMods = [];
        const currentAllowed = [];
        const currentBlocked = [];

        channel.permissionOverwrites.cache.forEach(overwrite => {
            if (overwrite.type !== 1) return; 

            const allow = overwrite.allow;
            const deny = overwrite.deny;

            if (deny.has(PermissionFlagsBits.Connect)) {
                currentBlocked.push(overwrite.id);
            } else if (allow.has(PermissionFlagsBits.MuteMembers)) {
                currentMods.push(overwrite.id);
            } else if (allow.has(PermissionFlagsBits.Connect)) {
                currentAllowed.push(overwrite.id);
            }
        });

        const modRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("PR_MOD_SELECT")
                .setPlaceholder("Kanal moderatörlerini seçin.")
                .setMaxValues(5)
                .setDefaultUsers(currentMods.slice(0, 5))
        );
        const allowRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("PR_ALLOW_SELECT")
                .setPlaceholder("Kanala girebilecek üyeleri seçin.")
                .setMaxValues(10)
                .setDefaultUsers(currentAllowed.slice(0, 10))
        );
        const blockRow = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId("PR_BLOCK_SELECT")
                .setPlaceholder("Kanaldan yasaklanacak üyeleri seçin.")
                .setMaxValues(10)
                .setDefaultUsers(currentBlocked.slice(0, 10))
        );

        const everyonePerm = channel.permissionOverwrites.cache.get(channel.guild.id);
        const isLocked = everyonePerm && everyonePerm.deny.has(PermissionFlagsBits.Connect);
        const hasCamera = everyonePerm && everyonePerm.allow.has(PermissionFlagsBits.Stream);
        const adminStatus = userData && userData.profiles.length > 0 ? userData.profiles[0].adminEntryControl : false;

        const fallbackEmojis = {
            pr_edit: "📝",
            pr_community: "👥",
            pr_locked: "🔒",
            pr_unlocked: "🔓",
            pr_camerayes: "📷",
            pr_camerano: "📵",
            pr_adminguardon: "🛡️",
            pr_adminguardoff: "🔓"
        };
        const emojis = ConfigManager.get("Emojis") || {};
        const getEmoji = (key) => {
            const e = emojis[key];
            if (e && e.trim() !== "") return e;
            return fallbackEmojis[key] || "❓";
        };

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("PR_BTN_RENAME").setEmoji(getEmoji("pr_edit")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_LIMIT").setEmoji(getEmoji("pr_community")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_LOCK").setEmoji(isLocked ? getEmoji("pr_locked") : getEmoji("pr_unlocked")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_CAMERA").setEmoji(hasCamera ? getEmoji("pr_camerayes") : getEmoji("pr_camerano")).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("PR_BTN_ADMIN_CTRL").setEmoji(adminStatus ? getEmoji("pr_adminguardon") : getEmoji("pr_adminguardoff")).setStyle(ButtonStyle.Secondary)
        );

        await interaction.message.edit({
            content: "\u200B",
            components: [profileRow, modRow, allowRow, blockRow, buttonRow]
        }).catch(() => null);

    } catch (e) {
        console.error("Update Control Panel Error:", e);
    }
}
