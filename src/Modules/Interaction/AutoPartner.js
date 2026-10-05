const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StatHistory = require("../../Core/Database/StatHistory");
const GuildPartner = require("../../Core/Database/GuildPartners");
const PartnerSettings = require("../../Core/Database/PartnerSettings");
const moment = require("moment-timezone");
const axios = require("axios");

if (!global.partnerProcessing) global.partnerProcessing = new Map();

function buildPartnerLogComponents(state, data) {
    const { guildName, targetGuildId, inviteCode, applicantId, guildIcon, moderator, reason, handlerId } = data;

    const isRequest = state === "request";
    const isHandling = state === "handling";
    const isApproved = state === "approved";
    const isRejected = state === "rejected";

    const title = isRequest ? "Partner Başvurusu" : isHandling ? "Partnerlik İnceleniyor" : isApproved ? "Partner Onaylandı" : "Partner Reddedildi";
    const subtitle = isRequest
        ? "Aşağıdaki başvuruyu incelemek için **İlgilen** butonuna tıklayın."
        : isHandling
        ? "Başvuruyu onaylamak veya reddetmek için aşağıdaki butonları kullanın."
        : isApproved
        ? "Bu partnerlik işlemi başarıyla onaylandı ve metin paylaşıldı."
        : "Bu partnerlik başvurusu reddedildi.";

    const accentColor = isApproved ? 0x57F287 : isRejected ? 0xED4245 : null;
    const emojis = ConfigManager.get("Emojis") || {};

    let infoText = `> **Sunucu:** \`${guildName || "Bilinmiyor"}\`\n` +
        `> **Sunucu ID:** \`${targetGuildId}\`\n` +
        `> **Davet Linki:** ${inviteCode ? `https://discord.gg/${inviteCode}` : "Bilinmiyor"}\n` +
        `> **Başvuran:** ${applicantId ? `<@${applicantId}> (\`${applicantId}\`)` : "Bilinmiyor"}`;

    if (isHandling && handlerId) {
        infoText += `\n> **İlgilenen Yetkili:** <@${handlerId}> (\`${handlerId}\`)`;
    }
    if (isApproved && moderator) {
        infoText += `\n> **Onaylayan Yetkili:** <@${moderator.id}> (\`${moderator.id}\`)`;
    }
    if (isRejected && moderator) {
        infoText += `\n> **Reddeden Yetkili:** <@${moderator.id}>`;
    }
    if (isRejected && reason) {
        infoText += `\n> **Sebep:** ${reason}`;
    }

    const components = [
        {
            type: 9,
            accessory: {
                type: 11,
                media: { url: guildIcon || "https://i.hizliresim.com/3kvn97k.jpg" }
            },
            components: [
                {
                    type: 10,
                    content: `## ${title}\n${subtitle}`
                }
            ]
        },
        { type: 14, divider: true, spacing: 1 },
        {
            type: 10,
            content: infoText
        }
    ];

    if (isRequest) {
        components.push({ type: 14, divider: true, spacing: 1 });
        components.push({
            type: 1,
            components: [
                { type: 2, style: 1, label: "İlgilen", custom_id: `manual_partner_handle_${targetGuildId}`, emoji: { name: "🔍" } },
                { type: 2, style: 5, label: "Sunucuya Git", url: `https://discord.gg/${inviteCode}` }
            ]
        });
    } else if (isHandling) {
        components.push({ type: 14, divider: true, spacing: 1 });
        components.push({
            type: 1,
            components: [
                { type: 2, style: 3, label: "Onayla", custom_id: `manual_partner_approve_${targetGuildId}_${handlerId}`, emoji: { name: "✅" } },
                { type: 2, style: 4, label: "Reddet", custom_id: `manual_partner_reject_${targetGuildId}_${handlerId}`, emoji: { name: "❌" } },
                { type: 2, style: 2, label: "Önizle", custom_id: `manual_partner_preview_${targetGuildId}_${handlerId}`, emoji: { name: "👁️" } },
                { type: 2, style: 5, label: "Sunucuya Git", url: `https://discord.gg/${inviteCode}` }
            ]
        });
    }

    const container = {
        type: 17,
        components
    };

    if (accentColor !== null) container.accent_color = accentColor;

    return [container];
}

module.exports = async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.guild) return;

    if (interaction.customId === "auto_partner" || interaction.customId === "auto_partner_tr" || interaction.customId === "auto_partner_en") {
        const lang = interaction.customId.endsWith("_en") ? "en" : "tr";
        const title = lang === "en" ? "Global / English Partner" : "Otomatik Partner (TR)";

        const modal = new ModalBuilder()
            .setCustomId(`auto_partner_modal_${lang}`)
            .setTitle(title);

        const textInput = new TextInputBuilder()
            .setCustomId("partner_text")
            .setLabel(lang === "en" ? "Partner Advertisement Text" : "Partner Metni")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(lang === "en" ? "Paste your server's advertisement text here. (Must contain invite link)" : "Kendi sunucunuzun partner metnini buraya yapıştırın. (Davet linki içermelidir)")
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith("auto_partner_modal")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const targetLang = interaction.customId.endsWith("_en") ? "en" : "tr";

        const text = interaction.fields.getTextInputValue("partner_text");
        const inviteRegex = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/([a-zA-Z0-9-]+)/;
        const match = text.match(inviteRegex);

        if (!match) {
            return interaction.editReply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Girdiğiniz metinde geçerli bir Discord davet linki (https://discord.gg/...) bulunamadı. Lütfen kontrol edip tekrar deneyin.");
        }

        const inviteCode = match[1];
        let invite;
        try {
            invite = await interaction.client.fetchInvite(inviteCode);
        } catch {
            return interaction.editReply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Davet linki geçersiz veya süresi dolmuş. Lütfen kalıcı ve geçerli bir link kullanın.");
        }

        if (!invite || !invite.guild) {
            return interaction.editReply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Girilen link bir sunucuya ait değil veya bot bu linke erişemiyor.");
        }

        const targetGuildId = invite.guild.id;

        if (targetGuildId === interaction.guild.id) {
            return interaction.editReply("**Hata:** Bu sunucunun kendi davet linkini giremezsiniz.");
        }

        const bannedCheck = await GuildPartner.findOne({ guildID: targetGuildId, banned: true });
        if (bannedCheck) {
            return interaction.editReply(`**Erişim Engeli:** **${invite.guild.name}** sunucusu partnerlik sisteminden yasaklanmıştır.`);
        }

        const partnerManagerRole = ConfigManager.get("Roles.Responsibilities.PartnerManager");
        const isPartnerManager = Array.isArray(partnerManagerRole) 
            ? partnerManagerRole.some(r => interaction.member.roles.cache.has(r))
            : interaction.member.roles.cache.has(partnerManagerRole);

        if (!ConfigManager.isOwner(interaction.member) && !isPartnerManager) {
            const COOLDOWN = 3 * 60 * 60 * 1000;
            const lastPartner = await GuildPartner.findOne({ guildID: targetGuildId }).sort({ lastPartnerAt: -1 });
            if (lastPartner && lastPartner.lastPartnerAt) {
                const timeDiff = Date.now() - lastPartner.lastPartnerAt.getTime();
                if (timeDiff < COOLDOWN) {
                    const remaining = COOLDOWN - timeDiff;
                    const hours = Math.floor(remaining / (1000 * 60 * 60));
                    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    return interaction.editReply(`**Bekleme Süresi:** **${invite.guild.name}** sunucusu ile partnerlik yapmak için **${hours} saat ${minutes} dakika** beklemeniz gerekmektedir.`);
                }
            }
        }

        const logChannelId = targetLang === "en"
            ? ConfigManager.get("Channels.PartnerAppLogGlobal")
            : ConfigManager.get("Channels.PartnerAppLogTR");
        const logChannel = interaction.client.channels.cache.get(logChannelId);
        if (logChannel) {
            const cleanText = text.replace(/@(everyone|here)/g, "").replace(/<@&[0-9]+>/g, "").trim();

            if (!cleanText || cleanText.length < 50) {
                return interaction.editReply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Hata:** Partner metniniz çok kısa! Partner sayılması için en az **50 karakterden** oluşması gerekmektedir.");
            }

            await GuildPartner.deleteMany({ guildID: targetGuildId });
            await GuildPartner.create({
                guildID: targetGuildId,
                guildName: invite.guild.name,
                avatar: invite.guild.iconURL(),
                pendingText: cleanText,
                userID: interaction.user.id,
                banned: false,
                inviteCode: inviteCode,
                lang: targetLang
            });

            const logComponents = buildPartnerLogComponents("request", {
                guildName: invite.guild.name,
                targetGuildId,
                inviteCode,
                applicantId: interaction.user.id,
                guildIcon: invite.guild.iconURL({ dynamic: true })
            });

            const attachment = new AttachmentBuilder(Buffer.from(cleanText, 'utf-8'), { name: 'partner-metni.txt' });

            const partnerRoles = ConfigManager.get("Roles.Responsibilities.Partner") || [];
            const partnerMentions = Array.isArray(partnerRoles) ? partnerRoles.map(r => `<@&${r}>`).join(" ") : `<@&${partnerRoles}>`;

            if (partnerMentions) {
                logComponents[0].components.unshift({ type: 10, content: partnerMentions });
            }

            await logChannel.send({
                flags: [MessageFlags.IsComponentsV2],
                components: logComponents,
                files: [attachment],
                allowedMentions: { roles: Array.isArray(partnerRoles) ? partnerRoles : [partnerRoles] }
            });

            return interaction.editReply({
                content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} **Başvuru Alındı!**\n\nBaşvurunuz yetkili ekibimize iletildi. En kısa sürede incelenip dönüş yapılacaktır.`,
                flags: [MessageFlags.Ephemeral]
            });
        } else {
            return interaction.editReply((ConfigManager.get("Emojis.toji_iptal") || "✨") + " **Sistem Hatası:** Log kanalı bulunamadı. Lütfen yetkililere bildirin.");
        }
    }


    if (interaction.customId.startsWith("manual_partner_handle_") && interaction.isButton()) {
        const targetGuildId = interaction.customId.split("_")[3];
        const partnerData = await GuildPartner.findOne({ guildID: targetGuildId });

        const logComponents = buildPartnerLogComponents("handling", {
            guildName: partnerData?.guildName || "Bilinmiyor",
            targetGuildId,
            inviteCode: partnerData?.inviteCode,
            applicantId: partnerData?.userID,
            guildIcon: partnerData?.avatar,
            handlerId: interaction.user.id
        });

        await interaction.update({ flags: [MessageFlags.IsComponentsV2], components: logComponents }).catch(() => { });
        return;
    }

    if (interaction.customId.startsWith("manual_partner_approve_") && interaction.isButton()) {
        const parts = interaction.customId.split("_");
        const targetGuildId = parts[3];
        const handlerId = parts[4];
        const messageId = interaction.message.id;

        if (handlerId && handlerId !== interaction.user.id) {
            return interaction.reply({ content: "Bu başvuruyla ilgilenen yetkili siz değilsiniz.", flags: [MessageFlags.Ephemeral] });
        }

        if (global.partnerProcessing.has(messageId)) {
            return interaction.reply({ content: "Bu işlem zaten bir başkası tarafından yapılıyor veya tamamlanmış.", flags: [MessageFlags.Ephemeral] });
        }

        global.partnerProcessing.set(messageId, true);

        await interaction.deferUpdate();
        await interaction.message.edit({ components: interaction.message.components.map(c => { c.components = c.components?.map(btn => btn?.data ? { ...btn.data, disabled: true } : btn); return c; }) }).catch(() => { });

        const partnerData = await GuildPartner.findOne({ guildID: targetGuildId });
        let cleanText = partnerData ? partnerData.pendingText : null;

        if (!cleanText) {
            const attachment = interaction.message.attachments.first();
            if (attachment && attachment.url) {
                try {
                    const response = await axios.get(attachment.url, { responseType: 'text' });
                    if (response.status === 200) cleanText = response.data;
                } catch (err) {
                    console.error("Backup fetch failed:", err);
                }
            }
        }

        if (!cleanText || typeof cleanText !== "string") {
            return interaction.followUp({ content: "?? İşlem zaten yapılmış veya metin bulunamadı.", ephemeral: true });
        }

        const gPartner = await GuildPartner.findOne({ guildID: targetGuildId }).sort({ _id: -1 });
        const ourPartnerChannelId = (gPartner && gPartner.lang === "en")
            ? ConfigManager.get("Channels.PartnerGlobal")
            : ConfigManager.get("Channels.PartnerTR");
        const ourChannel = interaction.guild.channels.cache.get(ourPartnerChannelId);

        if (ourChannel) {
            try {
                if (cleanText.length > 2000) {
                    const chunks = cleanText.match(/[\s\S]{1,2000}/g) || [];
                    for (const chunk of chunks) {
                        await ourChannel.send(chunk);
                    }
                } else {
                    await ourChannel.send(cleanText);
                }
            } catch (err) {
                console.error("AutoPartner: Partner mesajı gönderilemedi:", err.message);
            }

            try {
                const StatHistory = require("../../Core/Database/StatHistory");
                const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");
                const weekAgo = moment().tz("Europe/Istanbul").subtract(1, "weeks").format("YYYY-MM-DD");

                await StatHistory.findOneAndUpdate(
                    { guildID: interaction.guild.id, userID: interaction.user.id, date: today },
                    { $inc: { partner: 1 } },
                    { upsert: true, setDefaultsOnInsert: true }
                );

                const TaskManager = require("../../Core/Handlers/TaskManager");
                await TaskManager.progressTask(interaction.guild, interaction.member, "PARTNER");

                const statsAgg = await StatHistory.aggregate([
                    { $match: { guildID: interaction.guild.id, userID: interaction.user.id } },
                    { $group: { _id: "$userID", total: { $sum: "$partner" }, weekly: { $sum: { $cond: [{ $gte: ["$date", weekAgo] }, "$partner", 0] } } } }
                ]);
                const stats = statsAgg[0] || { total: 0, weekly: 0 };

                const rankAgg = await StatHistory.aggregate([
                    { $match: { guildID: interaction.guild.id, date: { $gte: weekAgo } } },
                    { $group: { _id: "$userID", weekly: { $sum: "$partner" } } },
                    { $sort: { weekly: -1 } }
                ]);
                const weeklyRank = rankAgg.findIndex(r => r._id === interaction.user.id) + 1 || "Kayıtsız";

                let pSettings = await PartnerSettings.findOne({ guildID: interaction.guild.id });
                if (!pSettings) pSettings = await PartnerSettings.create({ guildID: interaction.guild.id });
                if (pSettings.lastMessageId) {
                    const lastMsg = await ourChannel.messages.fetch(pSettings.lastMessageId).catch(() => null);
                    if (lastMsg) await lastMsg.delete().catch(() => { });
                }

                const isGlobal = ourPartnerChannelId === ConfigManager.get("Channels.PartnerGlobal");

                const defaultTRMsg = "⠀⠀⠀⠀⠀⠀⠀⠀⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n⋆. 𐙚 ̊ Partnerlik yaptığın için teşekkür ederiz ₊˚⊹ ᰔ\n✮⋆˙ Toplam partner sayın: **{topStat}**  \n✮⋆˙ Haftalık partner sayın: **{weeklyStat}**  \n✮⋆˙ Bu haftaki sıralaman: **#{weeklyRank}**";
                const defaultENMsg = "⠀⠀⠀⠀⠀⠀⠀⠀⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n⋆. 𐙚 ̊ Thank you for partnering with us! ₊˚⊹ ᰔ\n✮⋆˙ Your total partners: **{topStat}**  \n✮⋆˙ Your weekly partners: **{weeklyStat}**  \n✮⋆˙ Your rank this week: **#{weeklyRank}**";

                const rawMessage = isGlobal
                    ? (ConfigManager.get("Partner.MessageGlobal") || defaultENMsg)
                    : (ConfigManager.get("Partner.Message") || defaultTRMsg);

                const partnerMessageRef = rawMessage
                    .replace("{topStat}", stats.total)
                    .replace("{weeklyStat}", stats.weekly)
                    .replace("{weeklyRank}", weeklyRank);

                const partnerEmoji = ConfigManager.get("Emojis.toji_partner") || "🤝";
                const guildIcon = partnerData?.avatar;
                const headerContent = isGlobal
                    ? `### ${interaction.member.displayName}, thank you for your partnership!\n-# ${partnerEmoji} Your partner stats have been updated.`
                    : `### ${interaction.member.displayName}, partnerlik için teşekkürler!\n-# ${partnerEmoji} Partnerlik istatistiklerin güncellendi.`;

                const statsV2 = [{
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: guildIcon ? { type: 11, media: { url: guildIcon } } : undefined,
                            components: [
                                { type: 10, content: headerContent }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        { type: 10, content: partnerMessageRef }
                    ]
                }];

                const sentMsg = await ourChannel.send({ components: statsV2, flags: [MessageFlags.IsComponentsV2] });
                pSettings.lastMessageId = sentMsg.id;
                await pSettings.save();

            } catch (err) {
                console.error("AutoPartner Stat Update Error:", err);
            }
        }

        let applicantId = partnerData ? partnerData.userID : null;

        if (applicantId) {
            try {
                const applicant = await interaction.client.users.fetch(applicantId).catch(() => null);
                if (applicant) {
                    await applicant.send({ content: `**Partnerlik Başvurunuz Onaylandı!**\n\nSunucunuzda paylaşmanız gereken metnimiz:` }).catch(() => { });
                    let adText = ConfigManager.get("Partner.AdvertisementText");
                    if (adText) await applicant.send({ content: adText }).catch(() => { });
                }
            } catch (dmErr) { }
        }

        await GuildPartner.findOneAndUpdate({ guildID: targetGuildId }, { $set: { lastPartnerAt: new Date(), pendingText: null } }).catch(() => { });

        const finalLogComponents = buildPartnerLogComponents("approved", {
            guildName: partnerData?.guildName,
            targetGuildId,
            inviteCode: partnerData?.inviteCode,
            applicantId: applicantId,
            guildIcon: partnerData?.avatar,
            moderator: interaction.user
        });

        await interaction.editReply({ flags: [MessageFlags.IsComponentsV2], components: finalLogComponents });

        global.partnerProcessing.delete(messageId);
    }

    if (interaction.customId.startsWith("manual_partner_preview_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const targetGuildId = interaction.customId.split("_")[3];
        const partnerData = await GuildPartner.findOne({ guildID: targetGuildId });
        const text = (partnerData && partnerData.pendingText) ? partnerData.pendingText : (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Metin bulunamadı.";
        await interaction.editReply({ content: text, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId.startsWith("manual_partner_reject_") && interaction.isButton()) {
        const parts = interaction.customId.split("_");
        const targetGuildId = parts[3];
        const handlerId = parts[4];
        const messageId = interaction.message.id;

        if (handlerId && handlerId !== interaction.user.id) {
            return interaction.reply({ content: "Bu başvuruyla ilgilenen yetkili siz değilsiniz.", flags: [MessageFlags.Ephemeral] });
        }

        if (global.partnerProcessing.has(messageId)) {
            return interaction.reply({ content: "Bu işlem zaten bir başkası tarafından yapılıyor veya tamamlanmış.", flags: [MessageFlags.Ephemeral] });
        }

        const reasonInput = new TextInputBuilder()
            .setCustomId("reject_reason")
            .setLabel("Reddetme Sebebi")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Neden reddedildi?")
            .setRequired(true);

        const modal = new ModalBuilder()
            .setCustomId(`manual_partner_reject_modal_${targetGuildId}`)
            .setTitle("Partner Reddini Onayla");

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    if (interaction.customId.startsWith("manual_partner_reject_modal_")) {
        await interaction.deferUpdate();
        const targetGuildId = interaction.customId.split("_")[4];
        const reason = interaction.fields.getTextInputValue("reject_reason");

        const partnerData = await GuildPartner.findOne({ guildID: targetGuildId });
        await GuildPartner.findOneAndUpdate({ guildID: targetGuildId }, { $set: { pendingText: null } }).catch(() => { });

        let applicantId = partnerData ? partnerData.userID : null;
        if (applicantId) {
            const applicant = await interaction.client.users.fetch(applicantId).catch(() => null);
            if (applicant) {
                await applicant.send({
                    content: `**Partnerlik Başvurunuz Reddedildi!**\n\n**Sunucu:** ${partnerData?.guildName || "Bilinmiyor"}\n**Sebep:** ${reason}`
                }).catch(() => { });
            }
        }

        const finalLogComponents = buildPartnerLogComponents("rejected", {
            guildName: partnerData?.guildName,
            targetGuildId,
            inviteCode: partnerData?.inviteCode,
            applicantId: applicantId,
            guildIcon: partnerData?.avatar,
            moderator: interaction.user,
            reason
        });

        await interaction.editReply({ flags: [MessageFlags.IsComponentsV2], components: finalLogComponents });

        global.partnerProcessing.delete(interaction.message.id);
    }
};
