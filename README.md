<div align="center">

# 🛡️ CAVERIA INFRASTRUCTURE

**Gelişmiş Discord Sunucu Yönetimi, Guard Korumaları, Moderasyon, Ekonomi ve Eğlence Altyapısı**

[![Node.js Version](https://img.shields.io/badge/node.js-v20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14.27.0-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![MongoDB](https://img.shields.io/badge/database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![PM2 Supported](https://img.shields.io/badge/process_manager-PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![Cloudflare R2](https://img.shields.io/badge/cloud_backup-Cloudflare_R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

---

Caveria, yüksek üye sayılı Discord sunucuları için sıfırdan modüler mimariyle geliştirilmiş enterprise düzeyde sunucu yönetimi, moderasyon, sunucu koruma (guard), ekonomi ve etkileşim altyapısıdır.

</div>

---

## 📋 İçindekiler

- [Öne Çıkan Özellikler](#-öne-çıkan-özellikler)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Proje Klasör Mimarisi](#-proje-klasör-mimarisi)
- [Hızlı Kurulum Rehberi](#-hızlı-kurulum-rehberi)
- [PM2 Yönetim Rehberi](#-pm2-yönetim-rehberi)
- [Yapılandırma Dosyası (`Settings.json`)](#-yapılandırma-dosyası-settingsjson)
- [Güvenlik ve Gizlilik](#-güvenlik-ve-gizlilik)
- [Lisans](#-lisans)

---

## 🚀 Öne Çıkan Özellikler

### 🛡️ Gelişmiş Sunucu Koruması (Guard)
- **Role & Channel Guard:** İzinsiz rol veya kanal silme/oluşturma durumlarında anında işlemi geri alma ve silen yetkiliyi cezalandırma.
- **Webhook & Bot Guard:** Sunucuya izinsiz bot ekleme ve webhook oluşturma girişimlerini otomatik engelleme.
- **Emoji & Server Guard:** Emoji silme veya sunucu ayarlarıyla oynama hareketlerinde otomatik koruma.
- **ChatGuard / Anti-Spam:** Reklam, küfür, spam ve aşırı etiket kullanımını anında engelleme.

### 🔨 Esnek Moderasyon & Ceza Takibi
- **Gelişmiş Ceza Sistemleri:** `Ban`, `Jail`, `Mute`, `Forceban`, `Uyarı` ve `Underworld` durum takibi.
- **Sicil ve Kanıt Yönetimi:** Kullanıcının geçmiş cezalarını tarih, yetkili ve kanıt bazlı veritabanında saklama.
- **Otomatik Süre Düşürme:** Süreli Mute ve Jail cezalarını süre bitiminde otomatik kaldırma (Cron Job).

### 🎲 İnteraktif Oyunlar & Ekonomi
- **Monopoly (3D Canvas):** Discord içi 3D stilli Monopoly tahtası. Arsa satın alma, zar atma, ev/otel inşa etme ve oyuncu bakiyesi takibi.
- **Vampir - Köylü:** Gece/Gündüz fazları, otomatik rol dağıtımı, gizli oylamalar ve oyun içi dinamik Canvas görselleştirmeleri.
- **Kelime Türetmece:** Otomatik kelime kontrolü, skor takibi ve kanal sınırlaması.

### 📊 İstatistik & Seviye (Leveling)
- **Ses & Mesaj İstatistikleri:** Günlük, haftalık ve genel ses/mesaj istatistikleri.
- **Görsel Seviye Kartları:** Napi-RS Canvas tabanlı özelleştirilebilir seviye (Rank) ve Profil kartları.
- **Haftalık Derece Ödülleri:** En aktif üyelere otomatik haftalık rol ve ödül dağıtımı.

### ☁️ Cloudflare R2 Yedekleme & Kurtarma
- Sunucu rol yapılandırmaları, kanal izinleri ve kategori şablonlarını Cloudflare R2 nesne depolama alanına tam yedekleme ve tek komutla felaket kurtarma.

### 🎧 TTS & Otomatik Ses Odaları
- **Edge TTS Entegrasyonu:** Microsoft Edge Neural ses teknolojisi ile Türkçe sesli karşılama ve duyurular.
- **TempVoice (Geçici Oda):** Kullanıcı kanala girdiğinde kişiye özel ses odası oluşturma ve yönetme.

---

## 🛠️ Teknoloji Yığını

- **Runtime:** Node.js (v20+)
- **Library:** Discord.js v14
- **Database:** MongoDB & Mongoose ORM
- **Process Manager:** PM2
- **Graphics Engine:** `@napi-rs/canvas` & `canvas`
- **Cloud Storage:** `@aws-sdk/client-s3` (Cloudflare R2 API)
- **Audio & TTS:** `@discordjs/voice`, `node-edge-tts`, `ffmpeg-static`

---

## 📁 Proje Klasör Mimarisi

```struct
apps/Caveria/
├── ecosystem.config.js     # PM2 Süreç Yönetim Yapılandırması
├── Settings.example.json   # Örnek Konfigürasyon Şablonu
├── Settings.json           # Üretim Yapılandırma Dosyası (Git-Ignored)
├── index.js                # Uygulama Başlatıcı (Entry Point)
├── package.json            # Bağımlılıklar ve PM2 Scriptleri
└── src/
    ├── Assets/             # Emojiler, Fontlar ve Görsel Materyaller
    ├── Commands/           # Prefix ve Slash Komutları
    │   ├── Global/
    │   ├── Prefix/
    │   └── Slash/
    ├── Core/
    │   ├── Clients/        # Ana ve İkincil Discord İstemcileri
    │   ├── Config/         # Varsayılan Sistem Yapılandırmaları
    │   ├── Database/       # Mongoose Modelleri & Şemalar
    │   └── Handlers/       # Event, Komut, Mongo & Cron Yükleyicileri
    └── Modules/            # Dinamik Olay Dinleyicileri (Guild, Voice, Message)
```

---

## ⚙️ Hızlı Kurulum Rehberi

### 1. Ön Gereksinimler
- Node.js (v20.0.0 veya üzeri)
- MongoDB Veritabanı Bağlantı Bağlantısı (URI)
- PM2 (`npm install -g pm2`)

### 2. Bağımlılıkları Yükleyin
```bash
cd apps/Caveria
npm install
```

### 3. Yapılandırma Dosyasını Hazırlayın
Örnek konfigürasyon dosyasını kopyalayın ve kendi Discord Bot tokenınız, MongoDB adresiniz ve ID bilgilerinizi girin:

```bash
cp Settings.example.json Settings.json
```

`Settings.json` içeriğini düzenleyin:
```json
{
  "RiotApiKey": "RGAPI-XXXXXX",
  "HenrikApiKey": "HDEV-XXXXXX",
  "MongoURL": "mongodb+srv://user:pass@cluster.mongodb.net/caveria",
  "Owners": ["YOUR_DISCORD_ID"],
  "Main": {
    "Moderation": "YOUR_BOT_TOKEN",
    "Prefixs": [".", "!", "-"],
    "ClientID": "YOUR_CLIENT_ID",
    "GuildID": "YOUR_GUILD_ID"
  }
}
```

---

## 🔄 PM2 Yönetim Rehberi

Caveria, sunucu üzerinde kesintisiz (7/24) çalışmak üzere **PM2 Process Manager** ile tam uyumludur.

### Başlatma & Durdurma Komutları

```bash
# PM2 ile Botu Başlatın
npm run start

# Canlı Logları İzleyin
npm run logs

# Bot Durumunu ve Bellek Kullanımını İzleyin
npm run monit

# Botu Yeniden Başlatın
npm run restart

# Botu Durdurun
npm run stop
```

### Sunucu Yeniden Başladığında Otomatik Açılma (Persistence)
Sunucu (VPS) kapandığında veya yeniden başladığında botun otomatik devreye girmesi için:

```bash
# PM2 Startup Scriptini Oluşturun
pm2 startup

# Mevcut Süreç Listesini Kaydedin
pm2 save
```

---

## 🔐 Güvenlik ve Gizlilik

- `Settings.json` ve `.env` gibi hassas dosyalar `.gitignore` kapsamındadır.
- GitHub reposuna kod gönderirken gizli token ve API anahtarlarınızı paylaşmadığınızdan emin olun.
- Yetkisiz erişimleri önlemek için MongoDB kullanıcınıza güçlü parolalar tanımlayın.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır. Dilediğiniz gibi geliştirebilir ve özelleştirebilirsiniz.
