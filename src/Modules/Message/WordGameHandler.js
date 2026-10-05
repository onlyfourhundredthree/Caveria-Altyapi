const WordGame = require("../../Core/Database/WordGame");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StatCacheManager = require("../../Core/Handlers/StatCacheManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const { MessageFlags } = require("discord.js");
const axios = require("axios");

module.exports = async (message) => {
    // 1. Kanal Kontrolü
    const gameChannelId = ConfigManager.get("Channels.KelimeTuretmece");
    if (!gameChannelId) return;
    
    const channel = message.client.channels.cache.get(gameChannelId) || message.client.channels.cache.find(c => c.name === gameChannelId);
    if (!channel || message.channel.id !== channel.id) return;
    if (message.author.bot) return;

    // V2 Panel Flag
    const mFlags = MessageFlags.IsComponentsV2 || (1 << 16);

    // Hata mesajı yardımcı fonksiyonu (V2 Panel ile)
    async function sendError(desc) {
        await message.delete().catch(() => {});
        const errorPanel = new V2PanelBuilder()
            .addText(`> **❌ Hata:** ${desc}`)
            .toJSON();
        const m = await message.channel.send({ content: `${message.author}`, components: errorPanel, flags: [mFlags] }).catch(() => {});
        if (m) setTimeout(() => m.delete().catch(() => {}), 6000);
    }

    // İçerik temizliği (Boşlukları sil, küçük harfe çevir)
    let word = message.content.trim().toLocaleLowerCase('tr-TR');
    
    // Eğer cümlenin birden fazla kelimesi varsa kabul etme
    if (word.includes(" ")) {
        return await sendError("Lütfen sadece **tek bir kelime** girin!");
    }

    // Harf filtreleme (Sadece türkçe harfler)
    if (!/^[a-zçğıöşü]+$/.test(word)) {
        return await sendError("Kelime sadece **Türkçe harflerden** oluşmalıdır (sayı veya sembol yasak)!");
    }

    // Sözlükten rastgele kelimeler (Başlangıç veya ğ/j için)
    const randomWords = [
        "kalem", "masa", "kitap", "bilgisayar", "telefon", "araba", "okul", "elma", "armut", "karpuz",
        "yastık", "yorgan", "perde", "bardak", "tabak", "çatal", "kaşık", "bıçak", "dolap", "sandalye",
        "pencere", "kapı", "televizyon", "radyo", "kulaklık", "hoparlör", "klavye", "fare", "ekran", "kamera",
        "çiçek", "böcek", "hayvan", "insan", "çocuk", "bebek", "genç", "yaşlı", "doktor", "öğretmen"
    ];

    // DB'den oyun çek
    let game = await WordGame.findOne({ GuildID: message.guild.id });
    if (!game) {
        const firstWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        game = new WordGame({
            GuildID: message.guild.id,
            ChannelID: message.channel.id,
            LastWord: firstWord,
            LastUser: "bot",
            UsedWords: [firstWord],
            TotalWords: 1
        });
        await game.save();

        const startPanel = new V2PanelBuilder()
            .addAccessory("https://cdn-icons-png.flaticon.com/512/3406/3406828.png", "## 🎮 Kelime Türetmece Başladı!")
            .addDivider(1)
            .addText(`> **İlk Kelime:** \`${firstWord.toUpperCase()}\`\n> Sıradaki kelime **${firstWord.slice(-1).toUpperCase()}** ile başlamalı!\n\n> 🎯 *Kurallar:*\n> - **300.** kelimeye ulaşana kadar \`Ğ\` veya \`J\` ile biten kelime kullanılamaz.\n> - TDK'da bulunmayan, uydurma veya önceden yazılmış kelimeler kabul edilmez.`)
            .toJSON();

        await message.channel.send({ components: startPanel, flags: [mFlags] });
        // Return atmıyoruz ki yazdığı ilk kelimeyi de saysın (Eğer tutuyorsa).
    }

    // 2. Kural: Son kullanıcı tekrar oynayamaz
    if (game.LastUser === message.author.id) {
        return await sendError("Üst üste iki kelime türetemezsiniz! Lütfen sıranızı bekleyin.");
    }

    // 3. Kural: Son harf ile başlamalı
    const expectedLetter = game.LastWord.slice(-1).toLocaleLowerCase('tr-TR');
    if (!word.startsWith(expectedLetter)) {
        return await sendError(`Kelimeniz **'${expectedLetter.toUpperCase()}'** harfi ile başlamalıdır! (Son kelime: **${game.LastWord}**)`);
    }

    // 4. Kural: Kelime daha önce kullanılmış mı?
    if (game.UsedWords.includes(word)) {
        return await sendError(`**'${word.toUpperCase()}'** kelimesi daha önce kullanılmış! Başka bir kelime bulun.`);
    }

    // 5. Kural: Ğ ve J yasağı (300 kelimeden önceyse)
    if ((word.endsWith("ğ") || word.endsWith("j")) && game.TotalWords < 300) {
        await message.delete().catch(() => {});
        const yasakPanel = new V2PanelBuilder()
            .addAccessory(message.author.displayAvatarURL({ extension: 'png' }), `## ⚠️ Yasaklı Harf Kullanımı\n${message.author.toString()}`)
            .addDivider(1)
            .addText(`> Oyunun tıkanmaması ve rekabetin korunması adına, **300. kelimeye** ulaşana kadar **Ğ** veya **J** ile biten kelimeler kullanılamaz!\n\n> 📊 **Şu Anki Durum:** \`${game.TotalWords} / 300 Kelime\``)
            .toJSON();
        
        const m = await message.channel.send({ components: yasakPanel, flags: [mFlags] }).catch(() => {});
        if (m) setTimeout(() => m.delete().catch(() => {}), 8000);
        return;
    }

    // 6. Kural: TDK'da var mı? (GTS - Güncel Türkçe Sözlük API)
    try {
        const response = await axios.get(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`);
        if (response.data.error || !Array.isArray(response.data) || response.data.length === 0) {
            return await sendError(`**'${word.toUpperCase()}'** TDK sözlüğünde bulunamadı! Lütfen geçerli bir Türkçe kelime girin.`);
        }
    } catch (err) {
        console.error("[WordGame] TDK API Hatası:", err.message);
        // API çökerse geçici olarak tolerans tanıyoruz (return atmıyoruz)
    }

    // Puanlama: Harf sayısı * 0.1 Coin (Az buz)
    const earnXP = Number((word.length * 0.1).toFixed(2));
    
    // DB güncelleme
    game.LastWord = word;
    game.LastUser = message.author.id;
    game.UsedWords.push(word);
    game.TotalWords += 1;
    await game.save();

    // Puanı verme (Coin / Puan)
    StatCacheManager.addMessage(message.guild.id, message.author.id, message.channel.id, [], earnXP);

    // Onay
    await message.react("✅").catch(()=>{});

    // 7. Eğer kelime 300'ü geçmiş ve ğ/j ile bitiyorsa sistemi açmak için bot yeni kelime atar
    if (word.endsWith("ğ") || word.endsWith("j")) {
        let newWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        let attempts = 0;
        while (game.UsedWords.includes(newWord) && attempts < 10) {
            newWord = randomWords[Math.floor(Math.random() * randomWords.length)];
            attempts++;
        }

        game.LastWord = newWord;
        game.LastUser = "bot";
        game.UsedWords.push(newWord);
        game.TotalWords += 1;
        await game.save();

        const unlockPanel = new V2PanelBuilder()
            .addAccessory("https://cdn-icons-png.flaticon.com/512/3406/3406828.png", "## ✨ Sistem Tıkandı, Yenileniyor!")
            .addDivider(1)
            .addText(`> Oyun en son **${word.slice(-1).toUpperCase()}** harfi ile bittiği için kilitlendi!\n\n> 🔹 Otomatik olarak yeni kelime seçildi: **${newWord.toUpperCase()}**\n> 🔹 Sıradaki kelime **${newWord.slice(-1).toUpperCase()}** ile başlamalı.`)
            .toJSON();

        await message.channel.send({ components: unlockPanel, flags: [mFlags] }).catch(() => { });
    }
};
