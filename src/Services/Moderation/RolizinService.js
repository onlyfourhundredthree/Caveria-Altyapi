const { PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

const PERMISSIONS_LIST = [
    { label: "Davet Oluştur", value: "CreateInstantInvite", description: "Sunucuya davet linki oluşturabilir." },
    { label: "Üyeleri At", value: "KickMembers", description: "Üyeleri sunucudan atabilir." },
    { label: "Üyeleri Yasakla", value: "BanMembers", description: "Üyeleri sunucudan yasaklayabilir." },
    { label: "Yönetici", value: "Administrator", description: "Tüm yetkilere sahip olur, kanal izinlerini ezer." },
    { label: "Kanalları Yönet", value: "ManageChannels", description: "Kanal oluşturabilir, silebilir, düzenleyebilir." },
    { label: "Sunucuyu Yönet", value: "ManageGuild", description: "Sunucu adı, simge, bölge gibi ayarları değiştirebilir." },
    { label: "Tepki Ekle", value: "AddReactions", description: "Mesajlara yeni tepki ekleyebilir." },
    { label: "Denetim Kaydı Gör", value: "ViewAuditLog", description: "Sunucu denetim kaydını görüntüleyebilir." },
    { label: "Öncelikli Konuşmacı", value: "PrioritySpeaker", description: "Ses kanalında sesi bastırılarak öncelikli konuşabilir." },
    { label: "Yayın Aç", value: "Stream", description: "Ses kanalında yayın (ekran paylaşımı) açabilir." },
    { label: "Kanalı Gör", value: "ViewChannel", description: "Kanalı görüntüleyebilir, mesajları okuyabilir." },
    { label: "Mesaj Gönder", value: "SendMessages", description: "Kanala mesaj gönderebilir, forumda konu açabilir." },
    { label: "TTS Mesaj Gönder", value: "SendTTSMessages", description: "/tts ile sesli okunan mesaj gönderebilir." },
    { label: "Mesajları Yönet", value: "ManageMessages", description: "Başkalarının mesajlarını silebilir." },
    { label: "Link Yerleştir", value: "EmbedLinks", description: "Attığı linkler otomatik önizleme gösterir." },
    { label: "Dosya Ekle", value: "AttachFiles", description: "Resim ve dosya yükleyebilir." },
    { label: "Mesaj Geçmişi Oku", value: "ReadMessageHistory", description: "Kanala girdikten sonra eski mesajları görebilir." },
    { label: "Herkesi Etiketle", value: "MentionEveryone", description: "@everyone ve @here etiketlerini kullanabilir." },
    { label: "Harici Emoji Kullan", value: "UseExternalEmojis", description: "Diğer sunuculardan emoji kullanabilir." },
    { label: "Sunucu Analizi Gör", value: "ViewGuildInsights", description: "Sunucu istatistiklerini görüntüleyebilir." },
    { label: "Sese Bağlan", value: "Connect", description: "Ses kanalına katılabilir." },
    { label: "Konuş", value: "Speak", description: "Ses kanalında konuşabilir." },
    { label: "Üyeleri Sustur", value: "MuteMembers", description: "Ses kanalındaki üyeleri susturabilir." },
    { label: "Üyeleri Sağırlaştır", value: "DeafenMembers", description: "Ses kanalındaki üyeleri sağırlaştırabilir." },
    { label: "Üyeleri Taşı", value: "MoveMembers", description: "Üyeleri ses kanalları arasında taşıyabilir." },
    { label: "VAD Kullan", value: "UseVAD", description: "Ses etkinliği algılama ile konuşabilir." },
    { label: "Kullanıcı Adı Değiştir", value: "ChangeNickname", description: "Kendi kullanıcı adını değiştirebilir." },
    { label: "Kullanıcı Adı Yönet", value: "ManageNicknames", description: "Başkalarının kullanıcı adını değiştirebilir." },
    { label: "Rolleri Yönet", value: "ManageRoles", description: "Rol oluşturabilir, silebilir, düzenleyebilir." },
    { label: "Webhook Yönet", value: "ManageWebhooks", description: "Webhook oluşturabilir, silebilir." },
    { label: "Emoji/Sticker Yönet", value: "ManageGuildExpressions", description: "Tüm emoji, sticker ve ses efektlerini düzenleyebilir." },
    { label: "Uygulama Komutları", value: "UseApplicationCommands", description: "Slash komutlarını ve menüleri kullanabilir." },
    { label: "Sahneye Çıkma İsteği", value: "RequestToSpeak", description: "Sahne kanalında konuşma isteği gönderebilir." },
    { label: "Etkinlikleri Yönet", value: "ManageEvents", description: "Tüm kullanıcıların etkinliklerini düzenleyip silebilir." },
    { label: "Konuları Yönet", value: "ManageThreads", description: "Alt başlıkları silebilir, arşivleyebilir, özel başlıkları görebilir." },
    { label: "Herkese Açık Konu Aç", value: "CreatePublicThreads", description: "Herkese açık ve duyuru alt başlığı oluşturabilir." },
    { label: "Özel Konu Aç", value: "CreatePrivateThreads", description: "Özel alt başlık oluşturabilir." },
    { label: "Harici Sticker Kullan", value: "UseExternalStickers", description: "Diğer sunuculardan sticker kullanabilir." },
    { label: "Konuda Mesaj Gönder", value: "SendMessagesInThreads", description: "Alt başlıklarda mesaj gönderebilir." },
    { label: "Aktivite Başlat", value: "UseEmbeddedActivities", description: "Ses kanalında Aktivite (oyun vb.) başlatabilir." },
    { label: "Timeout At", value: "ModerateMembers", description: "Üyelere zaman aşımı (timeout) uygulayabilir." },
    { label: "Ses Paneli Kullan", value: "UseSoundboard", description: "Ses kanalında ses paneli efektlerini kullanabilir." },
    { label: "Emoji/Sticker Oluştur", value: "CreateGuildExpressions", description: "Kendi emoji, sticker ve ses efektlerini oluşturabilir." },
    { label: "Etkinlik Oluştur", value: "CreateEvents", description: "Kendi etkinliklerini oluşturabilir, düzenleyebilir." },
    { label: "Harici Ses Kullan", value: "UseExternalSounds", description: "Diğer sunuculardan ses efektleri kullanabilir." },
    { label: "Sesli Mesaj Gönder", value: "SendVoiceMessages", description: "Sesli mesaj gönderebilir." },
    { label: "Kanal Durumu Ayarla", value: "SetVoiceChannelStatus", description: "Ses kanalı durum metni ayarlayabilir." },
    { label: "Anket Gönder", value: "SendPolls", description: "Anket oluşturup gönderebilir." },
    { label: "Harici Uygulama Kullan", value: "UseExternalApps", description: "Dış uygulamaların herkese açık yanıt vermesine izin verir." },
    { label: "Mesaj Sabitle", value: "PinMessages", description: "Mesajları sabitleyip kaldırabilir." },
    { label: "Yavaş Mod Atla", value: "BypassSlowmode", description: "Kanal yavaş modunu atlayabilir." }
];

const PAGE_SIZE = 25;

class RolizinService {
    static async handleRolizin(context, client) {
        const isInteraction = !!context.commandName;
        const member = context.member;
        const guild = context.guild;
        const author = isInteraction ? context.user : context.author;

        const isOwner = ConfigManager.isOwner(member);
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isOwner && !isAdmin) {
            return context.reply({ content: "Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız.", flags: [MessageFlags.Ephemeral] });
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const itemEmoji = emojis.toji_nokta || "-";
        const onayEmoji = emojis.toji_onay || "✅";
        const iptalEmoji = emojis.toji_iptal || "❌";
        const infoEmoji = emojis.toji_info || "⚪";
        const loadingEmoji = emojis.toji_loading || "⏳";
        const ayarEmoji = emojis.toji_settings || "🛠️";
        const geriEmoji = emojis.toji_geri || "⏪";
        const ileriEmoji = emojis.toji_ileri || "⏩";

        let selectedRoles = [];
        let selectedCategories = [];
        let selectedPermissions = [];
        let currentPage = 0;

        const getLayout = (isProcessing = false, progressData = null, disabled = false) => {
            const panel = new V2PanelBuilder();
            
            const contentText = isProcessing
                ? `## ${loadingEmoji} İşlem Sürüyor\n${itemEmoji} **İlerleme:** \`%${progressData.percent}\` (\`${progressData.current}/${progressData.total}\`)\n${itemEmoji} Kanallar güncelleniyor...`
                : `## ${ayarEmoji} İzin Yönetimi\n${selectedRoles.length > 0 ? `${itemEmoji} **Roller:** ${selectedRoles.map(id => `<@&${id}>`).join(", ")}\n` : ""}${selectedCategories.length > 0 ? `${itemEmoji} **Kategoriler:** ${selectedCategories.map(id => `<#${id}>`).join(", ")}\n` : ""}${itemEmoji} **Seçili İzin:** \`${selectedPermissions.length}\`\n> Menülerden seçimlerinizi yapıp işlem butonuna tıklayın.`;
            
            panel.addAccessory(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL(), contentText);

            if (!isProcessing) {
                panel.addDivider();
                
                panel.addActionRow({
                    type: 1,
                    components: [{
                        type: 6,
                        custom_id: "rolizin_roles",
                        placeholder: "İşlem yapılacak rolleri seçin...",
                        min_values: 1,
                        max_values: 25
                    }]
                });

                panel.addActionRow({
                    type: 1,
                    components: [{
                        type: 8,
                        custom_id: "rolizin_channels",
                        placeholder: "Uygulanacak kategorileri seçin (İsteğe bağlı)...",
                        channel_types: [4],
                        min_values: 0,
                        max_values: 25
                    }]
                });

                const totalPages = Math.ceil(PERMISSIONS_LIST.length / PAGE_SIZE);
                const pagePerms = PERMISSIONS_LIST.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
                panel.addActionRow({
                    type: 1,
                    components: [{
                        type: 3,
                        custom_id: `perm_select`,
                        placeholder: `İzinleri seçin (Sayfa ${currentPage + 1}/${totalPages})...`,
                        min_values: 0,
                        max_values: pagePerms.length,
                        options: pagePerms.map(perm => ({
                            label: perm.label,
                            value: perm.value,
                            description: perm.description,
                            default: selectedPermissions.includes(perm.value)
                        }))
                    }]
                });
            }

            const totalPages = Math.ceil(PERMISSIONS_LIST.length / PAGE_SIZE);
            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("rolizin_prev").setEmoji(geriEmoji).setStyle(ButtonStyle.Secondary).setDisabled(disabled || currentPage === 0),
                new ButtonBuilder().setCustomId("rolizin_allow").setEmoji(onayEmoji).setLabel("İzin Ver").setStyle(ButtonStyle.Success).setDisabled(disabled || selectedRoles.length === 0 || selectedPermissions.length === 0),
                new ButtonBuilder().setCustomId("rolizin_deny").setEmoji(iptalEmoji).setLabel("Yasakla").setStyle(ButtonStyle.Danger).setDisabled(disabled || selectedRoles.length === 0 || selectedPermissions.length === 0),
                new ButtonBuilder().setCustomId("rolizin_neutral").setEmoji(infoEmoji).setLabel("Sıfırla").setStyle(ButtonStyle.Secondary).setDisabled(disabled || selectedRoles.length === 0 || selectedPermissions.length === 0),
                new ButtonBuilder().setCustomId("rolizin_next").setEmoji(ileriEmoji).setStyle(ButtonStyle.Secondary).setDisabled(disabled || currentPage === totalPages - 1)
            );
            panel.addActionRow(btnRow);

            return panel.toJSON();
        };

        const response = await context.reply({
            flags: [MessageFlags.IsComponentsV2],
            components: getLayout(),
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== author.id) return i.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });

            if (i.customId === "rolizin_roles") {
                selectedRoles = i.values;
                return i.update({ components: getLayout() });
            }

            if (i.customId === "rolizin_channels") {
                selectedCategories = i.values;
                return i.update({ components: getLayout() });
            }

            if (i.customId === "perm_select") {
                const pagePerms = PERMISSIONS_LIST.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
                const pageValues = pagePerms.map(p => p.value);
                const otherSelections = selectedPermissions.filter(p => !pageValues.includes(p));
                selectedPermissions = [...new Set([...otherSelections, ...i.values])];
                return i.update({ components: getLayout() });
            }

            if (i.customId === "rolizin_prev") {
                currentPage = Math.max(0, currentPage - 1);
                return i.update({ components: getLayout() });
            }

            if (i.customId === "rolizin_next") {
                const totalPages = Math.ceil(PERMISSIONS_LIST.length / PAGE_SIZE);
                currentPage = Math.min(totalPages - 1, currentPage + 1);
                return i.update({ components: getLayout() });
            }

            const actionMap = { "rolizin_allow": true, "rolizin_deny": false, "rolizin_neutral": null };
            const state = actionMap[i.customId];

            if (state !== undefined) {
                await i.deferUpdate();

                let channels = guild.channels.cache.filter(c => c.type !== 4);
                if (selectedCategories.length > 0) {
                    channels = channels.filter(c => selectedCategories.includes(c.parentId));
                }
                const total = channels.size * selectedRoles.length;
                if (total === 0) {
                    const errorPanel = new V2PanelBuilder();
                    errorPanel.addAccessory(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL(), `## ${iptalEmoji} Hata\nİşlem yapılacak kanal bulunamadı.`);
                    return i.update({ components: errorPanel.toJSON(), content: "" }).catch(() => {});
                }
                let current = 0;
                let failCount = 0;

                const updateUI = async (curr) => {
                    const payload = {
                        components: getLayout(true, { percent: Math.floor((curr / total) * 100), current: curr, total }, true)
                    };
                    if (isInteraction) {
                        await context.editReply(payload).catch(() => {});
                    } else {
                        await response.edit(payload).catch(() => {});
                    }
                };

                const permissionObject = {};
                selectedPermissions.forEach(p => permissionObject[p] = state);

                const resolvedRoles = selectedRoles.map(id => guild.roles.cache.get(id)).filter(r => r);

                for (const [id, channel] of channels) {
                    for (const r of resolvedRoles) {
                        try {
                            await channel.permissionOverwrites.edit(r, permissionObject, { reason: `Rol İzin Yönetimi - ${author.tag}` });
                            current++;
                        } catch { failCount++; }
                        if (current % 10 === 0) await updateUI(current);
                    }
                }

                const finishPanel = new V2PanelBuilder();
                finishPanel.addAccessory(guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL(), `## ${onayEmoji} Tamamlandı\n${itemEmoji} **Roller:** ${resolvedRoles.map(r => r.toString()).join(", ")}\n${selectedCategories.length > 0 ? `${itemEmoji} **Kategoriler:** ${selectedCategories.map(id => `<#${id}>`).join(", ")}\n` : ""}${itemEmoji} **İzinler:** \`${selectedPermissions.length}\` adet\n${itemEmoji} **İşlem:** \`${state === true ? "Verildi" : state === false ? "Yasaklandı" : "Sıfırlandı"}\`\n\n${itemEmoji} Başarılı: \`${current}\` | Hata: \`${failCount}\``);
                
                const payload = {
                    components: finishPanel.toJSON(),
                    content: ""
                };

                if (isInteraction) {
                    await context.editReply(payload).catch(() => {});
                } else {
                    await response.edit(payload).catch(() => {});
                }
                collector.stop();
            }
        });
    }
}

module.exports = RolizinService;
