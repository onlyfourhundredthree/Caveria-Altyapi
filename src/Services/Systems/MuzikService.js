const { MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const MusicManager = require("../../Core/Handlers/MusicManager");
const Playlist = require("../../Core/Database/Playlist");

const RADIOS = [
    { name: 'Alem Fm', value: 'http://turkmedya.radyotvonline.com/turkmedya/alemfm.stream/playlist.m3u8' },
    { name: 'Baba Radyo', value: 'http://37.247.98.7:80/;stream.mp3' },
    { name: 'Kral Fm', value: 'http://46.20.3.204:80/' },
    { name: 'Kral Pop', value: 'http://46.20.3.201:80/' },
    { name: 'Pal Nostalji', value: 'http://shoutcast.radyogrup.com:1010/;' },
    { name: 'Pal Station', value: 'http://shoutcast.radyogrup.com:1020/;' },
    { name: 'Power Pop', value: 'https://listen.powerapp.com.tr/powerpop/abr/playlist.m3u8' },
    { name: 'Power Türk', value: 'http://icast.powergroup.com.tr/PowerTurk/mpeg/128/home' },
    { name: 'Radyo 45\'lik', value: 'http://stream.radyo45lik.com:4545/stream' },
    { name: 'Radyo Dejavu', value: 'https://radyodejavu.80.yayin.com.tr' },
    { name: 'Radyo Odtu', value: 'http://stream.radyoodtu.com.tr/rock;' },
    { name: 'Radyo Pause', value: 'http://radyopause.ozelip.com.tr:8040/' },
    { name: 'Radyo Trafik', value: 'http://46.20.3.201:80/' },
    { name: 'Radyo Trio', value: 'http://radyotrio.radyotvonline.net/radyotrio' },
    { name: 'Radyo Viva', value: 'http://46.20.3.230/;' }
];

class MuzikService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        
        const emojis = ConfigManager.get("Emojis") || {};

        if (!ConfigManager.isOwner(member)) {
            const errObj = { content: `${emojis.toji_iptal || "❌"} Bu menüyü sadece bot sahipleri kullanabilir.`, flags: [MessageFlags.Ephemeral] };
            return context.reply(errObj).catch(() => {});
        }

        const generatePanel = async (guildId) => {
            const playlists = await Playlist.find({ guildID: guildId }).lean();
            
            const radioOptions = RADIOS.map(r => ({ label: r.name, value: r.name, description: `${r.name} canlı yayını dinle` }));
            
            const radioSelect = new StringSelectMenuBuilder()
                .setCustomId("muzik_radio_select")
                .setPlaceholder("📻 Radyo İstasyonu Seçin...")
                .addOptions(radioOptions);

            let playlistSelect = null;
            if (playlists.length > 0) {
                const pOptions = playlists.slice(0, 24).map(p => ({
                    label: p.name,
                    value: p._id.toString(),
                    description: p.url.substring(0, 50)
                }));
                
                // Karışık seçeneği ekle
                pOptions.push({ label: '🎲 Rastgele Bir Playlist Çal', value: 'random', description: 'Kayıtlı listelerden rastgele seçer' });

                playlistSelect = new StringSelectMenuBuilder()
                    .setCustomId("muzik_playlist_select")
                    .setPlaceholder("🎶 Kayıtlı Playlist Seçin...")
                    .addOptions(pOptions);
            }

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("muzik_pl_add").setLabel("Playlist Ekle").setStyle(ButtonStyle.Success).setEmoji("➕"),
                new ButtonBuilder().setCustomId("muzik_pl_remove").setLabel("Playlist Sil").setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
                new ButtonBuilder().setCustomId("muzik_skip").setLabel("Şarkıyı Geç").setStyle(ButtonStyle.Secondary).setEmoji("⏭️"),
                new ButtonBuilder().setCustomId("muzik_volume").setLabel("Ses Ayarla").setStyle(ButtonStyle.Secondary).setEmoji("🔊"),
                new ButtonBuilder().setCustomId("muzik_stop").setLabel("Sistemi Durdur").setStyle(ButtonStyle.Danger).setEmoji("⏹️")
            );

            const panel = new V2PanelBuilder()
                .addText(`> ## ${emojis.toji_sparkly || "🎵"} Gelişmiş Müzik Yönetim Paneli\n> -# Sunucunun 7/24 radyo yayınlarını veya özel playlistlerini buradan yönetebilirsiniz. Aşağıdaki menülerden çalmak istediğiniz kaynağı seçin.\n> \n> **Kayıtlı Playlist Sayısı:** \`${playlists.length}\``)
                .addDivider(1)
                .addActionRow(new ActionRowBuilder().addComponents(radioSelect));
            
            if (playlistSelect) {
                panel.addActionRow(new ActionRowBuilder().addComponents(playlistSelect));
            }
            
            panel.addActionRow(buttons);

            return panel.toJSON();
        };

        const generateRemovePanel = async (guildId) => {
            const playlists = await Playlist.find({ guildID: guildId }).lean();
            if (playlists.length === 0) return null;

            const options = playlists.slice(0, 25).map(p => ({
                label: p.name,
                value: p._id.toString(),
                description: "Silmek için seçin"
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("muzik_do_remove")
                .setPlaceholder("Silinecek playlisti seçin...")
                .addOptions(options);

            const panel = new V2PanelBuilder()
                .addText(`### 🗑️ Playlist Silme\n-# Lütfen silmek istediğiniz playlisti aşağıdan seçin.`)
                .addActionRow(new ActionRowBuilder().addComponents(selectMenu))
                .addActionRow(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("muzik_back").setLabel("Geri Dön").setStyle(ButtonStyle.Secondary)));

            return panel.toJSON();
        };

        const replyPayload = {
            components: await generatePanel(context.guild.id),
            flags: [MessageFlags.IsComponentsV2]
        };

        let msg;
        if (isInteraction) {
            replyPayload.fetchReply = true;
            msg = await context.reply(replyPayload);
        } else {
            msg = await context.reply(replyPayload);
        }

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author.id,
            time: 600000 // 10 dakika
        });

        collector.on("collect", async (i) => {
            // Sese Bağlılık Kontrolü Gerektiren İşlemler
            // Yönetim paneli olduğu için aynı seste olma zorunluluğunu kaldırıyoruz. 
            // Öncelik botun halihazırda bağlı olduğu kanaldır, yoksa üyenin kanalını baz alırız.
            let memberVoiceChannel = i.guild.members.me.voice.channel || i.member.voice.channel;
            
            const needsVoice = ["muzik_radio_select", "muzik_playlist_select", "muzik_skip", "muzik_volume", "muzik_stop"];
            
            if (needsVoice.includes(i.customId)) {
                if (!memberVoiceChannel) {
                    return i.reply({ content: `${emojis.toji_iptal || "❌"} Ne siz ne de bot bir ses kanalında değil! Lütfen önce bir sese katılın.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            if (i.customId === "muzik_back") {
                return i.update({ components: await generatePanel(i.guild.id), flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "muzik_stop") {
                await MusicManager.stop(i.guild.id);
                return i.reply({ content: `${emojis.toji_onay || "✅"} Ses kanalından çıkıldı ve müzik sistemi kapatıldı.`, flags: [MessageFlags.Ephemeral] });
            }

            if (i.customId === "muzik_skip") {
                const skipped = MusicManager.skip(i.guild.id);
                if (skipped) {
                    return i.reply({ content: `⏭️ Sıradaki şarkıya geçiliyor...`, flags: [MessageFlags.Ephemeral] });
                } else {
                    return i.reply({ content: `${emojis.toji_iptal || "❌"} Şu an çalan veya sırada bir şarkı yok.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            if (i.customId === "muzik_volume") {
                const modal = new ModalBuilder().setCustomId('muzik_vol_modal').setTitle('Ses Seviyesini Ayarla');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vol_level').setLabel("Seviye (0-100)").setPlaceholder("Örn: 50").setStyle(TextInputStyle.Short).setRequired(true))
                );
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ filter: (mi) => mi.customId === 'muzik_vol_modal' && mi.user.id === author.id, time: 60000 }).catch(() => null);
                if (submitted) {
                    const volStr = submitted.fields.getTextInputValue('vol_level');
                    const vol = parseInt(volStr);
                    if (isNaN(vol) || vol < 0 || vol > 100) {
                        return submitted.reply({ content: "Geçersiz bir ses seviyesi girdiniz. 0-100 arası olmalıdır.", flags: [MessageFlags.Ephemeral] });
                    }

                    const success = MusicManager.setVolume(i.guild.id, vol);
                    if (success) {
                        return submitted.reply({ content: `🔊 Ses seviyesi **%${vol}** olarak ayarlandı.`, flags: [MessageFlags.Ephemeral] });
                    } else {
                        return submitted.reply({ content: `${emojis.toji_iptal || "❌"} Şu anda aktif bir müzik sistemi yok.`, flags: [MessageFlags.Ephemeral] });
                    }
                }
            }

            if (i.customId === "muzik_pl_add") {
                const modal = new ModalBuilder().setCustomId('muzik_pl_add_modal').setTitle('Yeni Playlist Ekle');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pl_name').setLabel("Playlist Adı").setPlaceholder("Örn: Pop Müzik").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pl_url').setLabel("Spotify / YouTube Linki").setPlaceholder("https://open.spotify.com/...").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ filter: (mi) => mi.customId === 'muzik_pl_add_modal' && mi.user.id === author.id, time: 60000 }).catch(() => null);
                if (submitted) {
                    const name = submitted.fields.getTextInputValue('pl_name');
                    const url = submitted.fields.getTextInputValue('pl_url');

                    if (!url.startsWith("http")) {
                        return submitted.reply({ content: "Lütfen geçerli bir URL girin.", flags: [MessageFlags.Ephemeral] });
                    }

                    await Playlist.create({
                        guildID: i.guild.id,
                        name: name,
                        url: url,
                        addedBy: author.id
                    });

                    await submitted.reply({ content: `> ${emojis.toji_onay || "✅"} **${name}** adlı playlist başarıyla eklendi!`, flags: [MessageFlags.Ephemeral] });
                    if (msg.editable) await msg.edit({ components: await generatePanel(i.guild.id), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                }
            }

            if (i.customId === "muzik_pl_remove") {
                const rmPanel = await generateRemovePanel(i.guild.id);
                if (!rmPanel) return i.reply({ content: "Silinecek kayıtlı bir playlist bulunamadı.", flags: [MessageFlags.Ephemeral] });
                return i.update({ components: rmPanel, flags: [MessageFlags.IsComponentsV2] });
            }

            if (i.customId === "muzik_do_remove") {
                const plId = i.values[0];
                await Playlist.findByIdAndDelete(plId);
                await i.update({ components: await generatePanel(i.guild.id), flags: [MessageFlags.IsComponentsV2] });
                return;
            }

            if (i.customId === "muzik_radio_select") {
                const stationName = i.values[0];
                const station = RADIOS.find(r => r.name === stationName);
                if (!station) return i.reply({ content: "İstasyon bulunamadı.", flags: [MessageFlags.Ephemeral] });
                
                await i.deferReply({ flags: [MessageFlags.Ephemeral] });
                const success = await MusicManager.playRadio(memberVoiceChannel, station.value, station.name);
                
                if (success) {
                    return i.editReply({ content: `📻 **${station.name}** radyosuna bağlanıldı.` });
                } else {
                    return i.editReply({ content: `${emojis.toji_iptal || "❌"} İstasyon bağlantısında bir sorun oluştu.` });
                }
            }

            if (i.customId === "muzik_playlist_select") {
                const plId = i.values[0];
                await i.deferReply({ flags: [MessageFlags.Ephemeral] });
                
                let targetUrl = "";
                let targetName = "";
                if (plId === "random") {
                    const playlists = await Playlist.find({ guildID: i.guild.id }).lean();
                    if (playlists.length === 0) return i.editReply({ content: "Kayıtlı playlist yok." });
                    const rnd = playlists[Math.floor(Math.random() * playlists.length)];
                    targetUrl = rnd.url;
                    targetName = rnd.name;
                } else {
                    const pl = await Playlist.findById(plId).lean();
                    if (!pl) return i.editReply({ content: "Playlist bulunamadı." });
                    targetUrl = pl.url;
                    targetName = pl.name;
                }

                // addPlaylists komutu url üzerinden trackleri bulacak ve listeye alacak.
                // Biz channel'ı message channel olarak göndermemiz lazım (mesaj atsın diye).
                // Normalde MuzikManager sese bağlanır. 
                const addedCount = await MusicManager.addPlaylists(memberVoiceChannel, [targetUrl], i.channel);

                if (addedCount > 0) {
                    return i.editReply({ content: `🎶 **${targetName}** (Toplam ${addedCount} şarkı) başarıyla sese eklendi.` });
                } else {
                    return i.editReply({ content: `${emojis.toji_iptal || "❌"} Playlist yüklenemedi. (Gizli liste veya ağ engeli olabilir)` });
                }
            }
        });

        collector.on("end", () => {
            if (msg.editable) msg.edit({ components: [] }).catch(() => {});
        });
    }
}

module.exports = MuzikService;
