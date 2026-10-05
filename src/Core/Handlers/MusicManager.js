const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');
const fetch = require('node-fetch');
const axios = require('axios');

class MusicManager {
    constructor() {
        // Sunucu (guild) bazlı kuyruk yöneticisi
        this.queues = new Map();

        // Otomatik Playlist Havuzu (Kuyruk bittiğinde kesintisiz devam etmesi için)
        this.autoPlaylists = [
            "https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM", // Hot Hits Türkiye
            "https://open.spotify.com/playlist/37i9dQZF1DX0b1hnsxOOhx", // Türkçe Pop
            "https://open.spotify.com/playlist/37i9dQZF1DWZq1vNdtE3pY", // Türkçe Rap
            "https://open.spotify.com/playlist/37i9dQZF1DXa512N9R7kYx", // Türkçe Rock
            "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"  // Today's Top Hits
        ];
    }

    async getYoutubePlaylistTracks(url) {
        const settings = require('../../../Settings.json');
        if (!settings.YOUTUBE_API_KEY) return [];
        
        try {
            const listMatch = url.match(/[?&]list=([^&]+)/);
            if (!listMatch) return [];
            const playlistId = listMatch[1];
            
            let tracks = [];
            let nextPageToken = "";
            
            for (let i = 0; i < 2; i++) {
                let api = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${settings.YOUTUBE_API_KEY}`;
                if (nextPageToken) api += `&pageToken=${nextPageToken}`;
                
                const res = await require('axios').get(api);
                if (res.data && res.data.items) {
                    for (const item of res.data.items) {
                        const snip = item.snippet;
                        if (snip.title !== 'Private video' && snip.title !== 'Deleted video') {
                            tracks.push({
                                title: snip.title,
                                artist: snip.videoOwnerChannelTitle || 'YouTube',
                                searchQuery: snip.title,
                                url: `https://www.youtube.com/watch?v=${snip.resourceId.videoId}`,
                                type: 'youtube'
                            });
                        }
                    }
                }
                nextPageToken = res.data.nextPageToken;
                if (!nextPageToken) break;
            }
            return tracks;
        } catch(err) {
            console.error('[MusicManager] YT Playlist API Error:', err.message);
            return [];
        }
    }

    async searchYoutubeWithApi(query) {
        const settings = require('../../../Settings.json');
        if (!settings.YOUTUBE_API_KEY) return null;

        try {
            const api = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${settings.YOUTUBE_API_KEY}`;
            const res = await require('axios').get(api);
            if (res.data && res.data.items && res.data.items.length > 0) {
                return `https://www.youtube.com/watch?v=${res.data.items[0].id.videoId}`;
            }
            return null;
        } catch(err) {
            console.error('[MusicManager] YT Search API Error:', err.message);
            return null;
        }
    }

    /**
     * @param {string} guildId
     * @returns {Object} queue objesi
     */
    getQueue(guildId) {
        if (!this.queues.has(guildId)) {
            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                },
            });

            const queue = {
                player,
                connection: null,
                channel: null,
                songs: [],
                playedSongs: new Set(),
                mode: null, // 'radio' veya 'playlist'
                currentSong: null,
                destroyTimeout: null,
                volume: 0.5 // Varsayılan %50 ses
            };

            player.on(AudioPlayerStatus.Idle, async () => {
                console.log(`[MusicManager] AudioPlayer Idle oldu. (${guildId})`);
                queue.currentSong = null;
                await this.updateStatus(queue, null);
                this.playNext(guildId);
            });

            player.on('stateChange', (oldState, newState) => {
                if (oldState.status !== newState.status) {
                    console.log(`[AudioPlayer-${guildId}] State değişti: ${oldState.status} -> ${newState.status}`);
                }
            });

            player.on('error', (error) => {
                console.error(`[MusicManager] AudioPlayer Hatası (${guildId}):`, error.message);
                this.playNext(guildId);
            });

            this.queues.set(guildId, queue);
        }
        return this.queues.get(guildId);
    }

    /**
     * Sese bağlanır
     */
    async connect(channel) {
        const guildId = channel.guild.id;
        const queue = this.getQueue(guildId);

        if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
            queue.connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guildId,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            queue.connection.on('stateChange', (oldState, newState) => {
                if (oldState.status !== newState.status) {
                    console.log(`[VoiceConnection-${guildId}] State değişti: ${oldState.status} -> ${newState.status}`);
                }
            });

            try {
                // Discord.js v14 için önerilen bekleme süresi 15_000 ms. 
                // Eğer UDP takılırsa destroy edip hatayı sessizce geç. 
                await entersState(queue.connection, VoiceConnectionStatus.Ready, 15_000);
            } catch (error) {
                console.log(`[MusicManager] ⚠️ Voice Connection Timeout (Discord UDP veya Node.js Crypto sorunu). Bağlantı iptal edildi.`);
                try { queue.connection.destroy(); } catch (e) {}
                queue.connection = null;
                return queue;
            }

            queue.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(queue.connection, VoiceConnectionStatus.Signalling, 10_000),
                        entersState(queue.connection, VoiceConnectionStatus.Connecting, 10_000),
                    ]);
                } catch (error) {
                    this.stop(guildId);
                }
            });

            queue.connection.subscribe(queue.player);
            queue.channel = channel;
        }
        return queue;
    }

    /**
     * Radyo modu (Kesintisiz Stream)
     */
    async playRadio(channel, streamUrl, radioName) {
        const queue = await this.connect(channel);
        if (!queue || !queue.connection) return false;
        
        queue.mode = 'radio';
        queue.songs = []; // Kuyruğu temizle
        queue.playedSongs.clear();

        try {
            const client = streamUrl.startsWith('https') ? require('https') : require('http');
            
            client.get(streamUrl, (response) => {
                if (response.statusCode < 200 || response.statusCode >= 400) {
                    console.error('[MusicManager] Radyo sunucusu reddetti:', response.statusCode);
                    return;
                }
                const resource = createAudioResource(response, { inlineVolume: true });
                resource.volume.setVolume(queue.volume);
                
                queue.currentSong = { title: radioName || 'Radyo Yayını', url: streamUrl, type: 'radio' };
                queue.player.play(resource);
                
                this.updateStatus(queue, `**:radio: | İstasyon: ${queue.currentSong.title}**`).catch(console.error);
            }).on('error', (err) => {
                console.error('[MusicManager] Radyo HTTP hatası:', err.message);
            });
            return true;
        } catch (err) {
            console.error('[MusicManager] Radyo çalma hatası:', err.message);
            return false;
        }
    }

    /**
     * Spotify Resmi Developer API'si üzerinden Access Token alır.
     */
    async getSpotifyToken() {
        const settings = require('../../../Settings.json');
        const clientId = settings.SPOTIFY_CLIENT_ID;
        const clientSecret = settings.SPOTIFY_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            throw new Error('Spotify API Key eksik. Lutfen Settings.json dosyasina SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET verilerini ekleyin.');
        }

        const auth = Buffer.from(clientId + ':' + clientSecret).toString('base64');
        const res = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${auth}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });
        
        return res.data.access_token;
    }

    /**
     * Spotify Embed Iframe Parser (Sıfır API Key, Sıfır IP Ban, 403 ve EPROTO Hatası Yoktur)
     */
    async getSpotifyTracks(url) {
        try {
            const match = url.match(/(playlist|track|album)\/([a-zA-Z0-9]+)/);
            if (!match) return [];
            const type = match[1];
            const id = match[2];

            // 1. Öncelik: Spotify Embed Iframe Scraping (Garanti ve Hızlı)
            const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
            let res = null;
            try {
                res = await axios.get(embedUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
            } catch (embedErr) {
                console.log(`[MusicManager] Spotify Embed (Iframe) erisimi engellendi (403). Fallback Resmi API'ye geciliyor.`);
            }

            const html = res ? res.data : null;
            const nextDataMatch = html ? html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/) : null;

            const tracks = [];

            if (nextDataMatch) {
                const data = JSON.parse(nextDataMatch[1]);
                const entity = data.props?.pageProps?.state?.data?.entity;

                if (type === 'playlist' || type === 'album') {
                    const trackList = entity?.trackList;
                    if (trackList && Array.isArray(trackList)) {
                        for (const t of trackList) {
                            tracks.push({
                                name: t.title,
                                artists: [{ name: t.subtitle || '' }]
                            });
                        }
                        console.log(`[MusicManager] Spotify Embed ile ${tracks.length} sarki cekildi.`);
                        return tracks;
                    }
                } else if (type === 'track') {
                    if (entity?.title) {
                        tracks.push({
                            name: entity.title,
                            artists: [{ name: entity.subtitle || '' }]
                        });
                        return tracks;
                    }
                }
            }

            // Fallback: Embed patlarsa Resmi API'yi dene
            const token = await this.getSpotifyToken();
            const axiosFetch = async (apiUrl) => {
                const r = await axios.get(apiUrl, { 
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
                    } 
                });
                return r.data;
            };

            if (type === 'playlist') {
                const data = await axiosFetch(`https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`);
                if (data.items) {
                    for (const item of data.items) {
                        if (item.track) tracks.push(item.track);
                    }
                }
            } else if (type === 'track') {
                const data = await axiosFetch(`https://api.spotify.com/v1/tracks/${id}`);
                if (data.name) tracks.push(data);
            } else if (type === 'album') {
                const data = await axiosFetch(`https://api.spotify.com/v1/albums/${id}/tracks?limit=50`);
                if (data.items) {
                    for (const item of data.items) {
                        tracks.push(item);
                    }
                }
            }
            return tracks;
        } catch (err) {
            console.error('[MusicManager] Spotify Çekme Hatası:', err.message);
            return [];
        }
    }

    /**
     * Spotify/YouTube Playlist ekleme ve Shuffle çalma
     */
    async addPlaylists(channel, urls, textChannel = null) {
        const guildId = channel.guild.id;
        const queue = await this.connect(channel);
        if (!queue || !queue.connection) return 0;
        
        const wasRadio = (queue.mode === 'radio');
        queue.mode = 'playlist';
        
        let addedCount = 0;

        for (const url of urls) {
            try {
                if (url.includes('spotify.com')) {
                    const tracks = await this.getSpotifyTracks(url);
                    for (const track of tracks) {
                        const trackName = `${track.name} ${track.artists ? track.artists.map(a => a.name).join(' ') : ''}`;
                        if (!queue.playedSongs.has(trackName) && !queue.songs.some(s => s.searchQuery === trackName)) {
                            queue.songs.push({
                                title: track.name,
                                artist: track.artists ? track.artists[0]?.name : 'Bilinmeyen',
                                searchQuery: trackName,
                                type: 'spotify'
                            });
                            addedCount++;
                        }
                    }
                } 
                else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    const tracks = await this.getYoutubePlaylistTracks(url);
                    for (const track of tracks) {
                        if (!queue.playedSongs.has(track.title) && !queue.songs.some(s => s.searchQuery === track.title)) {
                            queue.songs.push(track);
                            addedCount++;
                        }
                    }
                }
            } catch (err) {
                console.error('[MusicManager] Playlist çekme hatası:', err.message);
            }
        }

        if (addedCount > 0) {
            this.shuffle(queue.songs);
            
            if (textChannel) {
                const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
                const ConfigManager = require("../../Core/Handlers/ConfigManager");
                const emojis = ConfigManager.get("Emojis") || {};
                
                const nextSongs = queue.songs.slice(0, 10).map((s, idx) => `> **${idx + 1}.** \`${s.title}\` - ${s.artist}`).join("\n");
                const leftCount = queue.songs.length > 10 ? `\n> *...ve ${queue.songs.length - 10} şarkı daha.*` : "";
                
                const panel = new V2PanelBuilder()
                    .addText(`> ## ${emojis.toji_sparkly || "🎶"} Playlist Başarıyla Yüklendi\n> Toplam **${addedCount}** adet şarkı karıştırılarak kuyruğa eklendi.\n> \n> ### 🎵 Sıradaki İlk 10 Parça:\n${nextSongs}${leftCount}`);
                
                textChannel.send({ components: panel.toJSON(), flags: [require("discord.js").MessageFlags.IsComponentsV2] }).catch(() => {});
            }
            
            // Eğer daha önce radyo çalıyorsa veya player boşta duruyorsa radyoyu kes ve hemen playliste geç
            if (wasRadio || queue.player.state.status === AudioPlayerStatus.Idle) {
                console.log(`[MusicManager] Radyodan Playlist moduna geciliyor. (${addedCount} sarki eklendi)`);
                queue.player.stop(true); // Idle eventini tetikler veya durdurur
                // Eğer player zaten idle ise stop Idle eventini fırlatmayabilir, garantilemek için:
                if (queue.player.state.status === AudioPlayerStatus.Idle) {
                    this.playNext(guildId);
                }
            }
        }

        return addedCount;
    }

    /**
     * Sıradaki şarkıyı çalar
     */
    async playNext(guildId) {
        const queue = this.getQueue(guildId);
        if (!queue) return;

        console.log(`[MusicManager] playNext tetiklendi. Mode: ${queue.mode}, Kuyrukta: ${queue.songs.length} sarki var.`);

        try {
            if (queue.mode === 'radio') {
                // Radyo yayını koptuğunda sesten çıkmak yerine tazeleyip tekrar bağlan
                setTimeout(() => {
                    if (queue.currentSong && queue.currentSong.url) {
                        this.playRadio(queue.channel, queue.currentSong.url, queue.currentSong.title);
                    }
                }, 5000);
                return;
            }

            if (queue.songs.length === 0) {
                console.log(`[MusicManager] Kuyruk bitti, Otomatik Playlist (Autoplay) devreye giriyor...`);
                
                // Rastgele bir otomatik playlist seç
                const randomPlaylistUrl = this.autoPlaylists[Math.floor(Math.random() * this.autoPlaylists.length)];
                const autoTracks = await this.getSpotifyTracks(randomPlaylistUrl);

                if (autoTracks && autoTracks.length > 0) {
                    this.shuffle(autoTracks);
                    for (const track of autoTracks) {
                        const trackName = `${track.name} ${track.artists ? track.artists.map(a => a.name).join(' ') : ''}`;
                        if (!queue.playedSongs.has(trackName)) {
                            queue.songs.push({
                                title: track.name,
                                artist: track.artists ? track.artists[0]?.name : 'Bilinmeyen',
                                searchQuery: trackName,
                                type: 'spotify_auto'
                            });
                        }
                    }

                    if (queue.channel) {
                        this.updateStatus(queue, `**:notes: | Otomatik Çalma Listesi Devrede**`).catch(() => {});
                    }

                    if (queue.songs.length > 0) {
                        return this.playNext(guildId);
                    }
                }

                console.log(`[MusicManager] Otomatik playlist yüklenemedi, 2 dk sonra çıkılacak.`);
                if (queue.destroyTimeout) clearTimeout(queue.destroyTimeout);
                queue.destroyTimeout = setTimeout(() => {
                    this.stop(guildId);
                }, 120000); // 2 dk boş kalırsa çık
                return;
            }

            if (queue.destroyTimeout) {
                clearTimeout(queue.destroyTimeout);
                queue.destroyTimeout = null;
            }

            const nextSong = queue.songs.shift();
            queue.currentSong = nextSong;

            console.log(`[MusicManager] Siradaki sarki hazirlaniyor: ${nextSong.searchQuery}`);

            queue.playedSongs.add(nextSong.searchQuery);

            let stream;
            try {
                // YouTube Denemesi
                let fallbackToSC = false;
                try {
                    let targetUrl = nextSong.url;
                    if (!targetUrl) {
                        targetUrl = await this.searchYoutubeWithApi(nextSong.searchQuery);
                    }
                    if (!targetUrl) {
                        const playSearch = await play.search(nextSong.searchQuery, { limit: 1, source: { youtube: 'video' } }).catch(() => null);
                        if (playSearch && playSearch.length > 0) targetUrl = playSearch[0].url;
                    }
                    
                    if (targetUrl) {
                        try {
                            stream = await play.stream(targetUrl);
                        } catch (stErr) {
                            console.log(`[MusicManager] YouTube Stream 429/Hata: ${stErr.message}`);
                            fallbackToSC = true;
                        }
                    } else {
                        fallbackToSC = true;
                    }
                } catch (ytErr) {
                    console.log(`[MusicManager] YouTube Hatasi (Sign in vb.), SoundCloud'a geciliyor: ${ytErr.message}`);
                    fallbackToSC = true;
                }

                // SoundCloud Fallback Denemesi
                if (fallbackToSC || !stream) {
                    try {
                        const scId = await play.getFreeClientID();
                        await play.setToken({ soundcloud: { client_id: scId } });
                        
                        const scResults = await play.search(nextSong.searchQuery, { limit: 1, source: { soundcloud: 'tracks' } });
                        if (scResults && scResults.length > 0) {
                            try {
                                stream = await play.stream(scResults[0].url);
                            } catch (scStrErr) {
                                console.log(`[MusicManager] SoundCloud Stream Hatasi: ${scStrErr.message}`);
                                return this.playNext(guildId);
                            }
                        } else {
                            console.log(`[MusicManager] ${nextSong.searchQuery} iki platformda da bulunamadi.`);
                            return this.playNext(guildId);
                        }
                    } catch (scErr) {
                        console.log(`[MusicManager] SoundCloud Hatasi: ${scErr.message}`);
                        return this.playNext(guildId);
                    }
                }

            } catch (err) {
                console.error(`[MusicManager] Genel Stream Hatasi (${nextSong.searchQuery}):`, err.message);
                return this.playNext(guildId);
            }

            if (stream && stream.stream) {
                try {
                    const resource = createAudioResource(stream.stream, { inputType: stream.type, inlineVolume: true });
                    resource.volume.setVolume(queue.volume);
                    queue.player.play(resource);
                    
                    await this.updateStatus(queue, `**:notes: | Şarkı: ${nextSong.title} - ${nextSong.artist}**`);
                } catch (audioErr) {
                    console.error('[MusicManager] AudioResource olusturulamadi:', audioErr.message);
                    return this.playNext(guildId);
                }
            } else {
                return this.playNext(guildId);
            }
        } catch (err) {
            console.error('[MusicManager] playNext genel hatasi:', err);
            return this.playNext(guildId);
        }
    }

    /**
     * Çalan şarkıyı geçer
     */
    skip(guildId) {
        const queue = this.getQueue(guildId);
        if (queue && queue.player.state.status !== AudioPlayerStatus.Idle) {
            queue.player.stop(); // Bu, idle eventi tetikleyecek ve playNext çalışacak
            return true;
        }
        return false;
    }

    /**
     * Müzik yöneticisini tamamen kapatır ve sesten çıkar
     */
    async stop(guildId) {
        const queue = this.queues.get(guildId);
        if (queue) {
            if (queue.destroyTimeout) clearTimeout(queue.destroyTimeout);
            queue.player.stop();
            if (queue.connection) {
                queue.connection.destroy();
            }
            await this.updateStatus(queue, null);
            this.queues.delete(guildId);
        }
    }

    /**
     * Discord v14 Voice Channel Status güncellemesi (REST API ile Kesin Çözüm)
     */
    async updateStatus(queue, statusText) {
        if (!queue.channel) return;
        try {
            const finalStatus = statusText ? statusText.substring(0, 175) : "";
            // Routes objesi hata verdiği için doğrudan endpoint kullanıyoruz.
            await queue.channel.client.rest.put(
                `/channels/${queue.channel.id}/voice-status`, 
                { body: { status: finalStatus } }
            );
            console.log(`[MusicManager] Kanal durumu guncellendi: ${finalStatus || 'Temizlendi'}`);
        } catch (err) {
            console.error('[MusicManager] Status guncellenemedi (REST API):', err.message);
        }
    }

    /**
     * Ses seviyesini ayarlar (0.0 ile 1.0 arası veya %0-100)
     */
    setVolume(guildId, volumeLevel) {
        const queue = this.queues.get(guildId);
        if (!queue) return false;
        
        let vol = parseFloat(volumeLevel);
        if (vol > 1.0) vol = vol / 100; // Eğer 50 dendiyse 0.5 yapar
        if (vol < 0) vol = 0;
        if (vol > 1) vol = 1;

        queue.volume = vol;
        // Eğer şu an bir şey çalıyorsa sesini anında değiştir
        if (queue.player.state.status === AudioPlayerStatus.Playing) {
            const resource = queue.player.state.resource;
            if (resource && resource.volume) {
                resource.volume.setVolume(vol);
            }
        }
        return true;
    }

    /**
     * Array karıştırıcı
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

module.exports = new MusicManager();
