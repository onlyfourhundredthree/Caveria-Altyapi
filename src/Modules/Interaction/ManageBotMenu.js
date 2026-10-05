const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (interaction) => {
    const cid = interaction.customId || "";
    if (!["botupdateavatar", "botupdatename", "botupdatebanner", "botrestart"].includes(cid)) return;

    const emojis = ConfigManager.get("Emojis") || {};
    const toji_onay = emojis.toji_onay || "✨";
    const toji_iptal = emojis.toji_iptal || "❌";
    const botclient = interaction.client;
    const log = botclient.channels.cache.find((x) => x.name === "bot_log");

    const getUrlFromMsg = (msg) => {
        if (!msg) return null;
        const attachment = msg.attachments?.first();
        if (attachment?.url) return attachment.url;
        if (msg.content && msg.content.startsWith("http")) return msg.content;
        return null;
    };

    const askOneMessage = async (interaction, questionText) => {
        await interaction.deferUpdate().catch(() => {});

        await interaction.message.edit({
            flags: [MessageFlags.IsComponentsV2],
            components: [
                {
                    type: 17,
                    components: [
                        { type: 10, content: questionText }
                    ]
                }
            ]
        }).catch(() => {});

        const msgFilter = (m) => m.author.id === interaction.user.id;
        const coll = interaction.channel.createMessageCollector({ filter: msgFilter, time: 60_000, max: 1 });

        return new Promise((resolve) => {
            coll.on("collect", (m) => resolve(m));
            coll.on("end", (c) => {
                if (!c.size) resolve(null);
            });
        });
    };

    const sendFeedback = async (msgText) => {
        return interaction.channel.send({
            flags: [MessageFlags.IsComponentsV2],
            components: [
                {
                    type: 17,
                    components: [
                        { type: 10, content: msgText }
                    ]
                }
            ]
        });
    };

    const sendLog = (logText) => {
        if (log) {
            log.send({
                flags: [MessageFlags.IsComponentsV2],
                components: [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: logText }
                        ]
                    }
                ]
            }).catch(() => {});
        }
    };

    try {
        if (cid === "botupdateavatar") {
            const msg = await askOneMessage(
                interaction,
                `### ${toji_onay} Avatar Güncelleme\n${botclient.user} isimli botun **yeni profil resmini** gönder (dosya yükle veya link at).\n> *\`60 saniye\` içinde yanıt vermezsen işlem iptal olur. İptal etmek için: \`iptal\` yazabilirsin.*`
            );

            if (!msg || ["iptal", "i"].includes((msg.content || "").toLowerCase())) {
                if (msg) msg.delete().catch(() => {});
                const reply = await sendFeedback(`${toji_onay} **İşlem iptal edildi.**`);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }

            const avatar = getUrlFromMsg(msg);
            if (!avatar) {
                msg.delete().catch(() => {});
                const reply = await sendFeedback(`${toji_iptal} **Link veya dosya bulamadım. İşlem iptal edildi.**`);
                setTimeout(() => reply.delete().catch(() => {}), 7000);
                return;
            }

            const bekle = await sendFeedback(`⏳ **Avatar güncelleniyor, lütfen bekleyin...**`);
            
            try {
                await botclient.user.setAvatar(avatar);
                await bekle.delete().catch(() => { });
                msg.delete().catch(() => {});
                await sendFeedback(`### ${toji_onay} Başarılı\nAvatar başarıyla güncellendi.`);
                sendLog(`### 🖼️ Avatar Değiştirildi\n> **Bot:** ${botclient.user}\n> **Yetkili:** ${interaction.member}\n> **Tarih:** <t:${Math.floor(Date.now() / 1000)}:R>`);
            } catch (err) {
                await bekle.delete().catch(() => { });
                await sendFeedback(`${toji_iptal} **Hata oluştu:** \`${err.message}\``);
            }
        }

        if (cid === "botupdatename") {
            const msg = await askOneMessage(
                interaction,
                `### ${toji_onay} İsim Güncelleme\n${botclient.user} isimli botun **yeni ismini** yaz.\n> *\`60 saniye\` içinde yanıt vermezsen işlem iptal olur. İptal etmek için: \`iptal\` yazabilirsin.*`
            );

            if (!msg || ["iptal", "i"].includes((msg.content || "").toLowerCase())) {
                if (msg) msg.delete().catch(() => {});
                const reply = await sendFeedback(`${toji_onay} **İşlem iptal edildi.**`);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }

            const isim = (msg.content || "").trim();
            if (!isim) {
                msg.delete().catch(() => {});
                const reply = await sendFeedback(`${toji_iptal} **İsim boş olamaz. İşlem iptal edildi.**`);
                setTimeout(() => reply.delete().catch(() => {}), 7000);
                return;
            }

            const eski = botclient.user.username;
            const bekle = await sendFeedback(`⏳ **İsim güncelleniyor, lütfen bekleyin...**`);

            try {
                await botclient.user.setUsername(isim);
                await bekle.delete().catch(() => { });
                msg.delete().catch(() => {});
                await sendFeedback(`### ${toji_onay} Başarılı\nİsim başarıyla güncellendi.\n> **Eski:** \`${eski}\`\n> **Yeni:** \`${botclient.user.username}\``);
                sendLog(`### 📝 İsim Değiştirildi\n> **Bot:** ${botclient.user}\n> **Yetkili:** ${interaction.member}\n> **Tarih:** <t:${Math.floor(Date.now() / 1000)}:R>`);
            } catch (err) {
                await bekle.delete().catch(() => { });
                await sendFeedback(`${toji_iptal} **Hata oluştu:** \`${err.message}\``);
            }
        }

        if (cid === "botupdatebanner") {
            const msg = await askOneMessage(
                interaction,
                `### ${toji_onay} Banner Güncelleme\n${botclient.user} isimli botun **yeni bannerını** gönder (dosya yükle veya link at).\n> *\`60 saniye\` içinde yanıt vermezsen işlem iptal olur. İptal etmek için: \`iptal\` yazabilirsin.*`
            );

            if (!msg || ["iptal", "i"].includes((msg.content || "").toLowerCase())) {
                if (msg) msg.delete().catch(() => {});
                const reply = await sendFeedback(`${toji_onay} **İşlem iptal edildi.**`);
                setTimeout(() => reply.delete().catch(() => {}), 5000);
                return;
            }

            const banner = getUrlFromMsg(msg);
            if (!banner) {
                msg.delete().catch(() => {});
                const reply = await sendFeedback(`${toji_iptal} **Link veya dosya bulamadım. İşlem iptal edildi.**`);
                setTimeout(() => reply.delete().catch(() => {}), 7000);
                return;
            }

            const bekle = await sendFeedback(`⏳ **Banner güncelleniyor, lütfen bekleyin...**`);

            try {
                await botclient.user.setBanner(banner);
                await bekle.delete().catch(() => { });
                msg.delete().catch(() => {});
                await sendFeedback(`### ${toji_onay} Başarılı\nBanner başarıyla güncellendi.`);
                sendLog(`### 🏷️ Banner Değiştirildi\n> **Bot:** ${botclient.user}\n> **Yetkili:** ${interaction.member}\n> **Tarih:** <t:${Math.floor(Date.now() / 1000)}:R>`);
            } catch (err) {
                await bekle.delete().catch(() => { });
                await sendFeedback(`${toji_iptal} **Hata oluştu:** \`${err.message}\``);
            }
        }

        if (cid === "botrestart") {
            await interaction.deferUpdate().catch(() => {});
            await interaction.message.delete().catch(() => { });
            await sendFeedback(`${toji_onay} **Bot yeniden başlatılıyor...**`);
            setTimeout(() => process.exit(0), 1000);
        }
    } catch (e) {
        await sendFeedback(`${toji_iptal} İşlem başarısız: \`${e?.message || "Bilinmeyen hata"}\``);
    }
};
