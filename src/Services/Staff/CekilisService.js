const ConfigManager = require("../../Core/Handlers/ConfigManager");
const {
    PermissionsBitField,
    MessageFlags,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const ms = require("ms");

class CekilisService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;
        const client = context.client;

        const emojis = ConfigManager.get("Emojis") || {};
        const toji_info = emojis.toji_info || "ℹ️";
        const toji_nokta = emojis.toji_nokta || "•";
        const toji_onay = emojis.toji_onay || "✅";
        const confetti = emojis.confetti || "🎉";

        if (!ConfigManager.isOwner(member)) {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !(ConfigManager.get("Roles.Ban_Staff") || []).some(toji => member.roles.cache.has(toji))) {
                const errObj = { content: "Bu komutu kullanmaya yetkiniz yok.", ephemeral: true };
                if (isInteraction) return context.reply(errObj);
                return context.reply(errObj);
            }
        }

        const mainPanel = () => {
            const panel = new V2PanelBuilder()
                .addText(`${toji_info} **Çekiliş Yönetim Paneli**`)
                .addDivider(1)
                .addText(`Aşağıdaki butonlardan yapmak istediğiniz işlemi seçiniz.\n-# Çekiliş oluşturabilir, şartlı çekiliş başlatabilir, kazananı tekrarlayabilir veya çekilişi bitirebilirsiniz.`)
                .addDivider(1)
                .addActionRow(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("baslat").setLabel("Çekiliş Oluştur").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("sartli").setLabel("Şartlı Çekiliş").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("reroll").setLabel("Kazananı Tekrarla").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("bitir").setLabel("Çekiliş Bitir").setStyle(ButtonStyle.Danger)
                ));
            
            return {
                flags: [MessageFlags.IsComponentsV2],
                components: panel.toJSON()
            };
        };

        const resultPanel = (text) => {
            const panel = new V2PanelBuilder().addText(text);
            return {
                flags: [MessageFlags.IsComponentsV2],
                components: panel.toJSON()
            };
        };

        const replyPayload = mainPanel();
        let iMessage;

        if (isInteraction) {
            replyPayload.fetchReply = true;
            iMessage = await context.reply(replyPayload);
        } else {
            iMessage = await context.reply(replyPayload);
        }

        const filter = (i) => i.user.id === member.id;
        const collector = iMessage.createMessageComponentCollector({ filter, errors: ["time"], time: 300000 });

        collector.on('collect', async (i) => {
            if (i.customId == "baslat") {
                await i.showModal(
                    new ModalBuilder()
                        .setCustomId(`cekilis_${i.user.id}`)
                        .setTitle(`Çekiliş Başlat`)
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder().setCustomId(`ödül`).setLabel(`Ödül?`).setPlaceholder(`Nitro, BluTV, Disney+ vb.`).setStyle(1).setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder().setCustomId(`winrs`).setLabel(`Kazanan Sayısı?`).setPlaceholder(`Kaç kişi kazanacak?`).setStyle(1).setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder().setCustomId(`süre`).setLabel(`Süre?`).setPlaceholder(`S: s, Dakika: m, Saat: h, Gün: d`).setStyle(1).setRequired(true)
                            )
                        )
                );

                await i.awaitModalSubmit({ filter: (modal) => modal.customId === `cekilis_${i.user.id}`, time: 60 * 60 * 1000 })
                    .then(async (modal) => {
                        const prize = modal.fields.getTextInputValue('ödül');
                        const winners = modal.fields.getTextInputValue('winrs');
                        const duration = ms(modal.fields.getTextInputValue('süre'));
                        const winnerCount = parseInt(winners, 10);

                        client.giveawayManager.start(context.channel, {
                            duration, winnerCount, prize,
                            hostedBy: author,
                            lastChance: { enabled: false },
                            messages: {
                                giveaway: `${confetti} **Çekiliş!** ${confetti}`,
                                giveawayEnded: "**Çekiliş sona erdi.**",
                                inviteToParticipate: `Katılmak için ${confetti} tepkisine tıkla!`,
                                winMessage: `Tebrikler!, {winners}! **{this.prize}** kazandın! ${confetti}\n{this.messageURL}`,
                                drawing: "{timestamp}",
                                dropMessage: "Hemen katılmak için tepkiye bas!",
                                embedFooter: "{this.winnerCount} kazanan(lar) olacak. Yerini hemen al!",
                                noWinner: "Çekiliş sonlandırıldı. **Kazanan yok!**",
                                winners: "kazanan(lar)",
                                endedAt: "Ş tarihte sona erdi:",
                                hostedBy: "Tarafından: {this.hostedBy}",
                                units: { seconds: "saniye", minutes: "dakika", hours: "saat", days: "gün", pluralS: false }
                            }
                        });

                        await modal.deferUpdate();
                        await iMessage.edit(resultPanel(`${toji_onay} **Çekiliş başarıyla başlatıldı.**\n-# Ödül: **${prize}** | Kazanan: **${winnerCount}** kişi`));
                        setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                    }).catch(() => undefined);
            }

            else if (i.customId === "sartli") {
                let config = {
                    prize: null, winners: null, durationRaw: null, duration: null,
                    minMsg: 0, minVoiceRaw: null, minVoice: 0,
                    minVote: 0, minReview: 0, minInvite: 0, staffOnly: false
                };

                const buildPanel = () => {
                    const panel = new V2PanelBuilder()
                        .addText(`${toji_info} **Şartlı Çekiliş Kurulum Paneli**`)
                        .addDivider(1)
                        .addText(`Aşağıdaki menüden ayarlamak istediğiniz şartı seçin, ayarlamaları bitirdikten sonra **Başlat** butonuna tıklayın.`)
                        .addDivider(1)
                        .addText(`**Ana Ayarlar**\n${toji_nokta} Ödül: **${config.prize || "Belirlenmedi"}**\n${toji_nokta} Kazanan Sayısı: **${config.winners || "Belirlenmedi"}**\n${toji_nokta} Süre: **${config.durationRaw || "Belirlenmedi"}**`)
                        .addDivider(1)
                        .addText(`**Şartlar**\n${toji_nokta} Mesaj: **${config.minMsg || "Yok"}** | Ses: **${config.minVoiceRaw || "Yok"}** | Oy: **${config.minVote || "Yok"}**\n${toji_nokta} Yorum: **${config.minReview || "Yok"}** | Davet: **${config.minInvite || "Yok"}** | Sadece Yetkili: **${config.staffOnly ? "Evet" : "Hayır"}**`)
                        .addDivider(1);

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`sartli_menu_${i.user.id}`)
                        .setPlaceholder("Ayar seçmek için tıkla...")
                        .addOptions([
                            { label: "Ana Ayarlar (Ödül, Süre vb.)", value: "main" },
                            { label: "Mesaj Şartı", value: "msg" },
                            { label: "Ses Şartı", value: "voice" },
                            { label: "Oy Şartı", value: "vote" },
                            { label: "Yorum Şartı", value: "review" },
                            { label: "Davet Şartı", value: "invite" },
                            { label: "Sadece Yetkili Geçişi", value: "staff" }
                        ]);

                    panel.addActionRow(new ActionRowBuilder().addComponents(selectMenu));
                    panel.addActionRow(new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`start_giveaway_${i.user.id}`).setLabel("Çekilişi Başlat").setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`cancel_giveaway_${i.user.id}`).setLabel("İptal Et").setStyle(ButtonStyle.Danger)
                    ));

                    return panel.toJSON();
                };

                await i.deferUpdate();
                await iMessage.edit({ flags: [MessageFlags.IsComponentsV2], components: buildPanel() });

                const panelCollector = iMessage.createMessageComponentCollector({
                    filter: (int) => int.user.id === i.user.id,
                    time: 10 * 60000
                });

                panelCollector.on('collect', async (i2) => {
                    if (i2.customId === `cancel_giveaway_${i.user.id}`) {
                        panelCollector.stop();
                        await i2.update(resultPanel(`**Şartlı çekiliş kurulumu iptal edildi.**`));
                        setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                        return;
                    }

                    if (i2.customId === `start_giveaway_${i.user.id}`) {
                        if (!config.prize || !config.winners || !config.durationRaw || !config.duration) {
                            return i2.reply({ content: "Lütfen Ana Ayarları (Ödül, Kazanan, Süre) eksiksiz belirleyin!", ephemeral: true });
                        }

                        client.giveawayManager.start(context.channel, {
                            duration: config.duration, winnerCount: config.winners, prize: config.prize,
                            hostedBy: author,
                            lastChance: { enabled: false },
                            extraData: {
                                minMessages: config.minMsg, minVoiceTime: config.minVoice,
                                minVotes: config.minVote, minReviews: config.minReview,
                                minInvites: config.minInvite, staffOnly: config.staffOnly
                            },
                            messages: {
                                giveaway: `**ÇEKİLİŞ!**`,
                                giveawayEnded: "**Çekiliş sona erdi.**",
                                inviteToParticipate: `Katılmak için yandaki butona tıkla!`,
                                winMessage: `Tebrikler!, {winners}! **{this.prize}** kazandın!\n{this.messageURL}`,
                                drawing: "{timestamp}",
                                dropMessage: "Hemen katılmak için butona bas!",
                                embedFooter: "Sonuç {this.winnerCount} kazanan(lar) olacak. Yerini hemen al!",
                                noWinner: "Çekiliş sonlandırıldı. **Kazanan yok!**",
                                winners: "Kazanan(lar)",
                                endedAt: "Sona erdi:",
                                hostedBy: `Tarafından: {this.hostedBy}`,
                            }
                        });

                        panelCollector.stop();
                        await i2.update(resultPanel(`${toji_onay} **Şartlı çekiliş başarıyla başlatıldı ve gereksinimler eklendi!**`));
                        setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                        return;
                    }

                    if (i2.customId === `sartli_menu_${i.user.id}`) {
                        const val = i2.values[0];
                        if (val === "staff") {
                            config.staffOnly = !config.staffOnly;
                            return i2.update({ components: buildPanel() });
                        }

                        let modalTitle = "";
                        let modal = new ModalBuilder().setCustomId(`sartli_modal_${val}_${i.user.id}`);

                        if (val === "main") {
                            modal.setTitle("Ana Ayarlar");
                            modal.addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("prize").setLabel("Ödül").setStyle(1).setRequired(true).setValue(String(config.prize || ""))),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("winners").setLabel("Kazanan Sayısı").setStyle(1).setRequired(true).setValue(String(config.winners || ""))),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("duration").setLabel("Süre (m, h, d)").setStyle(1).setRequired(true).setValue(String(config.durationRaw || "")))
                            );
                            modalTitle = "Ana Ayarlar";
                        } else {
                            const configMap = {
                                msg: { title: "Mesaj Şartı", label: "Gereken Mesaj Sayısı", val: config.minMsg },
                                voice: { title: "Ses Şartı", label: "Gereken Ses (örn: 2h, 30m)", val: config.minVoiceRaw },
                                vote: { title: "Oy Şartı", label: "Gereken Oy Sayısı", val: config.minVote },
                                review: { title: "Yorum Şartı", label: "Gereken Yorum Sayısı", val: config.minReview },
                                invite: { title: "Davet Şartı", label: "Gereken Davet Sayısı", val: config.minInvite }
                            };
                            const cfg = configMap[val];
                            if (cfg) {
                                modal.setTitle(cfg.title);
                                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("val").setLabel(cfg.label).setStyle(1).setRequired(true).setValue(String(cfg.val || ""))));
                                modalTitle = cfg.title;
                            }
                        }

                        if (modalTitle) {
                            await i2.showModal(modal);
                        }

                        try {
                            const m = await i2.awaitModalSubmit({ filter: x => x.customId === `sartli_modal_${val}_${i.user.id}` && x.user.id === i.user.id, time: 60000 });

                            if (val === "main") {
                                config.prize = m.fields.getTextInputValue("prize");
                                config.winners = parseInt(m.fields.getTextInputValue("winners"));
                                config.durationRaw = m.fields.getTextInputValue("duration");
                                config.duration = ms(config.durationRaw);
                            } else if (val === "msg") {
                                config.minMsg = parseInt(m.fields.getTextInputValue("val")) || 0;
                            } else if (val === "voice") {
                                config.minVoiceRaw = m.fields.getTextInputValue("val");
                                config.minVoice = ms(config.minVoiceRaw) || 0;
                            } else if (val === "vote") {
                                config.minVote = parseInt(m.fields.getTextInputValue("val")) || 0;
                            } else if (val === "review") {
                                config.minReview = parseInt(m.fields.getTextInputValue("val")) || 0;
                            } else if (val === "invite") {
                                config.minInvite = parseInt(m.fields.getTextInputValue("val")) || 0;
                            }

                            await m.update({ components: buildPanel() });
                        } catch (e) { }
                    }
                });
            }

            else if (i.customId === "reroll") {
                const endedGiveaways = client.giveawayManager.giveaways.filter(g => g.ended && g.guildId === guild.id).slice(0, 25);
                if (endedGiveaways.length === 0) {
                    return i.reply({ content: `Bitmiş çekiliş bulunamadı.`, ephemeral: true });
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`reroll_select_${i.user.id}`)
                    .setPlaceholder(`Tekrarlanacak çekilişi seçin`)
                    .addOptions(endedGiveaways.map(g => ({
                        label: `${g.prize.slice(0, 50)}`,
                        description: `ID: ${g.messageId}`,
                        value: g.messageId
                    })));

                await i.update({ components: [new ActionRowBuilder().addComponents(selectMenu)] });

                try {
                    const m = await iMessage.awaitMessageComponent({ filter: x => x.customId === `reroll_select_${i.user.id}` && x.user.id === i.user.id, time: 60000 });
                    const messageId = m.values[0];

                    const modal = new ModalBuilder()
                        .setCustomId(`reroll_modal_${i.user.id}`)
                        .setTitle(`Kazanan Sayısı`)
                        .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`winnercount`).setLabel(`Kaç Kişi Seçilsin?`).setPlaceholder(`1`).setStyle(1).setRequired(true)));

                    await m.showModal(modal);

                    const mSubmit = await m.awaitModalSubmit({ filter: x => x.customId === `reroll_modal_${i.user.id}`, time: 60000 });
                    const winnerCount = parseInt(mSubmit.fields.getTextInputValue('winnercount')) || 1;
                    await mSubmit.deferUpdate();

                    client.giveawayManager.reroll(messageId, {
                        winnerCount,
                        messages: {
                            congrat: `Tebrikler!, {winners}! **{this.prize}** kazandın! ${confetti}\n{this.messageURL}`,
                            error: 'Çekiliş sonlandırıldı. **Kazanan yok!**',
                        }
                    }).then(async () => {
                        await iMessage.edit(resultPanel(`${toji_onay} **Tekrar çekim yapıldı!**\n-# Seçilen kişi sayısı: **${winnerCount}**`));
                        setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                    }).catch(async error => {
                        await iMessage.edit(resultPanel(`**Bir hata oluştu:** ${error}`));
                        setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                    });
                } catch (err) {
                    return iMessage.edit(mainPanel()).catch(() => { });
                }
            }

            else if (i.customId === "bitir") {
                const activeGiveaways = client.giveawayManager.giveaways.filter(g => !g.ended && g.guildId === guild.id).slice(0, 25);
                if (activeGiveaways.length === 0) {
                    return i.reply({ content: `Aktif çekiliş bulunamadı.`, ephemeral: true });
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`end_select_${i.user.id}`)
                    .setPlaceholder(`Bitirilecek çekilişi seçin`)
                    .addOptions(activeGiveaways.map(g => ({
                        label: `${g.prize.slice(0, 50)}`,
                        description: `ID: ${g.messageId}`,
                        value: g.messageId
                    })));

                await i.update({ components: [new ActionRowBuilder().addComponents(selectMenu)] });

                try {
                    const m = await iMessage.awaitMessageComponent({ filter: x => x.customId === `end_select_${i.user.id}` && x.user.id === i.user.id, time: 60000 });
                    const messageId = m.values[0];

                    await m.deferUpdate();

                    client.giveawayManager.end(messageId)
                        .then(async () => {
                            await iMessage.edit(resultPanel(`${toji_onay} **Çekiliş başarıyla sonlandırıldı.**`));
                            setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                        })
                        .catch(async error => {
                            await iMessage.edit(resultPanel(`**Bir hata oluştu:** ${error}`));
                            setTimeout(() => iMessage.edit(mainPanel()).catch(() => { }), 3000);
                        });
                } catch (err) {
                    return iMessage.edit(mainPanel()).catch(() => { });
                }
            }
        });
    }
}

module.exports = CekilisService;
