const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const path = require('path');
const os = require('os');
const fs = require('fs');

class VampireVoiceManager {
    constructor() {
        this.players = new Map(); // guildID -> AudioPlayer
        this.queues = new Map();  // guildID -> Array of items { type, payload }
    }

    getConnectionAndPlayer(channel) {
        const { secondaryClient } = require('../Core/Clients/SecondaryClient');
        let voiceChannel = channel;
        let botGroupId = channel.client.user.id;

        if (secondaryClient && secondaryClient.isReady()) {
            const secChan = secondaryClient.channels.cache.get(channel.id);
            if (secChan) {
                voiceChannel = secChan;
                botGroupId = secondaryClient.user.id;
            }
        }

        let connection = getVoiceConnection(voiceChannel.guild.id, botGroupId);
        if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true,
                group: botGroupId
            });
        }

        let player = this.players.get(channel.guild.id);
        if (!player) {
            player = createAudioPlayer();
            this.players.set(channel.guild.id, player);
            connection.subscribe(player);

            player.on('error', error => {
                console.error(`[VampireVoice] Audio Player Error: ${error.message}`);
                this.processQueue(channel.guild.id);
            });

            player.on(AudioPlayerStatus.Idle, () => {
                this.processQueue(channel.guild.id);
            });
        } else {
            connection.subscribe(player);
        }

        return player;
    }

    async processQueue(guildId) {
        const q = this.queues.get(guildId);
        const player = this.players.get(guildId);
        
        if (!q || q.length === 0 || !player) return;
        if (player.state.status !== AudioPlayerStatus.Idle) return; // Wait for current item to finish

        const nextItem = q.shift();
        
        try {
            if (nextItem.type === 'sfx') {
                const baseName = nextItem.payload.replace(/\.(mp3|wav)$/i, '');
                const soundsDir = path.join(__dirname, '..', 'Assets', 'Sounds');
                const wavPath = path.join(soundsDir, baseName + '.wav');
                const mp3Path = path.join(soundsDir, baseName + '.mp3');
                
                const sfxPath = fs.existsSync(wavPath) ? wavPath : fs.existsSync(mp3Path) ? mp3Path : null;
                
                if (sfxPath) {
                    const resource = createAudioResource(sfxPath, { inlineVolume: true });
                    resource.volume.setVolume(1.0);
                    
                    if (player.failsafeTimeout) clearTimeout(player.failsafeTimeout);
                    player.failsafeTimeout = setTimeout(() => {
                        if (player.state.status !== AudioPlayerStatus.Idle) {
                            console.log(`[VampireVoice] SFX stuck in ${player.state.status}! Forcing stop.`);
                            player.stop(true);
                        }
                    }, 15000); // 15s max for SFX
                    
                    player.play(resource);
                } else {
                    console.log(`[VampireVoice] SFX not found: ${baseName}.wav / ${baseName}.mp3`);
                    this.processQueue(guildId);
                }
            } else if (nextItem.type === 'tts') {
                if (!nextItem.ready) {
                    // Geri koy ve bekle, üretilince event ile çağrılacak
                    q.unshift(nextItem);
                    return;
                }

                if (nextItem.failed || !nextItem.file) {
                    this.processQueue(guildId); // atla
                    return;
                }

                const resource = createAudioResource(nextItem.file, { inlineVolume: true });
                resource.volume.setVolume(1.5);
                
                if (player.failsafeTimeout) clearTimeout(player.failsafeTimeout);
                player.failsafeTimeout = setTimeout(() => {
                    if (player.state.status !== AudioPlayerStatus.Idle) {
                        console.log(`[VampireVoice] TTS stuck in ${player.state.status}! Forcing stop.`);
                        player.stop(true);
                    }
                }, 40000); // 40s max for TTS
                
                player.play(resource);

                setTimeout(() => {
                    fs.unlink(nextItem.file, (err) => {
                        if (err && err.code !== 'ENOENT') console.error(`[VampireVoice] Temp dosya silinirken hata: ${err.message}`);
                    });
                }, 15000);
            }
        } catch (err) {
            console.error("[VampireVoice] Process Queue Hatası:", err.message || err);
            this.processQueue(guildId); // skip and continue
        }
    }

    /**
     * @param {import('discord.js').VoiceChannel} channel
     * @param {string} text
     * @param {string} sfxName Optional SFX to play before TTS
     */
    async speak(channel, text, sfxName = null) {
        if (!channel || !channel.isVoiceBased()) return;
        this.getConnectionAndPlayer(channel);

        if (!this.queues.has(channel.guild.id)) {
            this.queues.set(channel.guild.id, []);
        }
        
        const q = this.queues.get(channel.guild.id);
        
        if (sfxName) {
            q.push({ type: 'sfx', payload: sfxName });
        }
        if (text) {
            const ttsItem = { type: 'tts', payload: text, file: null, ready: false, failed: false };
            q.push(ttsItem);
            
            // Arka planda anında oluştur (Delayi kaldırmak için)
            (async () => {
                try {
                    const { EdgeTTS } = require('node-edge-tts');
                    const tempFileName = `vampire_tts_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`;
                    const tempFilePath = path.join(os.tmpdir(), tempFileName);

                    const tts = new EdgeTTS({
                        voice: 'tr-TR-EmelNeural', // Kadın sesi
                        lang: 'tr-TR',
                        outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                    });

                    // Add a timeout to prevent the queue from getting stuck forever
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TTS Timeout")), 15000));
                    await Promise.race([tts.ttsPromise(text, tempFilePath), timeoutPromise]);

                    ttsItem.file = tempFilePath;
                    ttsItem.ready = true;
                } catch (err) {
                    console.error("[VampireVoice] TTS Pre-gen Error:", err.message);
                    ttsItem.failed = true;
                    ttsItem.ready = true;
                }
                
                // Eğer player idle ise ve bu bizim en öndeki öğemizse çalıştır
                if (this.players.get(channel.guild.id)?.state.status === AudioPlayerStatus.Idle) {
                    this.processQueue(channel.guild.id);
                }
            })();
        }

        this.processQueue(channel.guild.id);
    }

    /**
     * Kuyruğun boş olup olmadığını ve playerin idle olup olmadığını kontrol eder.
     */
    isIdle(guildId) {
        const q = this.queues.get(guildId);
        const player = this.players.get(guildId);
        const queueEmpty = !q || q.length === 0;
        const playerIdle = !player || player.state.status === AudioPlayerStatus.Idle;
        return queueEmpty && playerIdle;
    }

    /**
     * Kuyruk tamamen bitene kadar bekler. Faz geçişlerinde kullanılır.
     * @param {string} guildId
     * @param {number} maxWaitMs - Maksimum bekleme süresi (varsayılan 60 saniye)
     * @returns {Promise<void>}
     */
    waitUntilIdle(guildId, maxWaitMs = 60000) {
        return new Promise((resolve) => {
            if (this.isIdle(guildId)) return resolve();
            
            const startTime = Date.now();
            const interval = setInterval(() => {
                if (this.isIdle(guildId) || (Date.now() - startTime) > maxWaitMs) {
                    clearInterval(interval);
                    resolve();
                }
            }, 500);
        });
    }

    /**
     * Ses kanalından çıkar ve kuyruğu temizler.
     */
    disconnect(guildId) {
        // Kuyruğu temizle
        this.queues.delete(guildId);
        
        // Player'ı durdur
        const player = this.players.get(guildId);
        if (player) {
            player.stop(true);
            this.players.delete(guildId);
        }

        // Bağlantıyı kes
        const { secondaryClient } = require('../Core/Clients/SecondaryClient');
        const groupId = secondaryClient?.user?.id;
        const connection = getVoiceConnection(guildId, groupId) || getVoiceConnection(guildId);
        if (connection) {
            connection.destroy();
        }
    }
}

module.exports = new VampireVoiceManager();
