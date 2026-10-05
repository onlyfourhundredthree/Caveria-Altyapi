const WordGame = require("../../Core/Database/WordGame");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StatCacheManager = require("../../Core/Handlers/StatCacheManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const { MessageFlags } = require("discord.js");
const axios = require("axios");

module.exports = async (client) => {
    const gameChannelId = ConfigManager.get("Channels.KelimeTuretmece");
    if (!gameChannelId) return;

    const channel = client.channels.cache.get(gameChannelId) || client.channels.cache.find(c => c.name === gameChannelId);
    if (!channel || !channel.isTextBased()) return;

    // V2 Panel Flag
    const mFlags = MessageFlags.IsComponentsV2 || (1 << 16);

    try {
        let game = await WordGame.findOne({ GuildID: channel.guild.id });

        // Hiç oyun yoksa yeni oyun başlat (Tıpkı WordGameHandler'daki gibi)
        if (!game) {
            const randomWords = [
                "kalem", "masa", "kitap", "bilgisayar", "telefon", "araba", "okul", "elma", "armut", "karpuz",
                "yastık", "yorgan", "perde", "bardak", "tabak", "çatal", "kaşık", "bıçak", "dolap", "sandalye"
            ];
            const firstWord = randomWords[Math.floor(Math.random() * randomWords.length)];
            
            game = new WordGame({
                GuildID: channel.guild.id,
                ChannelID: channel.id,
                LastWord: firstWord,
                LastUser: "bot",
                UsedWords: [firstWord],
                TotalWords: 1
            });
            await game.save();

            const startPanel = new V2PanelBuilder()
                .addAccessory("https://cdn-icons-png.flaticon.com/512/3406/3406828.png", "## 🎮 Kelime Türetmece (Sistem Restart)")
                .addDivider(1)
                .addText(`> **Sistem güncellendi, yeni oyun başlıyor!**\n> **İlk Kelime:** \`${firstWord.toUpperCase()}\`\n> Sıradaki kelime **${firstWord.slice(-1).toUpperCase()}** ile başlamalı!`)
                .toJSON();
            
            await channel.send({ components: startPanel, flags: [mFlags] });
            return;
        }

        // Bot kapalıyken atılan mesajları topla ve incele
        const fetched = await channel.messages.fetch({ limit: 50 });
        // Eski mesajlardan yeni mesajlara doğru sırala (kronolojik)
        const messages = Array.from(fetched.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        let msgsToDelete = [];
        let validSyncCount = 0;

        for (const msg of messages) {
            // Eğer bot mesajıysa es geç (Panel vb.)
            if (msg.author.bot) continue;

            // Zaten bot online iken onay almışsa (✅ varsa) es geç
            if (msg.reactions.cache.has("✅")) continue;

            let word = msg.content.trim().toLocaleLowerCase('tr-TR');
            let isInvalid = false;

            // Kural kontrolleri
            if (word.includes(" ")) isInvalid = true;
            else if (!/^[a-zçğıöşü]+$/.test(word)) isInvalid = true;
            else if (game.LastUser === msg.author.id) isInvalid = true;
            else if (game.UsedWords.includes(word)) isInvalid = true;
            else if (!word.startsWith(game.LastWord.slice(-1).toLocaleLowerCase('tr-TR'))) isInvalid = true;
            else if ((word.endsWith("ğ") || word.endsWith("j")) && game.TotalWords < 300) isInvalid = true;
            
            // TDK Kontrolü
            if (!isInvalid) {
                try {
                    const response = await axios.get(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`);
                    if (response.data.error || !Array.isArray(response.data) || response.data.length === 0) {
                        isInvalid = true;
                    }
                } catch (err) {
                    // API hatasında tolere ediyoruz
                }
            }

            if (isInvalid) {
                msgsToDelete.push(msg);
            } else {
                // Kelime geçerli! Geriye dönük senkronize et
                game.LastWord = word;
                game.LastUser = msg.author.id;
                game.UsedWords.push(word);
                game.TotalWords += 1;
                
                const earnXP = Number((word.length * 0.1).toFixed(2));
                StatCacheManager.addMessage(msg.guild.id, msg.author.id, msg.channel.id, [], earnXP);
                
                await msg.react("✅").catch(()=>{});
                validSyncCount++;
            }
        }

        // Hatalı/uyumsuz mesajları topluca sil
        if (msgsToDelete.length > 0) {
            await channel.bulkDelete(msgsToDelete, true).catch(() => {});
        }

        // Değişiklik olduysa DB'yi kaydet
        if (validSyncCount > 0) {
            await game.save();
        }

    } catch (e) {
        console.error("[WordGameStartup] Senkronizasyon hatası:", e.message);
    }
};
