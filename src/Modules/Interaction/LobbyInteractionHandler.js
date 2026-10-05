const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const GameLobby = require("../../Core/Database/GameLobby");
const RiotAccount = require("../../Core/Database/RiotAccount");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

const userLobbyState = new Map();

const MODE_MAP = {
    lol_solo: "Dereceli (Tek/Çift)",
    lol_flex: "Dereceli (Esnek)",
    lol_normal: "Derecesiz (Sıralı)",
    lol_aram: "ARAM",
    lol_arena: "Arena",
    valo_ranked: "Dereceli",
    valo_unrated: "Derecesiz",
    valo_swiftplay: "Tam Gaz",
    valo_spike: "Spike'a Hücum",
    valo_custom: "Özel Oyun"
};

module.exports = async (interaction) => {
    const { customId, user } = interaction;
    if (!customId) return;

    if (customId === "lobby_delete") {
        const existing = await GameLobby.findOne({ userId: user.id });
        if (!existing) {
            return interaction.reply({ content: "Sisteme kayıtlı aktif bir lobin bulunmuyor.", ephemeral: true });
        }

        if (existing.messageId) {
            const chanId = ConfigManager.get("Channels")?.LobbyChannel;
            if (chanId) {
                const channel = interaction.client.channels.cache.get(chanId);
                if (channel) {
                    const msg = await channel.messages.fetch(existing.messageId).catch(() => null);
                    if (msg && msg.deletable) await msg.delete().catch(() => { });
                }
            }
        }

        if (existing.voiceChannelId) {
            const vChannel = interaction.client.channels.cache.get(existing.voiceChannelId);
            if (vChannel) await vChannel.delete().catch(() => { });
        }

        await GameLobby.deleteOne({ userId: user.id });
        return interaction.reply({ content: "✅ Mevcut lobin başarıyla iptal edildi ve sistemden silindi.", ephemeral: true });
    }

    if (customId === "lobby_create") {
        const existing = await GameLobby.findOne({ userId: user.id });

        if (existing) {
            const emojis = ConfigManager.get("Emojis") || {};
            const onayId = emojis.toji_onay?.match(/\d+/) ? { id: emojis.toji_onay.match(/\d+/)[0] } : undefined;
            const createId = emojis.toji_create?.match(/\d+/) ? { id: emojis.toji_create.match(/\d+/)[0] } : undefined;

            const components = [{
                type: 1,
                components: [
                    { type: 2, custom_id: "lobby_renew_fast", label: "Süresini Uzat (Güncelle)", style: 1, emoji: onayId },
                    { type: 2, custom_id: "lobby_recreate_force", label: "Sil ve Yeni Kur", style: 4, emoji: createId }
                ]
            }];
            return interaction.reply({ content: `${emojis.toji_info || "📌"} Seçili oyunda zaten halihazırda yayınlanmış aktif bir lobin bulunuyor.\nLobinin süresini **5 dakika** uzatıp kanalda ön plana çıkarabilir ya da bunu silip sıfırdan lobi kurabilirsin.`, components, ephemeral: true });
        }

        return startLobbyFlow(interaction, false);
    }

    if (customId === "lobby_recreate_force") {
        const existing = await GameLobby.findOne({ userId: user.id });
        if (existing) {
            if (existing.messageId) {
                const chanId = ConfigManager.get("Channels")?.LobbyChannel;
                if (chanId) {
                    const channel = interaction.client.channels.cache.get(chanId);
                    if (channel) {
                        const msg = await channel.messages.fetch(existing.messageId).catch(() => null);
                        if (msg && msg.deletable) await msg.delete().catch(() => { });
                    }
                }
            }
            if (existing.voiceChannelId) {
                const vChannel = interaction.client.channels.cache.get(existing.voiceChannelId);
                if (vChannel) await vChannel.delete().catch(() => { });
            }
        }
        await GameLobby.deleteOne({ userId: user.id });
        userLobbyState.delete(user.id);

        return startLobbyFlow(interaction, true);
    }

    if (customId === "lobby_renew_fast") {
        const lobby = await GameLobby.findOne({ userId: user.id });
        if (!lobby) return interaction.update({ content: "⚠️ Lobiniz artık bulunmuyor.", components: [] });

        const chanId = ConfigManager.get("Channels")?.LobbyChannel;
        if (!chanId) return interaction.update({ content: "⚠️ Sistem kanal ayarı bulunmuyor.", components: [] });
        const channel = interaction.client.channels.cache.get(chanId);
        if (!channel) return interaction.update({ content: "⚠️ Lobi kanalı algılanamadı.", components: [] });

        await interaction.deferUpdate();

        if (lobby.messageId) {
            const oldMsg = await channel.messages.fetch(lobby.messageId).catch(() => null);
            if (oldMsg && oldMsg.deletable) await oldMsg.delete().catch(() => { });
        }

        lobby.expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const comp = buildLobbyMessage(lobby, interaction.user);
        const sentMsg = await channel.send({ components: comp, flags: [MessageFlags.IsComponentsV2] });

        lobby.messageId = sentMsg.id;
        await GameLobby.updateOne({ userId: user.id }, { expiresAt: lobby.expiresAt, messageId: lobby.messageId });

        return interaction.followUp({ content: "✅ Lobinin süresi 5 dakika daha uzatıldı ve ilan kanalın en aşağısına (güncele) taşındı!", ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && customId === "lobby_sel_game") {
        const game = interaction.values[0];

        const hasAccount = await RiotAccount.findOne({ userId: user.id, gameType: game, isVerified: true });
        if (!hasAccount) {
            return interaction.reply({ content: `⚠️ Lobi kurabilmek için doğrulanmış bir **${game === "lol" ? "League of Legends" : "VALORANT"}** hesabınız olmalıdır.\nLütfen 'Oyun Hesapları Yönetimi' üzerinden önce hesabınızı bağlayın.`, ephemeral: true });
        }

        const state = userLobbyState.get(user.id) || {};
        state.game = game;
        userLobbyState.set(user.id, state);

        let options = [];
        if (game === "lol") {
            options = [
                { label: "Dereceli (Tek/Çift)", value: "lol_solo" },
                { label: "Dereceli (Esnek)", value: "lol_flex" },
                { label: "Derecesiz (Sıralı)", value: "lol_normal" },
                { label: "ARAM", value: "lol_aram" },
                { label: "Arena", value: "lol_arena" }
            ];
        } else {
            options = [
                { label: "Dereceli", value: "valo_ranked" },
                { label: "Derecesiz", value: "valo_unrated" },
                { label: "Tam Gaz", value: "valo_swiftplay" },
                { label: "Kopya", value: "valo_spike" },
                { label: "Özel Oyun", value: "valo_custom" }
            ];
        }

        const components = [{
            type: 1,
            components: [{
                type: 3,
                custom_id: "lobby_sel_mode",
                placeholder: "Oyun Modunu Seçin",
                options
            }]
        }];
        return interaction.update({ components });
    }

    if (interaction.isStringSelectMenu() && customId === "lobby_sel_mode") {
        const mode = interaction.values[0];
        const state = userLobbyState.get(user.id) || {};
        state.mode = MODE_MAP[mode] || mode;
        userLobbyState.set(user.id, state);

        const noRoleModes = ["lol_aram", "lol_arena", "valo_custom"];

        if (noRoleModes.includes(mode)) {
            return showRankAndUserStep(interaction, state);
        }

        const emojis = ConfigManager.get("Emojis") || {};
        let options = [];
        if (state.game === "lol") {
            const eTop = emojis.lobby_lol_top?.match(/\d+/) ? { id: emojis.lobby_lol_top.match(/\d+/)[0] } : undefined;
            const eJng = emojis.lobby_lol_jungle?.match(/\d+/) ? { id: emojis.lobby_lol_jungle.match(/\d+/)[0] } : undefined;
            const eMid = emojis.lobby_lol_mid?.match(/\d+/) ? { id: emojis.lobby_lol_mid.match(/\d+/)[0] } : undefined;
            const eAdc = emojis.lobby_lol_adc?.match(/\d+/) ? { id: emojis.lobby_lol_adc.match(/\d+/)[0] } : undefined;
            const eSup = emojis.lobby_lol_support?.match(/\d+/) ? { id: emojis.lobby_lol_support.match(/\d+/)[0] } : undefined;

            options = [
                { label: "Top (Üst)", value: "Top", emoji: eTop },
                { label: "Jungle (Orman)", value: "Jungle", emoji: eJng },
                { label: "Mid (Orta)", value: "Mid", emoji: eMid },
                { label: "ADC (Alt)", value: "ADC", emoji: eAdc },
                { label: "Support (Destek)", value: "Support", emoji: eSup },
                { label: "Fark Etmez / Herhangi", value: "Fark Etmez" }
            ];
        } else {
            const eDuel = emojis.lobby_valo_duelist?.match(/\d+/) ? { id: emojis.lobby_valo_duelist.match(/\d+/)[0] } : undefined;
            const eSent = emojis.lobby_valo_sentinel?.match(/\d+/) ? { id: emojis.lobby_valo_sentinel.match(/\d+/)[0] } : undefined;
            const eInit = emojis.lobby_valo_initiator?.match(/\d+/) ? { id: emojis.lobby_valo_initiator.match(/\d+/)[0] } : undefined;
            const eCont = emojis.lobby_valo_controller?.match(/\d+/) ? { id: emojis.lobby_valo_controller.match(/\d+/)[0] } : undefined;

            options = [
                { label: "Düellocu", value: "Düellocu", emoji: eDuel },
                { label: "Gözcü", value: "Gözcü", emoji: eSent },
                { label: "Öncü", value: "Öncü", emoji: eInit },
                { label: "Kontrol Uzmanı", value: "Kontrol Uzmanı", emoji: eCont },
                { label: "Fark Etmez", value: "Fark Etmez" }
            ];
        }

        const components = [{
            type: 1,
            components: [{
                type: 3,
                custom_id: "lobby_sel_roles",
                placeholder: "Aranan Rolleri Seç (Birden fazla seçebilirsin)",
                min_values: 1,
                max_values: 4,
                options
            }]
        }];
        return interaction.update({ components });
    }

    if (interaction.isStringSelectMenu() && customId === "lobby_sel_roles") {
        const roles = interaction.values;
        const state = userLobbyState.get(user.id) || {};
        state.roles = roles;
        userLobbyState.set(user.id, state);

        return showRankAndUserStep(interaction, state);
    }

    if (interaction.isStringSelectMenu() && customId === "lobby_sel_rank") {
        const state = userLobbyState.get(user.id) || {};
        state.rankRange = interaction.values[0];
        userLobbyState.set(user.id, state);
        return showRankAndUserStep(interaction, state);
    }

    if (interaction.isUserSelectMenu() && customId === "lobby_sel_users") {
        const state = userLobbyState.get(user.id) || {};
        const selectedIds = interaction.values;

        const reqAccounts = await RiotAccount.find({ userId: { $in: selectedIds }, gameType: state.game, isVerified: true });

        if (reqAccounts.length !== selectedIds.length) {
            const validIds = reqAccounts.map(a => a.userId);
            const missing = selectedIds.filter(id => !validIds.includes(id));
            return interaction.reply({ content: `⚠️ Hata: Seçtiğiniz kullanıcılardan bazılarının doğrulanmış **${state.game === "lol" ? "League of Legends" : "VALORANT"}** hesabı bulunmuyor!\nDoğrulanmamışlar: ${missing.map(id => "<@" + id + ">").join(", ")}`, ephemeral: true });
        }

        state.partyUsers = selectedIds;
        userLobbyState.set(user.id, state);
        return showRankAndUserStep(interaction, state);
    }

    if (interaction.isButton() && customId === "lobby_btn_continue") {
        const state = userLobbyState.get(user.id);
        if (!state) return interaction.reply({ content: "İşlem zaman aşımına uğradı.", ephemeral: true });

        const modal = new ModalBuilder()
            .setCustomId("lobby_modal_final")
            .setTitle("Hedef & Dokunuşlar");

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("player_count")
                    .setLabel("Kaç Kişi Arıyorsun?")
                    .setPlaceholder("Örn: 2 kişi eksik, 1 pre vs.")
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(30)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("lobby_note")
                    .setLabel("Eklemek İstediğin Not (Opsiyonel)")
                    .setPlaceholder("Örn: Sadece sesliye gelecekler gelsin. / Toxic olmayanlar!")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
            )
        );

        return interaction.showModal(modal);
    }

    if (interaction.isButton() && customId.startsWith("lobby_join_")) {
        const lobbyUserId = customId.replace("lobby_join_", "");
        if (lobbyUserId === user.id) return interaction.reply({ content: "⚠️ Kendi kurduğunuz lobiye katılamazsınız.", ephemeral: true });

        const lobby = await GameLobby.findOne({ userId: lobbyUserId });
        if (!lobby) return interaction.reply({ content: "⚠️ Bu lobi artık aktif değil veya kapatılmış.", ephemeral: true });

        if (lobby.partyUsers.includes(user.id)) return interaction.reply({ content: "⚠️ Zaten bu lobi içerisinde bulunuyorsunuz.", ephemeral: true });
        if (lobby.playerCount <= 0) return interaction.reply({ content: "⚠️ Bu lobi için aranan oyuncu sayısı dolmuş.", ephemeral: true });

        const account = await RiotAccount.findOne({ userId: user.id, gameType: lobby.game, isVerified: true });
        if (!account) return interaction.reply({ content: `⚠️ Bu lobiye katılmak için **${lobby.game === "lol" ? "League of Legends" : "VALORANT"}** hesabınızı 'Oyun Hesapları Yönetimi'nden bağlamış olmanız gerekmektedir.`, ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        const emojis = ConfigManager.get("Emojis") || {};
        const gameName = lobby.game === "lol" ? "League of Legends" : "VALORANT";
        const msgStr = `## ${emojis.toji_info || ""} Lobi Katılım İsteği\n<@${lobbyUserId}>, **<@${user.id}>** adlı oyuncu **${gameName}** lobine katılmak istiyor!\n\n${emojis.toji_nokta || "-"} **Bağlı Oyun Hesabı:** \`${account.riotId || "Bilinmiyor"}\`\n${emojis.toji_nokta || "-"} **Hesap Seviyesi / Rank:** \`${account.rank || "Belirtilmemiş"}\`\n\nLütfen aşağıdaki butonlardan isteği değerlendir.`;

        const onayId = emojis.toji_onay?.match(/\d+/) ? { id: emojis.toji_onay.match(/\d+/)[0] } : undefined;
        const iptalId = emojis.toji_iptal?.match(/\d+/) ? { id: emojis.toji_iptal.match(/\d+/)[0] } : undefined;

        const row = {
            type: 1,
            components: [
                { type: 2, custom_id: `lobby_req_acc_${lobbyUserId}_${user.id}`, label: "Kabul Et", style: 3, emoji: onayId },
                { type: 2, custom_id: `lobby_req_rej_${lobbyUserId}_${user.id}`, label: "Reddet", style: 4, emoji: iptalId }
            ]
        };

        const chanId = ConfigManager.get("Channels")?.LobbyChannel;
        const channel = interaction.client.channels.cache.get(chanId);
        if (channel) {
            await channel.send({ content: msgStr, components: [row] });
            return interaction.followUp("✅ Katılma isteğin lobi sahibine iletildi. Onaylanması bekleniyor!");
        }
        return interaction.followUp("⚠️ Lobi kanalı bulunamadı.");
    }

    if (interaction.isButton() && customId.startsWith("lobby_req_acc_")) {
        const parts = customId.split("_");
        const lobbyUserId = parts[3];
        const joinerId = parts[4];

        if (user.id !== lobbyUserId) return interaction.reply({ content: "⚠️ Bu isteği yalnızca lobi sahibi yanıtlayabilir.", ephemeral: true });

        const lobby = await GameLobby.findOne({ userId: lobbyUserId });
        if (!lobby) {
            await interaction.message.delete().catch(() => { });
            return interaction.reply({ content: "Lobi artık aktif değil.", ephemeral: true });
        }

        if (lobby.playerCount > 0 && !lobby.partyUsers.includes(joinerId)) {
            lobby.playerCount -= 1;
            lobby.partyUsers.push(joinerId);
            await GameLobby.updateOne({ userId: lobbyUserId }, { playerCount: lobby.playerCount, partyUsers: lobby.partyUsers });

            if (lobby.voiceChannelId) {
                const vChan = interaction.client.channels.cache.get(lobby.voiceChannelId);
                if (vChan) {
                    await vChan.permissionOverwrites.edit(joinerId, { Connect: true }).catch(() => { });
                }
            }

            if (lobby.messageId) {
                const chanId = ConfigManager.get("Channels")?.LobbyChannel;
                const channel = interaction.client.channels.cache.get(chanId);
                if (channel) {
                    const msg = await channel.messages.fetch(lobby.messageId).catch(() => null);
                    if (msg) {
                        const comp = buildLobbyMessage(lobby, await interaction.client.users.fetch(lobbyUserId));
                        await msg.edit({ components: comp }).catch(() => { });
                    }
                }
            }
        }
        await interaction.message.delete().catch(() => { });
        return interaction.reply({ content: `✅ <@${joinerId}> lobiye başarıyla katıldı!`, ephemeral: true });
    }

    if (interaction.isButton() && customId.startsWith("lobby_req_rej_")) {
        const parts = customId.split("_");
        if (user.id !== parts[3]) return interaction.reply({ content: "Buna lobi sahibi karar verir.", ephemeral: true });

        await interaction.message.delete().catch(() => { });
        return interaction.reply({ content: `İstek reddedildi.`, ephemeral: true });
    }

    if (interaction.isButton() && customId.startsWith("lobby_leave_")) {
        const lobbyUserId = customId.replace("lobby_leave_", "");

        const lobby = await GameLobby.findOne({ userId: lobbyUserId });
        if (!lobby) return interaction.reply({ content: "⚠️ Bu lobi kapalı.", ephemeral: true });

        if (!lobby.partyUsers.includes(user.id)) return interaction.reply({ content: "⚠️ Zaten bu lobide değilsiniz.", ephemeral: true });

        lobby.partyUsers = lobby.partyUsers.filter(u => u !== user.id);
        lobby.playerCount += 1;
        await GameLobby.updateOne({ userId: lobbyUserId }, { playerCount: lobby.playerCount, partyUsers: lobby.partyUsers });

        if (lobby.voiceChannelId) {
            const vChan = interaction.client.channels.cache.get(lobby.voiceChannelId);
            if (vChan) {
                await vChan.permissionOverwrites.delete(user.id).catch(() => { });
                const memberInVc = vChan.members.get(user.id);
                if (memberInVc) {
                    await memberInVc.voice.disconnect("Lobiden ayrıldı").catch(() => { });
                }
            }
        }

        if (lobby.messageId) {
            const chanId = ConfigManager.get("Channels")?.LobbyChannel;
            const channel = interaction.client.channels.cache.get(chanId);
            if (channel) {
                const msg = await channel.messages.fetch(lobby.messageId).catch(() => null);
                if (msg) {
                    const comp = buildLobbyMessage(lobby, await interaction.client.users.fetch(lobbyUserId).catch(() => user));
                    await msg.edit({ components: comp }).catch(() => { });
                }
            }
        }
        return interaction.reply({ content: "Lobiden başarıyla ayrıldınız.", ephemeral: true });
    }

    if (interaction.isButton() && customId.startsWith("lobby_manage_")) {
        const lobbyUserId = customId.split("_")[2];
        if (user.id !== lobbyUserId) return interaction.reply({ content: "⚠️ Yalnızca lobi sahibi oyuncuları atabilir.", ephemeral: true });

        const lobby = await GameLobby.findOne({ userId: lobbyUserId });
        if (!lobby) return interaction.reply({ content: "⚠️ Lobi artık aktif değil.", ephemeral: true });
        if (lobby.partyUsers.length === 0) return interaction.reply({ content: "⚠️ Lobinizde şu an kimse yok.", ephemeral: true });

        let options = [];
        for (const uid of lobby.partyUsers) {
            let name = uid;
            try {
                const u = await interaction.client.users.fetch(uid);
                name = u.username;
            } catch (e) { }
            options.push({ label: name, value: uid });
        }

        const row = {
            type: 1,
            components: [
                {
                    type: 3,
                    custom_id: "lobby_kicksell_" + lobbyUserId,
                    placeholder: "Atmak istediğiniz oyuncuyu seçin",
                    options
                }
            ]
        };

        return interaction.reply({ content: "Lobinizden atmak istediğiniz oyuncuyu seçin:", components: [row], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && customId.startsWith("lobby_kicksell_")) {
        const lobbyUserId = customId.split("_")[2];
        if (user.id !== lobbyUserId) return interaction.reply({ content: "⚠️ İzinsiz işlem.", ephemeral: true });

        const kickedId = interaction.values[0];
        const lobby = await GameLobby.findOne({ userId: lobbyUserId });
        if (!lobby || !lobby.partyUsers.includes(kickedId)) {
            return interaction.update({ content: "⚠️ Lobi veya kullanıcı bulunamadı.", components: [] });
        }

        lobby.partyUsers = lobby.partyUsers.filter(u => u !== kickedId);
        lobby.playerCount += 1;
        await GameLobby.updateOne({ userId: lobbyUserId }, { playerCount: lobby.playerCount, partyUsers: lobby.partyUsers });

        if (lobby.voiceChannelId) {
            const vChan = interaction.client.channels.cache.get(lobby.voiceChannelId);
            if (vChan) {
                await vChan.permissionOverwrites.delete(kickedId).catch(() => { });
                const memberInVc = vChan.members.get(kickedId);
                if (memberInVc) {
                    await memberInVc.voice.disconnect("Lobiden atıldı").catch(() => { });
                }
            }
        }

        if (lobby.messageId) {
            const chanId = ConfigManager.get("Channels")?.LobbyChannel;
            const channel = interaction.client.channels.cache.get(chanId);
            if (channel) {
                const msg = await channel.messages.fetch(lobby.messageId).catch(() => null);
                if (msg) {
                    const comp = buildLobbyMessage(lobby, await interaction.client.users.fetch(lobbyUserId).catch(() => user));
                    await msg.edit({ components: comp }).catch(() => { });
                }
            }
        }

        return interaction.update({ content: `✅ <@${kickedId}> lobiden başarıyla atıldı.`, components: [] });
    }

    if (interaction.isModalSubmit() && customId === "lobby_modal_final") {
        const chanId = ConfigManager.get("Channels")?.LobbyChannel;
        if (!chanId) {
            return interaction.reply({ content: "⚠️ Hata: Sistemde aktif bir `Lobi Kanalı` bulunmuyor. Lütfen yöneticiyle iletişime geç.", ephemeral: true });
        }

        const lobbyChannel = interaction.client.channels.cache.get(chanId);
        if (!lobbyChannel) {
            return interaction.reply({ content: "⚠️ Hata: Sistemde belirtilen Lobi Kanalı bulunamadı veya botun erişimi yok.", ephemeral: true });
        }

        let pCountStr = interaction.fields.getTextInputValue("player_count") || "1";
        let parsedCount = parseInt(pCountStr.replace(/\D/g, ""));
        if (isNaN(parsedCount) || parsedCount < 1) parsedCount = 1;
        const playerCount = parsedCount;

        const note = interaction.fields.getTextInputValue("lobby_note") || "";
        const state = userLobbyState.get(user.id);

        if (!state) {
            return interaction.reply({ content: "İşlem zaman aşımına uğramış. Lütfen butona tekrar basın.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const oldLobby = await GameLobby.findOne({ userId: user.id });
        if (oldLobby && oldLobby.messageId) {
            const oldMsg = await lobbyChannel.messages.fetch(oldLobby.messageId).catch(() => null);
            if (oldMsg && oldMsg.deletable) await oldMsg.delete().catch(() => { });
        }

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // +5 min

        const lobbyObj = {
            userId: user.id,
            game: state.game,
            mode: state.mode,
            roles: state.roles || [],
            partyUsers: state.partyUsers || [],
            playerCount,
            rankRange: state.rankRange || "Fark Etmez",
            note,
            expiresAt
        };

        const lobbyCatId = ConfigManager.get("Channels")?.LobbyCategory;
        if (lobbyCatId) {
            try {
                const guild = interaction.guild;
                const everyoneRole = guild.roles.cache.find(r => r.name === "@everyone");
                const permOverwrites = [
                    { id: everyoneRole ? everyoneRole.id : guild.id, deny: ["Connect"] },
                    { id: user.id, allow: ["Connect"] }
                ];
                if (state.partyUsers && state.partyUsers.length > 0) {
                    for (const pId of state.partyUsers) {
                        permOverwrites.push({ id: pId, allow: ["Connect"] });
                    }
                }
                const vChannel = await guild.channels.create({
                    name: `Lobi - ${interaction.user.username}`,
                    type: 2,
                    parent: lobbyCatId,
                    permissionOverwrites: permOverwrites
                });
                lobbyObj.voiceChannelId = vChannel.id;
            } catch (err) { }
        }

        const comp = buildLobbyMessage(lobbyObj, interaction.user);
        const sentMsg = await lobbyChannel.send({ components: comp, flags: [MessageFlags.IsComponentsV2] });

        lobbyObj.messageId = sentMsg.id;

        await GameLobby.findOneAndUpdate(
            { userId: user.id },
            lobbyObj,
            { upsert: true, new: true }
        );

        userLobbyState.delete(user.id);

        return interaction.followUp({ content: `✅ Lobin başarıyla oluşturuldu/güncellendi ve <#${chanId}> kanalına gönderildi!\nLobin orada 5 dakika boyunca aktif kalacaktır.` });
    }
};

function buildLobbyMessage(lobby, user) {
    const emojis = ConfigManager.get("Emojis") || {};
    const roleEmojiMap = {
        "Top": emojis.lobby_lol_top || "Top",
        "Jungle": emojis.lobby_lol_jungle || "Jungle",
        "Mid": emojis.lobby_lol_mid || "Mid",
        "ADC": emojis.lobby_lol_adc || "ADC",
        "Support": emojis.lobby_lol_support || "Support",
        "Düellocu": emojis.lobby_valo_duelist || "Düellocu",
        "Gözcü": emojis.lobby_valo_sentinel || "Gözcü",
        "Öncü": emojis.lobby_valo_initiator || "Öncü",
        "Kontrol Uzmanı": emojis.lobby_valo_controller || "Kontrol Uzmanı"
    };

    const gameStr = lobby.game === "lol" ? (emojis.riot_lol || "League of Legends") : (emojis.riot_valo || "VALORANT");
    const timeExpireUnix = Math.floor(lobby.expiresAt.getTime() / 1000);

    const roleStr = lobby.roles && lobby.roles.length > 0
        ? lobby.roles.map(r => roleEmojiMap[r] || r).join(" | ")
        : "Fark Etmez / Mod Desteklemiyor";

    const partyStr = lobby.partyUsers && lobby.partyUsers.length > 0
        ? lobby.partyUsers.map(id => `<@${id}>`).join(", ")
        : "Yok";

    let rankDisplay = lobby.rankRange;
    if (lobby.rankRange !== "Fark Etmez") {
        if (lobby.game === "lol") {
            if (lobby.rankRange === "Demir - Gümüş") rankDisplay = `${emojis.riot_lol_iron || ""} ${emojis.riot_lol_silver || ""} Demir - Gümüş`;
            if (lobby.rankRange === "Altın - Platin") rankDisplay = `${emojis.riot_lol_gold || ""} ${emojis.riot_lol_platinum || ""} Altın - Platin`;
            if (lobby.rankRange === "Zümrüt - Elmas") rankDisplay = `${emojis.riot_lol_emerald || ""} ${emojis.riot_lol_diamond || ""} Zümrüt - Elmas`;
            if (lobby.rankRange === "Ustalık +") rankDisplay = `${emojis.riot_lol_master || ""} ${emojis.riot_lol_challenger || ""} Ustalık +`;
        } else {
            if (lobby.rankRange === "Demir - Gümüş") rankDisplay = `${emojis.riot_valo_iron || ""} ${emojis.riot_valo_silver || ""} Demir - Gümüş`;
            if (lobby.rankRange === "Altın - Platin") rankDisplay = `${emojis.riot_valo_gold || ""} ${emojis.riot_valo_platinum || ""} Altın - Platin`;
            if (lobby.rankRange === "Elmas - Yücelik") rankDisplay = `${emojis.riot_valo_diamond || ""} ${emojis.riot_valo_ascendant || ""} Elmas - Yücelik`;
            if (lobby.rankRange === "Ölümsüzlük +") rankDisplay = `${emojis.riot_valo_immortal || ""} ${emojis.riot_valo_radiant || ""} Ölümsüzlük +`;
        }
    }

    let contentStr = `## ${emojis.lobby_crown || ""} Yeni Oyun Lobisi!`;
    contentStr += `\n\n### Oyun Bilgileri\n${gameStr} ${emojis.toji_nokta || "-"} **${lobby.mode}**\n`;
    contentStr += `\n### Lobi Nitelikleri\n`;
    contentStr += `${emojis.toji_nokta || "-"} **Lobi Kurucusu:** <@${lobby.userId}>\n`;
    contentStr += `${emojis.toji_nokta || "-"} **Aranan Oyuncu Sayısı:** ${lobby.playerCount} Kişi\n`;
    contentStr += `${emojis.toji_nokta || "-"} **Aranan Roller:** ${roleStr}\n`;
    contentStr += `${emojis.toji_nokta || "-"} **Rank:** ${rankDisplay}\n`;
    contentStr += `${emojis.toji_nokta || "-"} **Hazırda Olan Ekip:** ${partyStr}\n`;
    if (lobby.note) contentStr += `\n### Ekstra Not\n> *${lobby.note}*\n`;

    contentStr += `\n━━━━━━━━━━━━━━━━\n`;
    contentStr += `${emojis.lobby_timer || ""} **Lobi Zaman Aşımı:** <t:${timeExpireUnix}:R>\n*(Lobi süresi dolduğunda bu lobi otomatik silinir)*`;

    const lobiKatilId = emojis.toji_onay?.match(/\d+/) ? { id: emojis.toji_onay.match(/\d+/)[0] } : undefined;
    const lobiAyrilId = emojis.toji_iptal?.match(/\d+/) ? { id: emojis.toji_iptal.match(/\d+/)[0] } : undefined;
    const lobiManageId = emojis.toji_staff?.match(/\d+/) ? { id: emojis.toji_staff.match(/\d+/)[0] } : undefined;

    return [{
        type: 17,
        components: [
            { type: 10, content: contentStr },
            { type: 14, divider: true, spacing: 1 },
            {
                type: 1,
                components: [
                    { type: 2, custom_id: `lobby_join_${lobby.userId}`, label: "Lobiye İzin İste", style: 3, emoji: lobiKatilId, disabled: lobby.playerCount <= 0 },
                    { type: 2, custom_id: `lobby_leave_${lobby.userId}`, label: "Lobiden Ayrıl", style: 4, emoji: lobiAyrilId },
                    { type: 2, custom_id: `lobby_manage_${lobby.userId}`, label: "Oyuncu At", style: 2, emoji: lobiManageId }
                ]
            }
        ]
    }];
}

async function startLobbyFlow(interaction, isUpdate = false) {
    const emojis = ConfigManager.get("Emojis") || {};
    const lolEmoji = emojis.riot_lol?.match(/\d+/) ? { id: emojis.riot_lol.match(/\d+/)[0] } : undefined;
    const valoEmoji = emojis.riot_valo?.match(/\d+/) ? { id: emojis.riot_valo.match(/\d+/)[0] } : undefined;

    userLobbyState.set(interaction.user.id, {});

    const components = [{
        type: 1,
        components: [
            {
                type: 3,
                custom_id: "lobby_sel_game",
                placeholder: "Hangi oyun için lobi oluşturuyorsun?",
                options: [
                    { label: "League of Legends", value: "lol", emoji: lolEmoji },
                    { label: "VALORANT", value: "valo", emoji: valoEmoji }
                ]
            }
        ]
    }];

    if (isUpdate) {
        return interaction.update({ content: "✨ Eski lobiniz başarıyla silindi.\n\nYeni lobinizi oluşturmak için lütfen aşağıdan oyununuzu seçerek işlemlere baştan başlayın.", components });
    }
    return interaction.reply({ components, ephemeral: true });
}

async function showRankAndUserStep(interaction, state) {
    const emojis = ConfigManager.get("Emojis") || {};
    const onayId = emojis.toji_onay?.match(/\d+/) ? { id: emojis.toji_onay.match(/\d+/)[0] } : undefined;

    const rankOptions = state.game === "lol" ? [
        { label: "Fark Etmez", value: "Fark Etmez" },
        { label: "Demir - Gümüş", value: "Demir - Gümüş" },
        { label: "Altın - Platin", value: "Altın - Platin" },
        { label: "Zümrüt - Elmas", value: "Zümrüt - Elmas" },
        { label: "Ustalık +", value: "Ustalık +" }
    ] : [
        { label: "Fark Etmez", value: "Fark Etmez" },
        { label: "Demir - Gümüş", value: "Demir - Gümüş" },
        { label: "Altın - Platin", value: "Altın - Platin" },
        { label: "Elmas - Yücelik", value: "Elmas - Yücelik" },
        { label: "Ölümsüzlük +", value: "Ölümsüzlük +" }
    ];

    const components = [
        {
            type: 1,
            components: [{
                type: 3,
                custom_id: "lobby_sel_rank",
                placeholder: state.rankRange ? `Seçilen Rank: ${state.rankRange}` : "Oynamak İstediğin Rank Aralığı",
                options: rankOptions
            }]
        },
        {
            type: 1,
            components: [{
                type: 5, 
                custom_id: "lobby_sel_users",
                placeholder: state.partyUsers ? `Seçilen Ekip Üyeleri: ${state.partyUsers.length} kişi` : "Şu an yanında hazırda bulunan ekibi ekle",
                min_values: 1,
                max_values: 4
            }]
        },
        {
            type: 1,
            components: [{
                type: 2,
                custom_id: "lobby_btn_continue",
                label: "Not Ekle ve Lobiyi Başlat",
                style: 3,
                emoji: onayId
            }]
        }
    ];

    return interaction.update({ components });
}
