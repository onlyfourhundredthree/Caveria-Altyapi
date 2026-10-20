\# Eski Bot: Tüm Sistemler ve Komutlar



Bu dosya, referans aldığımız eski botun (`Documents/GitHub/403/apps/...`) içindeki her sistemi, komutu, paneli, düğmeyi, ayarı ve arka planda çalışan otomatik işi tek tek listeler. Amaç, toji bots'a taşırken hiçbir şeyin atlanmaması.



Kaynak: eski botun tüm `src` klasörü tarandı (514 dosya, yaklaşık 55 bin satır). Komut tabloları (Ek A ve Ek B) doğrudan kaynak koddan otomatik çıkarıldı. Sistem açıklamaları ilgili servis ve olay dosyaları okunarak yazıldı.



\## Durum İşaretleri



| İşaret | Anlamı |

|---|---|

| ✅ | toji bots'ta var (eski botla aynı metin ve komutlarla, webden özelleştirilebilir) |

| 🟡 | toji bots'ta kısmen var, eksikleri yanında yazıyor |

| ⬜ | toji bots'ta yok, taşınması gerekiyor |

| ⚫ | Eski botta ayarı var ama hiçbir kod kullanmıyor (ölü ayar), ya da sadece o sunucuya özel |



\## İçindekiler



1\. \[Genel Altyapı](#1-genel-altyapı)

2\. \[Moderasyon](#2-moderasyon)

3\. \[Kanıt ve Denetim Sistemi](#3-kanıt-ve-denetim-sistemi)

4\. \[Sicil, Ban Sorgulama ve Af](#4-sicil-ban-sorgulama-ve-af)

5\. \[Destek Talebi (Ticket)](#5-destek-talebi-ticket)

6\. \[Yedekleme](#6-yedekleme)

7\. \[Hoş Geldin ve Giriş Kontrolü](#7-hoş-geldin-ve-giriş-kontrolü)

8\. \[Koruma (Guard)](#8-koruma-guard)

9\. \[Sohbet Koruması (Chat Guard)](#9-sohbet-koruması-chat-guard)

10\. \[Restrict (Sahip Rol Kısıtı)](#10-restrict-sahip-rol-kısıtı)

11\. \[Özel Rol Komutları](#11-özel-rol-komutları)

12\. \[Rol Yönetim Araçları](#12-rol-yönetim-araçları)

13\. \[Rol Butonları](#13-rol-butonları)

14\. \[Sunucu Kayıtları (Log Sistemi)](#14-sunucu-kayıtları-log-sistemi)

15\. \[Ses Kayıtları](#15-ses-kayıtları)

16\. \[İstatistik Sistemi](#16-istatistik-sistemi)

17\. \[Seviye (Level) Sistemi](#17-seviye-level-sistemi)

18\. \[Davet Takibi](#18-davet-takibi)

19\. \[Tag ve TagBan Sistemi](#19-tag-ve-tagban-sistemi)

20\. \[Booster Sistemi](#20-booster-sistemi)

21\. \[Ekonomi ve Market](#21-ekonomi-ve-market)

22\. \[Coin Soru Oyunları](#22-coin-soru-oyunları)

23\. \[Çekiliş](#23-çekiliş)

24\. \[Etkinlik Sistemi](#24-etkinlik-sistemi)

25\. \[Yetkili Görev ve XP Sistemi](#25-yetkili-görev-ve-xp-sistemi)

26\. \[Üye Claim Sistemi](#26-üye-claim-sistemi)

27\. \[Yetkili Alım: Claim, Oryantasyon, Yetki Taşıma](#27-yetkili-alım-claim-oryantasyon-yetki-taşıma)

28\. \[Başvuru Panelleri](#28-başvuru-panelleri)

29\. \[Yetkili Değerlendirme](#29-yetkili-değerlendirme)

30\. \[Birebir (1E1) Görüşme Sistemi](#30-birebir-1e1-görüşme-sistemi)

31\. \[Partner Sistemi](#31-partner-sistemi)

32\. \[Bump, Oy ve Yorum Takibi](#32-bump-oy-ve-yorum-takibi)

33\. \[Özel Odalar (Private Rooms)](#33-özel-odalar-private-rooms)

34\. \[Kalıcı Odalar ve Ekipler](#34-kalıcı-odalar-ve-ekipler)

35\. \[DM Forum (Modmail)](#35-dm-forum-modmail)

36\. \[Silinen Etiket Bildirimi](#36-silinen-etiket-bildirimi)

37\. \[AFK](#37-afk)

38\. \[Otomatik Mesajlar](#38-otomatik-mesajlar)

39\. \[Mesaj Oluşturucu](#39-mesaj-oluşturucu)

40\. \[Topluluk Komutları](#40-topluluk-komutları)

41\. \[Haftalık Ödüller ve Saygınlık](#41-haftalık-ödüller-ve-saygınlık)

42\. \[Otorol](#42-otorol)

43\. \[Kelime Türetmece](#43-kelime-türetmece)

44\. \[Vampir Köylü](#44-vampir-köylü)

45\. \[Monopoly](#45-monopoly)

46\. \[Oyun Lobisi ve Riot Hesapları](#46-oyun-lobisi-ve-riot-hesapları)

47\. \[Sahte Twitter](#47-sahte-twitter)

48\. \[Müzik ve Radyo](#48-müzik-ve-radyo)

49\. \[Sahip ve Bot Yönetim Araçları](#49-sahip-ve-bot-yönetim-araçları)

50\. \[Arka Plan İşleri Özeti](#50-arka-plan-işleri-özeti)

51\. \[Taşıma Önerisi](#51-taşıma-önerisi)

\- \[Ek A: Ön Ekli Komutların Tamamı](#ek-a-ön-ekli-komutların-tamamı)

\- \[Ek B: Eğik Çizgi (Slash) Komutlarının Tamamı](#ek-b-eğik-çizgi-slash-komutlarının-tamamı)



\---



\## 1. Genel Altyapı



\*\*Durum:\*\* 🟡 (ön ek, mesaj tasarlayıcı ve ayar sistemi toji bots'ta webden var; aşağıdaki diğer parçalar yok)



\- \*\*Ön ekler:\*\* `.` `!` `-` aynı anda çalışır.

\- \*\*Komut kısıtları:\*\*

&#x20; - `Channels.Allowed\_Commands` listesi doluysa komutlar sadece o kanallarda çalışır. Ticket kategorisi her zaman serbesttir.

&#x20; - Underworld rolündeki üye hiçbir ön ekli komutu kullanamaz.

&#x20; - Komut başına ve genel bekleme süreleri (cooldown) var.

\- \*\*Ayar sistemi (`.setup`):\*\* Tüm ayarlar tek bir yapılandırma nesnesinde durur. `.setup list` ile 16 kategori sayfalı menüde görüntülenir: Channels, Roles, Economy, Welcome, WeeklyReward, ChatGuard, Boost, Partner, Level, Logs, AutoStaff, StaffControl, TagBan, Emojis, Tweet, BestStaff.

&#x20; - Alt komutlar: `get`, `set`, `push` (listeye ekle), `pull` (listeden çıkar).

&#x20; - Rol ve kanal etiketlenerek girilebilir. `\\n` ile çok satırlı metin yazılır.

&#x20; - Korumalı anahtarlar (Moderation, Owners, Prefixs, ClientID, GuildID, MongoURL) bu komutla değiştirilemez.

&#x20; - toji bots'ta bunun karşılığı web panelidir.

\- \*\*Kurulum paneli (`.kurulum`):\*\* Emoji Kur, Log Kanalları Kur, Emoji Listesi, Emoji Sil, Ayarları Yenile.

&#x20; - Botun kullandığı özel emojileri (`toji\_onay`, `toji\_iptal`, `toji\_info` vb. 60'tan fazla) sunucuya yükler.

&#x20; - Tüm log kanallarını tek seferde açar.

\- \*\*Dil sistemi (`.dil`, `/language`):\*\* Türkçe ve İngilizce. Öncelik sırası: kullanıcının seçtiği dil, sonra `Roles.EnglishRole` rolü, sonra varsayılan Türkçe. Çeviriler `Locales` klasöründen yüklenir.

\- \*\*Hata kaydı:\*\* Botta oluşan hatalar `Channels.ErrorLog` kanalına "Bot Hata Bildirimi" başlığıyla gönderilir.

\- \*\*Mesaj biçimi:\*\* Neredeyse tüm yanıtlar Components V2 (konteyner, bölüm ve küçük resim, ayırıcı, medya galerisi) ile gönderilir.



\## 2. Moderasyon



\*\*Durum:\*\* 🟡 (çekirdek cezalar, etkinlik cezalı, af, itiraz, sicil, ban sorgu ve kanıt sistemi var; sadece yargı yok)



\### Cezalar



| Komut | Ne Yapar | Kim Kullanır |

|---|---|---|

| `ban` | Underworld rolü verir (Discord ban'ı değil). Aktif jail varsa Underworld'e çevirir. | Ban\_Staff |

| `unban` | Underworld'ü veya Discord yasağını kaldırır. | Ban\_Staff |

| `forceban` | Discord'dan kalıcı yasaklar. Tekrar kullanılırsa kaldırır. Kayıt tipi "Kalkmaz Yasaklama". | Sunucu sahibi, RealBan\_Staff |

| `jail` | Sebep listesinden seçilir. Süre 1., 2. ve 3. ihlale göre artar. Tüm rolleri alıp Cezalı rolü verir. | Jail\_Staff |

| `unjail` | Jail'i kaldırır, üye rollerini geri verir. | Jail\_Staff |

| `mute` | Metin veya ses susturması, düğmeyle seçilir. Sebep listeden seçilir. Süre tekrar sayısına göre artar. | Mute\_Staff |

| `unmute` | Metin ve ses susturmasını düğmelerle kaldırır. | Mute\_Staff |

| `uyarı` | İlk uyarı Sözlü Uyarı, sonrakiler Uyarılma. Yetkili ekibine Yetkili Uyarı verilir. | Warn\_Staff |

| `etkinlikcezalı` ✅ | Etkinlik Cezalı rolü verir. Süre ve sebep alır. Ayrı log kanalı var (`EventJailLog`). | EventJail\_Staff, Etkinlik sorumluları |

| `unetkinlikcezali` ✅ | Etkinlik cezasını kaldırır. | Aynı |

| `/yargı`, `/unyargı`, `.ownerban`, `.ownerunban` ⬜ | Sahiplerin uyguladığı ayrı bir ban türü ("yargı"). | Sahipler, RealBan\_Staff |



\### Ayar Panelleri (webde zaten "Ceza Sebepleri" sekmesinde)



\- \*\*`.mute-ayar`:\*\*

&#x20; - Düğmeler: Chat Sebep Ekle, Ses Sebep Ekle, Sebep Düzenle, Sebep Sil, Kapat.

&#x20; - Her sebep için alanlar: görünür isim, sistem değeri, 1., 2. ve 3. ihlal süresi.

\- \*\*`.jail-ayar`:\*\* Jail sebepleri için aynısı.

\- \*\*Varsayılan sebepler:\*\*



&#x20; | Sebep | Tür | 1. | 2. | 3. |

&#x20; |---|---|---|---|---|

&#x20; | Kışkırtma, Troll ve Küfür | Chat | 10m | 30m | 1h |

&#x20; | Siyaset ve Tartışma | Chat | 15m | 45m | 2h |

&#x20; | Spam ve Flood | Chat | 5m | 15m | 30m |

&#x20; | Rahatsız Edici Ses / Troll | Ses | 15m | 1h | 3h |

&#x20; | Ses Kanalında Siyaset | Ses | 30m | 2h | 5h |

&#x20; | Ağır Küfür / Hakaret | Jail | 1d | 3d | 7d |

&#x20; | Sunucu Düzenini Bozma / Troll | Jail | 12h | 1d | 3d |



\### Arka Planda



\- \*\*Süre kontrolü:\*\* Süresi dolan cezalar otomatik kalkar. Jail'den çıkan üyeye roller geri verilir.

\- \*\*Rol tazeleme:\*\* Aktif cezası olan üyenin ceza rolü elle alınırsa geri verilir.

\- \*\*Ses mutesi:\*\* Sağ tıkla açılırsa bot tekrar kapatır (`CheckMute`).

\- \*\*Sağ tık ban kaydı:\*\* Discord'dan elle atılan banlar da sicile "Yasaklama" olarak yazılır (`RightClickBanLog`).

\- \*\*Ban kaldırma takibi:\*\* Discord'dan elle kaldırılan banlar sicilde pasife çekilir (`BanRemoveTracker`).

\- \*\*Ceza itirazı\*\* ✅ (`CezaAppListener`): `ceza\_itiraz`, `ceza\_sure`, `ceza\_sebep` düğmeleri. Eski botta bu düğmeleri gönderen kod yoktu; toji bots'ta ceza DM'ine eklendi ve itiraz, Kabul Et / Reddet düğmeleriyle itiraz kanalına düşüyor.

\- \*\*Log aç/kapa ayarları:\*\* `WarnLogActive`, `MuteLogActive`, `JailLogActive`, `BanLogActive`.

\- \*\*Log kanalları:\*\* ForcebanLog, BanLog, UnderworldLog, JailLog, EventJailLog, MuteLog, UyariLog.

\- \*\*Ceza mesajı:\*\* "{bot adı} Ceza Sistemi" başlıklı V2 mesaj. Altında Kanıt Ekle ve Kanıt Yok düğmeleri olur.



\## 3. Kanıt ve Denetim Sistemi



\*\*Durum:\*\* ✅ (bir önceki turda eski botla aynı şekilde eklendi)



\- Ceza ve ceza kaldırma mesajlarının altında \*\*Kanıt Ekle\*\* ve \*\*Kanıt Yok\*\* düğmeleri çıkar. Sadece cezayı veren yetkili basabilir.

\- \*\*Kanıt Ekle:\*\* Yetkili 60 saniye içinde aynı kanala dosya veya bağlantı gönderir. `iptal` yazarak vazgeçebilir.

&#x20; - Dosyalar depolamaya (R2) yüklenir.

&#x20; - Denetim havuzuna "Yeni Denetim İşi (Kanıt Yüklendi)" düşer.

\- \*\*Kanıt Yok:\*\* Havuza "Kanıtsız / Pas Geçildi" düşer.

\- \*\*Zaman aşımı:\*\* 5 dakika içinde hiçbir şey yapılmazsa havuza "Zaman Aşımı / Kanıtsız" düşer. Bu kontrol dakikada bir yapılır.

\- \*\*Havuz mesajı:\*\*

&#x20; - İçerik: ceza no, tür, sebep, kullanıcı, yetkili, tarih.

&#x20; - Bildirim: yetkili ve denetleyici roller etiketlenir.

&#x20; - Kanıt varsa medya galerisi olarak eklenir.

&#x20; - Düğme: \*\*İlgilen\*\*.

\- \*\*İlgilen:\*\*

&#x20; - İşi alan denetleyici "İlgilenen Yetkili" olarak eklenir.

&#x20; - Düğmeler değişir: \*\*Cezayı Onayla\*\*, \*\*İptal Et / Kaldır\*\*.

\- \*\*İptal Et:\*\* Ceza kaldırılır (ban kalkar, jail ve underworld rolleri geri verilir, mute kalkar). Kayıt gizlenir.

\- \*\*Sonuç kaydı:\*\* Kanıtlıysa `EvidenceLog`'a, kanıtsızsa `EvidenceTimeoutLog`'a gider. Onayda yeşil, iptalde kırmızı.

\- \*\*Yetkili görevi:\*\* Karar vermek yetkili görev sisteminde `EVIDENCE` görevini ilerletir. Bu kısım ⬜, çünkü görev sistemi henüz yok.



\## 4. Sicil, Ban Sorgulama ve Af



\*\*Durum:\*\* ✅



\- \*\*`sicil`:\*\* Ceza geçmişini görsel tablo (canvas) ile gösterir.

&#x20; - Menüden ceza seçilince detay açılır. Detayda \*\*Sicile Dön\*\*, \*\*Cezayı Kaldır\*\*, \*\*Cezayı Temizle\*\* düğmeleri var.

&#x20; - Sayfalama yapılır.

&#x20; - Ceza puanı hesabı: jail 30, mute 15, uyarı 5 puan. "otomatik ceza" sebepli kayıtlar sayılmaz.

&#x20; - Eski bot tabloda ayrıca haftalık ve toplam saygınlığı da gösteriyor. toji bots'ta bu yok, çünkü saygınlık sistemi yok.

\- \*\*`siciltemizle`:\*\* Tüm kayıtları siler, aktif cezaları kaldırır.

\- \*\*`bansorgula`:\*\* Ban, forceban ve Underworld geçmişini görsel tabloyla gösterir. Kayıt yoksa Discord ban sebebini de gösterir.

\- \*\*`.af` / `/af`\*\* ✅, af yönetim paneli:

&#x20; - \*\*Kişisel af:\*\* Kullanıcı seçilir.

&#x20; - \*\*Toplu af seçenekleri:\*\*

&#x20;   - Sadece Jail (X süreden az / X süreden fazla)

&#x20;   - Sadece Underworld (X süreden az / fazla)

&#x20;   - Her İki Ceza İçin (X süreden az / fazla)

&#x20;   - Kalıcı/Süresiz Cezası Olanlar

&#x20;   - Verisi Olmayanları Kurtar (rolü olup kaydı olmayanlar)

&#x20; - \*\*Tüm Cezaları Kaldır (Genel Af):\*\* `ONAY` yazdırarak onay alır.

&#x20; - X süre formdan girilir (örnek: 1h, 1d, 30m).

&#x20; - Her af işlemi "Af Sistemi Log" olarak kaydedilir.



\## 5. Destek Talebi (Ticket)



\*\*Durum:\*\* 🟡 (talep sistemi ve transkript ✅; değerlendirme isteği ve hatalı talep temizleme ⬜)



\- \*\*Panel ve form:\*\*

&#x20; - Panel düğmesi bir form açar.

&#x20; - Form soruları panele göre özelleştirilir. Varsayılan olarak tek bir "Talep Sebebi" sorusu var.

\- \*\*Talep kanalı düğmeleri:\*\* Talebi Devral, Talebi Kilitle/Aç, Sorunum Çözüldü, Talebi Kapat, Banla. Ayrıca "Talebe Üye Ekle / Çıkar" menüsü var.

\- \*\*Kapatma:\*\* Form açılır (Kapanış Özeti, Detaylı Açıklama). Transkript oluşturulur, "Transcripti Görüntüle" bağlantısı gönderilir.

\- \*\*Yetkili tarafı:\*\*

&#x20; - Yöneticinin "Desteği İptal Et" düğmesi var.

&#x20; - Talep sohbet kontrolü: sadece yetkili ve sahip yazabilir.

&#x20; - Kanal silinirse talep otomatik kapanır.

\- \*\*Değerlendirme\*\* ⬜: Talep kapanınca kullanıcıya DM ile yetkili değerlendirme isteği gider (bkz. Bölüm 29).

\- \*\*Komutlar:\*\*

&#x20; - `.ticket ekle/çıkar/izin`

&#x20; - `/ticket ekle | çıkar | izin | banla | ban-kaldir | ban-liste`

&#x20; - `.ticketbugfix` ⬜: Kanalı silinmiş ama açık görünen bilet kaydını temizler.

\- \*\*Yetkili görevi\*\* ⬜: Talep kapatmak `TICKET` görevini ilerletir. İstatistiğe de yazılır.



\## 6. Yedekleme



\*\*Durum:\*\* ✅ (eski botun `.backup` paneli aynen var; otomatik yedek sıklığı webden ayarlanıyor)



\- \*\*Panel:\*\*

&#x20; - Düğmeler: Yedek Oluştur, Yedekleri Yönet, Yenile.

&#x20; - Yedek listesi sekmeli detayla açılır. Tek bir öğe geri yüklenebilir.

\- \*\*Otomatik yedek:\*\* Eski bot her gün 00:00 ve 12:00'de yedek alır, 30 günden eski yedekleri siler.

\- \*\*Koruma ile bağlantı:\*\*

&#x20; - Silinen kanal geri açılırken son yedekteki mesajları webhook ile geri yazar.

&#x20; - Silinen rol geri açılırken yedekteki üyelere rolü geri verir.

&#x20; - Bunlar Koruma sistemiyle birlikte gelmeli (Bölüm 8).



\## 7. Hoş Geldin ve Giriş Kontrolü



\*\*Durum:\*\* ✅ (girişte ceza kontrolü ve gir-çık banı webden açılıp kapatılabiliyor, sınır ve süre ayarlanabiliyor)



Girişte sırasıyla şunlar yapılır (`JoinEvent`):



1\. Aktif \*\*forceban\*\* kaydı varsa üye anında tekrar banlanır.

2\. Üye 3 kez çıkıp girerse "Sürekli Çıkış/Giriş" sebebiyle banlanır.

3\. Aktif \*\*jail\*\* veya \*\*underworld\*\* cezası varsa sadece o rol (ve booster rolü) verilir, başka rol verilmez.

4\. Aktif metin mutesi varsa Susturulmuş rolü eklenir.

5\. Üye rolü verilir. Üye rolü tag rolüyle aynıysa sadece sunucu tagını taşıyanlara verilir.

6\. Sohbet kanalına hoş geldin metni gönderilir. `WelcomeMessageStatus` ile kapatılabilir.



Bekleyen üyeler (sunucu kurallarını kabul etmemiş) kabul edene kadar işlenmez (`ScreeningCheck`).



`Welcome` ayarında V2 hoş geldin mesajı, düğme durumu ve rastgele kısa mesajlar ("{member} partiye katıldı.", "{member} burada.") tanımlı.



\## 8. Koruma (Guard)



\*\*Durum:\*\* ⬜



Yetkililerin sunucuya zarar vermesini engeller. Kim ne yaptı denetim kaydından (audit log) okunur. Sunucu sahibi ve bot her zaman muaf tutulur.



\### Panel (`.guard`)



\- \*\*Ana ekran:\*\*

&#x20; - Sistem durumu ("Guard Sistemi: Aktif / Devre Dışı"), aç/kapat düğmesi.

&#x20; - "Güvenli Liste Özeti".

&#x20; - Düğmeler: Limit \& Süre, Whitelist, Yenile.

\- \*\*Limit \& Süre:\*\*

&#x20; - Kategori seçilir.

&#x20; - Her işlem türü için Limit Değiştir, Süre Değiştir, Ceza Değiştir.

&#x20; - Ceza seçenekleri: Ban, Kick, Jail, Rolleri Al.

\- \*\*Whitelist (Güvenli Liste):\*\*

&#x20; - Liste türleri: Tam Erişim, Rol Erişimi, Kanal Erişimi, Bot Erişimi, Emoji Erişimi.

&#x20; - İşlemler: Ekle (kullanıcı veya ID), Çıkar, Listele (sayfalı).

&#x20; - Hem kullanıcı hem rol eklenebilir.



\### Korunan İşlemler ve Varsayılan Limitler (60 saniyede)



| İşlem | Limit | Ceza | Geri Alma |

|---|---|---|---|

| Rol oluşturma | 3 | Kick | - |

| Rol silme | 1 | Ban | Rol aynı özellikleriyle yeniden açılır, son yedekteki üyelere geri verilir |

| Rol düzenleme | 5 | Jail | İsim, renk ve izinler eski haline döner |

| Role yönetici izni verme | Anında | Ban | İzin geri alınır (limit beklenmez) |

| Kanal oluşturma | 3 | Kick | - |

| Kanal silme | 1 | Ban | Kanal klonlanıp aynı yere konur. Kategoriyse içindeki kanallar geri taşınır. Metin kanalıysa son yedekteki mesajlar webhook ile geri yazılır |

| Kanal düzenleme | 5 | Jail | - |

| Webhook oluşturma | 1 | Ban | Webhook silinir |

| Emoji oluşturma / silme / düzenleme | 5 / 3 / 5 | Kick / Jail / Kick | - |

| Sticker oluşturma / silme / düzenleme | 5 / 3 / 5 | Kick / Jail / Kick | - |

| Üye banlama | 3 | Ban | - |

| Üye atma (kick) | 3 | Ban | - |

| Üye rol güncelleme | 5 | Jail | - |

| Bot ekleme | 1 | Ban | Eklenen bot her durumda atılır |

| Sunucu ayarı değiştirme | 1 | Ban | Sunucu adı ve simgesi geri alınır |

| Özel URL değiştirme | Anında | Ban | - |

| Entegrasyon ekleme | 1 | Ban | - |



\### Ek Korumalar



\- \*\*Ayar koruması (koruma kapalıyken de çalışır):\*\* Botun ayarlarında kullanılan bir kanal veya rol silinirse anında yeniden açılır. Ayardaki kimlik yenisiyle değiştirilir. Silen kişiye DM gönderilir: "Silmeye çalıştığınız ... kanalı botun sistem ayarlarında kullanıldığı için silinmesi engellendi...".

\- \*\*Ceza uygulama:\*\*

&#x20; - "Rolleri Al" seçeneği, Yönetici, Rolleri Yönet, Kanalları Yönet, Webhookları Yönet, Sunucuyu Yönet, Ban ve Kick izni olan rolleri alır.

&#x20; - Ban, kick ve jail cezaları sicile "Guard: ..." sebebiyle yazılır.

\- \*\*Log kanalları:\*\* guard-role-log, guard-channel-log, guard-ban-log, guard-emoji-log, guard-webhook-log, guard-bot-log, guard-server-log. Önce bu isimde kanal aranır, yoksa ayardaki kanal kullanılır.

&#x20; - Log mesajı "Guard: {tür}" başlığıyla gönderilir. İçerik: yetkili, detaylar, "Ceza uygulandı".



\## 9. Sohbet Koruması (Chat Guard)



\*\*Durum:\*\* ⬜



Sadece ana sohbet kanalında (`Channels.Chat`) çalışır. Yöneticiler ve muaf tutulanlar etkilenmez. İhlalde mesaj silinir, üyeye 5 saniyelik uyarı yazılır, `guard-log` kanalına "Chat Guard" kaydı düşer.



| Kural | Varsayılan | Uyarı Metni |

|---|---|---|

| Medya, sticker veya GIF bekleme süresi | 45 sn | "tekrar medya kullanabilmek için \*\*X saniye\*\* beklemelisin!" |

| Emoji limiti | 6 | "çok fazla emoji kullanıyorsun!" |

| Karakter limiti | 400 | "mesajın çok uzun!" |

| Aynı mesajı tekrar atma | 3. tekrarda | "aynı mesajı tekrar atamazsın!" |

| Etiket limiti (veya @everyone) | 5 | "çok fazla etiket kullanıyorsun!" |

| Spoiler limiti | 5 | "çok fazla spoiler kullandın!" |

| Sunucu daveti engeli | Açık | "sunucu reklamı yapmak yasak!" |

| Zalgo ve bozuk yazı | Her zaman | "zalgo / bozuk yazı kullanımı yasaktır!" |

| 8 ve daha fazla satır (ASCII art) | Her zaman | "ascii / art spam yasak!" |



Düzenlenen mesajlar da aynı kurallarla kontrol edilir (`MessageUpdate`).



\## 10. Restrict (Sahip Rol Kısıtı)



\*\*Durum:\*\* ⬜



\- \*\*Ne yapar:\*\* Sahiplerin ve korunan üyelerin belirli rolleri (örneğin seviye rolleri) almasını engeller.

\- \*\*Nasıl çalışır:\*\*

&#x20; - Rol verme ve rol ayarlama işlemleri bu listedeki rolleri filtreler.

&#x20; - Dakikada bir tarama yapılır, bu kişilerde yasaklı rol varsa alınır.

\- \*\*Panel (`/restrictayar`):\*\* Korunan Üyeleri Seç, Yasaklı Rolleri Seç, Sistemi Sıfırla, Yenile.



\## 11. Özel Rol Komutları



\*\*Durum:\*\* ⬜



Sunucuya özel ön ekli komutlar oluşturulur. Örnek: `.vip @üye` VIP rolünü verir ya da alır.



\- \*\*Panel (`.özel-komut`, `/ozel-komut`):\*\* Yeni Komut Oluştur, Komutları Yönet (listele, sil).

\- \*\*Oluşturma formu:\*\*

&#x20; - Komut adı (boşluksuz)

&#x20; - Verilecek hedef roller (en fazla 5)

&#x20; - Komutu kullanabilecek yetkili rolleri (en fazla 10)

&#x20; - Log kanalı

&#x20; - Sunucu kotası (0 = sınırsız)

&#x20; - Sonraki adım: Yetkili Kotalarını Ayarla. Her yetkili rolü için ayrı limit girilir, virgülle (örnek: 4,3,2; 0 = sınırsız).

\- \*\*Çalışma:\*\*

&#x20; - Üyede rol yoksa verir, varsa alır.

&#x20; - Kişisel kota dolunca: "Bu komut için kişisel rol verme kotanızı doldurdunuz".

&#x20; - Sunucu kotası dolunca da ayrı bir uyarı verilir.

\- \*\*Koruma:\*\* Bu roller sağ tıkla elle verilirse otomatik geri alınır. "Manuel İşlem Engellendi" logu düşer (`CustomRoleGuard`).

\- \*\*`.rolbilgim` / `/rolbilgim`:\*\* Yetkilinin kullanabildiği özel komutları ve kalan kotasını gösterir.



\## 12. Rol Yönetim Araçları



\*\*Durum:\*\* ⬜



\- \*\*`.rol-ver` / `.rol-al`, `/rolver` / `/rolal`:\*\* Akıllı menüyle tek kişiye veya topluluğa rol verir ya da alır.

&#x20; - \*\*Yetkili modu:\*\* Kullanıcı seç, rol seç, onayla.

&#x20; - \*\*Yönetici modu, toplu işlem:\*\*

&#x20;   - Hedef seçenekleri: Herkes, Sadece Rolsüzler, Ses Kanalında Bulunanlar / Bulunmayanlar, Çevrimiçi / Çevrimdışı Kullanıcılar.

&#x20;   - "Botları Dahil Et" seçeneği.

&#x20;   - İsteğe bağlı olarak hedef rol grupları ve ses kanalları seçilir.

&#x20; - Yetki: `Roles.RolVer\_Staff`.

\- \*\*`.rolsüz-ver`:\*\* Üye rolü olmayan ve cezası bulunmayan herkese üye rolü verir.

\- \*\*`.rolizin` / `/rolizin`:\*\* Rollerin kanal izinlerini toplu ayarlar.

&#x20; - Önce roller, sonra isteğe bağlı kategoriler seçilir.

&#x20; - Discord'daki tüm izinler sayfalı listeden seçilir: Kanalı Gör, Mesaj Gönder, Sese Bağlan, Konuş, Yayın Aç, Timeout At, Anket Gönder ve diğerleri (50'den fazla izin).

&#x20; - Her izin için İzin Ver, Yasakla veya Sıfırla seçilir.

\- \*\*`.copycategory` / `/copycategory`:\*\* Kategoriyi tüm kanalları ve izinleriyle hemen altına kopyalar.

\- \*\*`.rol-log` / `/rollog`:\*\* Bir üyenin rol geçmişini (kim, ne zaman, hangi rolü verdi veya aldı) sayfalı gösterir.

&#x20; - Filtreler: rol filtresi, yetkili filtresi, filtreleri sıfırla.

&#x20; - Sayfaya atlama menüsü var.

&#x20; - Rol değişiklikleri arka planda kayda yazılır.



\## 13. Rol Butonları



\*\*Durum:\*\* ⬜



\- \*\*`/rolbutonu-oluştur`:\*\* Bir düğme kimliği (custom\_id), rol, işlem ("Sadece Rol Ver" veya "Sadece Rol Al") ve bildirim mesajı ile kural oluşturur. Düğme, Mesaj Oluşturucu'da (Bölüm 39) bu kimlikle eklenir.

\- \*\*`/rolbutonu-düzenle`\*\*, \*\*`/rolbutonu-liste`\*\*, \*\*`/rolbutonu-sil`\*\*.



\## 14. Sunucu Kayıtları (Log Sistemi)



\*\*Durum:\*\* ⬜



Her olay V2 formatında "Detaylar" bölümüyle ilgili log kanalına yazılır.



| Olay | Log Kanalı |

|---|---|

| Mesaj Silindi, Mesaj Düzenlendi | MessageLog |

| Kanal Oluşturuldu, Silindi, Güncellendi | ChannelLog |

| Rol Oluşturuldu, Silindi, Güncellendi | RoleLog |

| Katılım Sağlandı, Ayrıldı | MemberLog |

| Rol Verildi, Rol Alındı | MemberLog |

| İsim Değişikliği | NameLog |

| Emoji Oluşturuldu, Silindi, Güncellendi | EmojiLog |

| Sunucu Güncellendi | ServerLog |

| Davet oluşturma ve silme | InviteLog |

| Komut kullanımı | CommandLog |

| Ses giriş, çıkış ve taşınma | VoiceLog (Bölüm 15) |



\## 15. Ses Kayıtları



\*\*Durum:\*\* ⬜



\- Ses kanalına girme, çıkma, kanal değiştirme, mikrofon ve kulaklık kapatma olayları kaydedilir ve VoiceLog kanalına yazılır.

\- \*\*`.seslog` / `/seslog`:\*\* Üyenin hangi ses kanallarında ne kadar kaldığını sayfalı döker. Yetki: Warn\_Staff.



\## 16. İstatistik Sistemi



\*\*Durum:\*\* ⬜



\### Toplanan Veriler



Günlük kayıt tutulur:



\- Mesaj sayısı (kanal bazlı)

\- Ses süresi (kanal ve kategori bazlı, açık ses kanalları ayrı)

\- Yayın ve kamera süresi

\- Davet sayısı

\- Partner, bump, saygınlık

\- Coin



Ses ve yayın oturumları bot yeniden başlasa da kaybolmaz.



\### Komutlar



\- \*\*`.stat` / `/stat`:\*\* Kişisel istatistik paneli.

&#x20; - Tarih aralığı: Bugün, Bu Hafta, Son 30 Gün, Tüm Zamanlar.

&#x20; - Veri türü: Genel İstatistikler, Partner Verileri, Yetkili Verileri, Vampir Köylü, Monopoly.

&#x20; - Görsel kartta MESAJ, SES SÜRESİ, BAKİYE, DAVET, YAYIN SÜRESİ ve SAYGINLIK alanları var.

\- \*\*`.grafik` / `/grafik`:\*\* Son bir haftalık aktiflik grafiği. Sunucu veya kullanıcı için.

\- \*\*`.rank` / `/rank`:\*\* Seviye ve rütbe kartı. Arka plan resmi değiştirilebilir.

\- \*\*`.arkaplan` / `/arka-plan`:\*\* Mesaj veya ses seviyesi 50 ve üzeri olanlar rank kartı arka planını değiştirebilir. `sıfırla` ile eski haline döner.

\- \*\*`.sıralama` / `/leaderboard`:\*\* Sıralamalar.

&#x20; - Kategoriler: Ses, Mesaj, Yayın, Yetkili XP, Görev, Invite, Partner, Saygınlık, Yetkili İşlem, Yetkili Puan, Coin, Vampir Köylü, Monopoly Zafer.

&#x20; - Zaman: Genel, Haftalık veya özel süre (örnek: 3d, 1w, 2m).

&#x20; - Rol ile filtrelenebilir. Sayfalıdır.

\- \*\*`.rol-denetim` / `/roldenetim`:\*\* Bir roldeki üyelerin o haftaki toplam aktifliği.

&#x20; - Gruplar: Tüm Üyeler, Aktif Üyeler, Seste Olanlar, Seste Olmayanlar, Aktif \& Seste Olmayanlar.

&#x20; - Yetki: StatsStaffs.

\- \*\*`.detay-denetim` / `/detaydenetim`:\*\* Bir rolün üyelerini seçmeli filtrelerle çok detaylı denetler.



\## 17. Seviye (Level) Sistemi



\*\*Durum:\*\* ⬜



\- Mesaj seviyesi ve ses seviyesi ayrı tutulur.

\- \*\*Seviye atlama:\*\*

&#x20; - Görsel seviye kartı oluşturulur.

&#x20; - Log kanalına mesaj gider: "Tebrikler {user}! Mesaj seviyen yükseldi: \*\*{oldlevel}\*\* ➔ \*\*{newlevel}\*\* 🎉". Ses için 🎤 ile benzer metin.

&#x20; - Seviye başına coin ödülü verilir (varsayılan 100).

\- \*\*Seviye rolleri:\*\* Belirli mesaj veya ses seviyesine gelince otomatik verilir.

\- \*\*Rol koruması (`Level.RoleGuard`):\*\* Seviye rolünü hak etmeyenden geri alır.

\- \*\*Panel (`/levelayar`, `.levelayar`):\*\*

&#x20; - Mesaj Level Log Kanalı, Ses Level Log Kanalı.

&#x20; - Rol Ekle: rol + mesaj leveli + ses leveli.

&#x20; - Rol Sil, Rolleri Sıfırla, Yenile.

\- \*\*`.levelcoinayarla`:\*\* Geçmiş seviye coinlerini sıfırlayıp mevcut seviyeye göre yeniden hesaplar. Tek kullanıcı ya da "hepsi" için.



\## 18. Davet Takibi



\*\*Durum:\*\* ⬜



\- Kim kimi davet etti takip edilir. Davet kodları önbellekte tutulur.

\- Girişte davet edene `Economy.InviteCoin` (varsayılan 25) coin verilir. Ayrıca:

&#x20; - Çekiliş davet şartı ilerler.

&#x20; - Yetkili görevi `INVITE` ilerler.

&#x20; - Üye claim kaydı açılır (Bölüm 26).

\- Çıkışta davet sayısı düşer. Claim kanalındaki kayıt güncellenir.

\- \*\*`.davet` / `/davet`:\*\* Davet sayısını ayrıntılı gösterir.



\## 19. Tag ve TagBan Sistemi



\*\*Durum:\*\* ⬜



\- \*\*Sunucu tagı (klan tagı) rolü:\*\*

&#x20; - Discord'un "sunucu etiketi" özelliğini sunucunun etiketiyle taşıyana `Roles.Tag` verilir. Bırakınca alınır.

&#x20; - Tag alınınca `Channels.Tag` kanalına "Ailemize Katıldı!" mesajı, klan rozetiyle birlikte gönderilir.

&#x20; - 3 dakikada bir tüm üyeler taranır. Profil değişiminde anında çalışır.

\- \*\*TagBan, yasaklı sunucu etiketleri:\*\*

&#x20; - Başka (yasaklı) bir sunucunun etiketini taşıyan üyeye işlem uygulanır: "rol" (yasaklı tag rolü verilir, tag rolü alınır) veya "ban".

&#x20; - Üyeye DM gider. Varsayılan metin: "⚠️ \*\*{guild}\*\* sunucusunda yasaklı bir sunucunun tagını ({tag}) taşıdığınız tespit edildi. Bu nedenle {action} işlemi uygulandı."

&#x20; - Etiketi bırakınca yasaklı tag rolü alınır, üye rolü geri verilir.

&#x20; - Sahipler muaftır.

\- \*\*Panel (`.tagban`, `/tagban`):\*\*

&#x20; - Sistem aç/kapa, işlem tipi (rol veya ban), yasaklı tag rolü, log kanalı.

&#x20; - Sunucuları Yönet: Sunucu Ekle (ID veya davet bağlantısı, sunucu adı), Sunucu Kaldır.

\- \*\*`.findguild` / `/findguild`:\*\* Bir kullanıcının taşıdığı sunucu etiketinin hangi sunucuya ait olduğunu gösterir ("Klan Bilgisi").



\## 20. Booster Sistemi



\*\*Durum:\*\* ⬜



\- \*\*Boost basılınca:\*\* Kutlama mesajı gönderilir. Varsayılan metin: "🎉 {member} sunucumuza boost bastı! Teşekkürler! Sunucumuz şu an \*\*{boostCount}\*\* boosta ulaştı. 🚀".

\- \*\*Boost çekilince:\*\* Özel renk rolleri alınır, üyeye DM gider. 10 dakikada bir periyodik kontrol de yapılır.

\- \*\*Booster özel rolleri:\*\* Onaylanan booster başvurularına özel rol açılır. Boost çekilince veya üye ayrılınca rol silinir.

\- \*\*Panel (`/boostayar`):\*\* Kutlama Kanalı Ayarla, Log Kanalı Ayarla, Ödül Rolleri Seç, Mesajı Ayarla ({user}, {server}), Ödül Coin Ayarla, Sistemi Sıfırla, Yenile.



\## 21. Ekonomi ve Market



\*\*Durum:\*\* ⬜



\- \*\*Para birimi:\*\* Adı ve emojisi ayarlanabilir.

\- \*\*Kazanım:\*\*



&#x20; | Kaynak | Varsayılan |

&#x20; |---|---|

&#x20; | Mesaj başına | 0.1 |

&#x20; | Ses saati başına | 0.1 |

&#x20; | Davet başına | 25 |

&#x20; | Seviye başına | 100 |

&#x20; | Günlük ödül | Min-max aralığı (formdan) |



\- \*\*Ceza kesintileri:\*\* Mute, jail ve ban alanlardan coin kesilir. Miktarlar ayarlanabilir.

\- \*\*`.coin` / `/coin`, ekonomi paneli:\*\*

&#x20; - Bakiye gösterilir.

&#x20; - Mağaza: ürün seçilip satın alınır.

&#x20; - Siparişlerim, Paneli Kapat.

\- \*\*Market düzenleme (`.marketdüzenle`, `/marketdüzenle`):\*\*

&#x20; - Ürün Ekle: ad, fiyat, benzersiz ID.

&#x20; - Rol Ekle: rol ID'si ve süre (gün, 0 = süresiz).

&#x20; - Düzenle, Ürün Sil.

\- \*\*Süreli rol ürünleri:\*\* Süresi dolunca 5 dakikalık kontrolde rol alınır. Süresi devam ederken rol elle alınsa geri verilir.

\- \*\*Siparişler (`.siparişler`, `/siparisler`):\*\* Yetkili siparişi seçer, "Teslim Edildi" ya da "İptal Et" der.

\- \*\*Panel (`/ecoayar`):\*\* Log Kanalı, Market Kanalı, Kazanım Oranları, Ceza Kesintileri, Para Birimi İsmi, Yetkili Rolü Ekle/Çıkar, Sistemi Sıfırla, Yenile.

\- \*\*Blackjack:\*\* Kodda var (Kart, Dur, Double, Böl, Garanti Oyun / Riskli Oyun, Çekil). Hangi komuttan açıldığı kaynakta net değil.



\## 22. Coin Soru Oyunları



\*\*Durum:\*\* ⬜



\- Belirlenen kanalda (`Economy.QuestionChannel`) her 30 dakikada bir küçük bir oyun çıkar. İlk bilen `QuestionReward` (varsayılan 5) coin kazanır.

\- \*\*Oyun türleri:\*\*

&#x20; - Yazılı soru

&#x20; - REFLEX: ilk basan kazanır

&#x20; - BUTTON\_MATH: doğru cevabın düğmesine bas

&#x20; - CHESTS: doğru sandığı seç

\- Görseller canvas ile çizilir.



\## 23. Çekiliş



\*\*Durum:\*\* ⬜



\- \*\*Panel (`.çekiliş`, `/cekilis`):\*\* Çekiliş Oluştur, Şartlı Çekiliş, Kazananı Tekrarla, Çekiliş Bitir.

\- \*\*Normal çekiliş formu:\*\* Ödül, kazanan sayısı, süre (s, m, h, d).

\- \*\*Şartlı çekiliş:\*\* Önce Ana Ayarlar (ödül, süre, kazanan) girilir. Sonra şartlar eklenir, en sonda Çekilişi Başlat veya İptal Et.



&#x20; | Şart | Ölçüt |

&#x20; |---|---|

&#x20; | Mesaj Şartı | Çekiliş süresince atılan mesaj |

&#x20; | Ses Şartı | Ses süresi (örnek: 2h, 30m) |

&#x20; | Oy Şartı | Oy sayısı (Bölüm 32) |

&#x20; | Yorum Şartı | Yorum sayısı (Bölüm 32) |

&#x20; | Davet Şartı | Davet sayısı |

&#x20; | Sadece Yetkili Geçişi | Sadece yetkililer katılabilir |



\- \*\*Katılım:\*\*

&#x20; - Mesajda "Katıl (sayı)" düğmesi var.

&#x20; - Tekrar basan "Çekilişten Ayrıl" onayı görür (Evet, Ayrıl).

\- \*\*Sona erince:\*\* "Çekiliş Sona Erdi!" mesajı gönderilir. Kazananlar etiketlenir.

\- \*\*Tekrarla:\*\* Bitmiş bir çekiliş seçilir, kaç kişi seçileceği girilir.

\- Çekilişler bot yeniden başlasa da devam eder.



\## 24. Etkinlik Sistemi



\*\*Durum:\*\* ⬜



\- \*\*Panel (`.event`, `/etkinlik`):\*\* Etkinlikler menüden seçilir. "Yeni Etkinlik Oluştur" taslak açar.

\- \*\*Etkinlik ayarları:\*\*

&#x20; - Detay/Açıklama formu: isim, Discord takvim açıklaması, kanal duyuru metni, zamanlama (örnek: 30.04 20:30), kapak görseli.

&#x20; - Kanallar: etkinlik yöneticisi, ana etkinlik ses kanalı, alt kanallar (çoklu seçim), duyuru kanalı.

&#x20; - Şablonlar: kayıtlı şablon yüklenir, Şablon Kaydet ile ortak havuza kaydedilir.

&#x20; - Sağırlaştırma kontrolü (kulaklığı kapalı olan sayılmaz) ve otomatik başlat seçenekleri.

&#x20; - Duyur ve Başlat, İptal Et/Sil, Etkinliği Bitir, Alt Kanal Ekle/Sil, Yönetici Değiştir, Aktif Katılımcılar.

\- \*\*Discord takvimi:\*\* Discord'un "Etkinlikler" bölümünde planlanmış etkinlik açar. Zamanı gelince başlatır.

\- \*\*Katılımcı takibi:\*\*

&#x20; - Ana ve alt kanallardaki üyeler 30 saniyede bir sayılır, dakikaları biriktirilir.

&#x20; - Bitişte katılımcıya 15, yöneticiye 30 coin verilir.

&#x20; - Katılımcı listesi etkinlik loguna yazılır.

\- \*\*Yetkili görevleri\*\* ⬜: `EVENT\_MANAGE` ve `EVENT\_PARTICIPATE`.

\- \*\*Etkinlik Cezalı:\*\* Bkz. Bölüm 2. Cezalı üye etkinliklere giremez.



\## 25. Yetkili Görev ve XP Sistemi



\*\*Durum:\*\* ⬜. Eski botun en büyük sistemi. Yetkililer görev yaparak XP kazanır, XP ile rütbe atlar.



\### Rütbeler (`StaffRoleSystem`)



Her rütbe için şu ayarlar tutulur:



\- Rütbe adı, rol, gereken XP, sıra

\- \*\*Oto atlama:\*\* Açıksa XP yetince kendisi terfi eder.

\- \*\*Ek roller (milestone):\*\* Rütbeyle birlikte verilen roller.

\- \*\*Maks sunucu işi XP'si\*\*

\- \*\*XP çarpan rolleri:\*\* Rütbeye özel.

\- \*\*Sorumluluk limiti ve cezası:\*\* Fazla sorumluluk rolü alan yetkilinin XP çarpanı düşer.

\- \*\*Zorunlu hafta sayısı:\*\* Terfi için kaç hafta zorunlu görev tamamlanmalı.



\*\*Terfi kuralları:\*\*



\- XP yeterliyse ve zorunlu görev haftaları tamamlandıysa oto terfi yapılır.

\- Alt rütbeler alınır, üst rütbenin rolleri ve ek rolleri verilir.

\- PromotionLog'a "Otomatik Rütbe Atlama" kaydı düşer.

\- Oto atlama kapalıysa "Yetkiyi Yükselt" düğmesiyle manuel terfi yapılır.



\### Görevler (`TaskSettings`)



\- \*\*Görev alanları:\*\* ad, kategori, hedef adet, XP ödülü, izinli roller, yenilenme (Günlük, Haftalık veya Yok), rol bazlı limitler.

\- \*\*Rol bazlı limitler:\*\*

&#x20; - Ana limit: tam XP.

&#x20; - Esneme limiti: yarım XP. Esneme limitinden sonrası 0 XP.

\- \*\*Kategoriler:\*\*



&#x20; | Kategori | Ne Sayılır |

&#x20; |---|---|

&#x20; | MESSAGE | Sohbet kanalında mesaj |

&#x20; | VOICE | Ses süresi |

&#x20; | PUBLIC\_VOICE | Açık ses kanallarında süre |

&#x20; | STREAM | Yayın süresi |

&#x20; | INVITE | Davet |

&#x20; | TICKET | Talep kapatma |

&#x20; | PARTNER | 50 karakter üstü ve bağlantı içeren partner mesajı |

&#x20; | BUMP | Bump |

&#x20; | VOTE | Oy |

&#x20; | REVIEW | Yorum (12 saat bekleme) |

&#x20; | EVENT\_MANAGE | Etkinlik yönetme |

&#x20; | EVENT\_PARTICIPATE | Etkinliğe katılma |

&#x20; | THREADS | Thread veya forum gönderisi |

&#x20; | EVIDENCE | Kanıt denetimi |

&#x20; | RECRUIT | Yetkili alımı |

&#x20; | ORIENTATION | Oryantasyon |

&#x20; | REGISTER | Kayıt |

&#x20; | OTHER | Diğer |



\- \*\*Atama:\*\* Her yetkiliye her kategoriden rastgele bir uygun görev atanır. Yetkiliye uygun olmayan kategoriler (sorumlusu olmadığı etkinlik, partner, ticket, alım) atlanır. Atama 30 dakikada bir tazelenir.

\- \*\*İlerleme:\*\* Görev tamamlanınca XP verilir, yeni görev atanır. Artan ilerleme bir sonraki göreve aktarılır.



\### Zorunlu Görevler (`MandatoryTaskConfig`)



\- Her rütbe için haftalık ses, açık ses, mesaj ve davet hedefi tanımlanır.

\- \*\*Esnetme:\*\* Genel yüzde, plan bazlı yüzdeler, rol bazlı yüzde veya sabit ekleme. Bazı yetkililerin hedefi düşürülebilir ya da artırılabilir.

\- Haftalık tamamlanma kaydı tutulur. Terfide kullanılır.



\### XP Çarpanları



\- Rütbe çarpan rolleri

\- Genel XP çarpanları (`StaffGlobalSettings`)

\- Haftanın en iyi yetkilisi çarpanı

\- Sorumluluk fazlası cezası

\- Pasif mesaj ve ses XP'si günlük sınırlıdır.



\### Yönetim Paneli (`/panel`)



\- \*\*Görev Yönetimi:\*\* Yeni Görev, Düzenle, Sil, Kategori Rolleri. Kategori rolleri: Ticket, Etkinlik, Partner ve Alım için Sorumlular ve Yöneticiler.

\- \*\*Rütbe Ayarları:\*\* Yeni Rütbe (rütbe adı, rol ID, gereken XP, oto atla, maks sunucu işi XP'si), Rütbeyi Düzenle, Rütbe Sil.

\- \*\*Rütbe Profili \& Detay Yönetimi:\*\* Rütbe bazında zorunlu görev hedefleri, görev limitleri, esnetme planları, XP çarpanları ve sorumluluk limiti/cezası.

\- \*\*Claim Ayarları:\*\* Bkz. Bölüm 26.

\- \*\*XP Dağıt / Ver:\*\* Kullanıcıya, role veya herkese. Miktar sayı ya da yüzde olabilir. "Sunucu işi XP'si mi" ve sebep girilir. Direkt XP ayarı da yapılabilir.

\- \*\*Coin Dağıt / Ver:\*\* Kullanıcıya, role veya herkese.

\- \*\*Rol Entegrasyonu (Sync):\*\* Rütbe rolleriyle veritabanını eşitler.

\- \*\*Haftanın En İyi Yetkilisi:\*\* Duyuru kanalı, ödül rolü, ödül XP'si, XP çarpanı, ödül coin, çalışma saati.

\- \*\*Sorumluluk Rolleri, Esnetme Rolleri (planlar), XP Çarpanları (rol + çarpan).\*\*



\### Yetkili Komutları



\- \*\*`.görev` / `/görevlerim`:\*\*

&#x20; - Görsel görev kartı: aktif görevler, zorunlu görev durumu (genel ses, açık ses, mesaj, davet), rütbe ilerlemesi.

&#x20; - Düğmeler: "Limit Sistemi Nedir?", "Güncel Limitlerim".

\- \*\*`/görevsorgula`:\*\* Bir yetkilinin görev ve XP geçmişi. İstatistik paneli ve sayfalı geçmiş işlemler.

\- \*\*`.görevdenetim` / `/denetim`:\*\*

&#x20; - Bir yetkiliyi veya tüm rütbeyi denetler.

&#x20; - Kişi başına düğmeler: Yükselt, Düşür, Sabit, Görev Tamamladı, Sıfırla.

&#x20; - Sayfalı, Paneli Kapat düğmesi var.

\- \*\*`.denetimtest`:\*\* Denetim kartı önizlemesi.



\### Haftanın En İyi Yetkilisi (iki haftada bir)



\- Pazartesi, ayarlanan saatte son 14 günde en çok XP kazanan yetkili seçilir.

\- Ödül rolü, XP, coin ve çarpan verilir. Duyuru kanalına mesaj gider.

\- Rol bir önceki kazanandan alınır.



\### Ölü Ayarlar ⚫



\- `AutoStaff`: aktif üyelere otomatik "yetkili ol" DM'i. Ayarı var, kodu yok.

\- `StaffControl`: günlük yetkili kotası, uyarı ve kilit. Ayarı var, kodu yok.



\## 26. Üye Claim Sistemi



\*\*Durum:\*\* ⬜



\- Yeni katılan üye için claim kanalına (`ClaimDropChannel`) "Claim Durumu" kartı düşer. Kartta \*\*Chat Claim Al\*\* ve \*\*Ses Claim Al\*\* düğmeleri var.

\- Chat veya Ses sorumlusu yetkili, üyeyi üstlenir ("{yetkili} Üstlendi").

\- Üyenin mesaj ve ses ilerlemesi claim'e işlenir.

&#x20; - XP: mesaj başı ve dakika başı.

&#x20; - Sınırlar: maks mesaj 100, maks ses 60 dakika.

&#x20; - Hedefe ulaşınca yetkili XP alır.

\- \*\*`.claims` / `/claims`:\*\* Aktif claimler. Her biri için Bırak, Devret (yetkili ID'si ve sebep), Kapat.

\- Süresi dolan claimler otomatik düşer. Sonuçlar `ClaimLog`'a yazılır.

\- \*\*Ayarlar (`/panel` > Claim Ayarları):\*\* Gereken ses ve mesaj, XP ödülü, maksimum claim sınırı, bildirim kanalı, havuz kanalı.



\## 27. Yetkili Alım: Claim, Oryantasyon, Yetki Taşıma



\*\*Durum:\*\* ⬜



\- \*\*`.ytclaim` / `/ytclaim`:\*\*

&#x20; - Yeni alınan bir yetkiliyi 6 saat içinde kendine claimler. Hedefe onay/red düğmeleri gider.

&#x20; - Alım sorumlularına ve alım seviyelerine bağlıdır. Seviye rolleri ayarlanabilir (örnek: "Seidosha", "Hoideshi").

&#x20; - `RECRUIT` görevini ilerletir.

\- \*\*`.oryantasyon` / `/oryantasyon`:\*\* Yeni yetkiliyle aynı ses kanalında en az 3 dakikalık oryantasyon başlatır veya bitirir. `ORIENTATION` görevini ilerletir.

\- \*\*`.yetki-taşı` / `.yetkitasi` / `/yetkitasi`:\*\* Bir kullanıcının yetki rollerini başka kullanıcıya taşır. Kaynak kullanıcı üye rollerine indirilir.



\## 28. Başvuru Panelleri



\*\*Durum:\*\* ⬜



\- \*\*`/başvuru-oluştur`:\*\* Panel adı, düğme ID'si, sorular (| ile ayrılmış), onaylayacak roller, onayda verilecek roller, toplam süre (dakika).

\- \*\*Başvuru akışı:\*\*

&#x20; - Başvuran düğmeye basar. Sorular tek tek DM'den sorulur: "Soru 1/5" ve devamı.

&#x20; - Bitince yetkili kanalına özet düşer. Düğmeler: \*\*Onayla\*\*, \*\*Reddet\*\* (sebep formu).

&#x20; - Onayda roller verilir. Sonuç başvurana bildirilir.

\- \*\*Diğer komutlar:\*\* `/başvuru-düzenle`, `/başvuru-sil`, `/başvurular` (aktif paneller), `/başvuru-temizle` (bir kullanıcının başvurularını sıfırlar).



\## 29. Yetkili Değerlendirme



\*\*Durum:\*\* ⬜



\- Talep kapanınca kullanıcıya DM ile değerlendirme formu gider.

&#x20; - 1 ile 5 yıldız arası menüden puan seçilir.

&#x20; - "Yorum Ekle" ile form açılır.

&#x20; - "Değerlendirmeyi Tamamla ve Gönder" ile bitirilir.

\- Sonuç `Channels.StaffRating` kanalına düşer.

\- \*\*`.staffrating` / `/staffrating`:\*\* Bir yetkilinin değerlendirmelerini sayfalı listeler ("Yetkili Değerlendirmeleri").



\## 30. Birebir (1E1) Görüşme Sistemi



\*\*Durum:\*\* ⬜



Yöneticilerin kendi ekiplerindeki yetkililerle haftalık görüşme yapıp rapor girdiği sistem.



\- \*\*`.birebir` / `/1e1`:\*\* Rol ve duruma göre panel açar.

\- \*\*Yönetici paneli:\*\*

&#x20; - Canlı Sesli 1E1 Başlat: aynı ses kanalındaki yetkili seçilir, süre tutulur.

&#x20; - Görüşmeyi Bitir \& Rapor Gir.

&#x20; - Manuel Rapor Gir, Yetkili Notları \& Karnesi, Geçmiş Raporlar.

\- \*\*Rapor formu:\*\*

&#x20; - Görüşülen yetkili

&#x20; - Genel durum: Çok İyi, İyi, Normal, Sorunlu, Kritik

&#x20; - Haftalık performans: 1 ile 5 yıldız

&#x20; - Durum ve değerlendirme metni

&#x20; - Gizli yönetici notu

\- \*\*Yetkili karnesi:\*\* Ekip bilgisi, performans ve görev özeti, değerlendirme karnesi, yöneticiye özel gizli notlar. "Gizli Not Ekle" düğmesi var.

\- \*\*Yönetim paneli (üst yönetim):\*\*

&#x20; - Yetkili Ata / Ekipten Çıkar, Yetkili Taşı (başka yöneticiye).

&#x20; - Yönetici Analizleri: haftalık genel ilerleme yüzdesi, yönetici bazlı ekip durumları.

&#x20; - Sistem Ayarları: 1E1 yönetici rolleri, rapor/log kanalı, yönetici başı maksimum yetkili kotası, haftalık 1E1 XP ödülü (iki tarafa da).

\- \*\*Otomatik:\*\* 30 dakikada bir kontrol yapılır. Haftalık özet raporu ("Yönetici Bazlı Sonuçlar") ve yöneticilere hatırlatma gönderilir. Sesten çıkınca "Görüşmeyi Raporla" düğmesi gelir.



\## 31. Partner Sistemi



\*\*Durum:\*\* ⬜



\- \*\*Panel (`/partner`):\*\*

&#x20; - Düğmeler: Stat Düzenle, Ban / Unban, Listeyi Aç, TR Panel Kur, Global Panel Setup, Mesajı Düzenle, Reklam Metnini Düzenle.

&#x20; - \*\*Stat Düzenle:\*\* Bir üyenin partner sayısını artırır ya da azaltır (+1/-1).

&#x20; - \*\*Ban / Unban:\*\* Bir sunucuyu davet bağlantısıyla partnerlikten yasaklar. Liste sayfalıdır. Her kayıt için Ban Kaldır ve Sebep Düzenle var.

&#x20; - \*\*Listeyi Aç:\*\* Partner sunucular sayfalı listelenir.

\- \*\*Başvuru panelleri:\*\* "🇹🇷 Partner Yap" (Türkçe) ve "🌐 Apply for Global Partner" (İngilizce).

&#x20; - Başvuran reklam metnini formdan gönderir.

&#x20; - Partner yöneticilerine düşer. Düğmeler: İlgilen, Sunucuya Git, Onayla, Reddet (sebep formu), Önizle.

&#x20; - Onaylanınca sunucunun reklamı partner kanalına atılır. Başvurana bizim reklam metnimiz verilir.

\- \*\*Partner sayacı:\*\* Partner kanalına 50 karakter üstü ve bağlantı içeren mesaj atan yetkiliye partner sayılır. Arkasından teşekkür mesajı gönderilir.

&#x20; - TR metni: "Partnerlik yaptığın için teşekkür ederiz, Toplam partner sayın, Haftalık partner sayın, Bu haftaki sıralaman".

&#x20; - Global için İngilizce karşılığı var.

&#x20; - Partner görsel kartı (canvas) var.

\- Partner kanalındaki eski bot mesajları açılışta temizlenir.



\## 32. Bump, Oy ve Yorum Takibi



\*\*Durum:\*\* ⬜



\- \*\*Bump:\*\* Disboard'un "Öne çıkarma başarılı!" mesajı algılanır. Bump atan:

&#x20; - `BUMP` görevi ve istatistik +1 alır.

&#x20; - Bump log kanalına kaydedilir.

&#x20; - Teşekkür mesajı alır.

\- \*\*Bump hatırlatıcısı:\*\* Ping rolleri ayarlıysa 2 saat sonra hatırlatma gönderilir. Bot yeniden başlasa da hatırlatma kaybolmaz.

\- \*\*Oy:\*\* Belirli bir oy botunun "oy verdi / voted" mesajı algılanır. `VOTE` görevi ve çekiliş oy şartı ilerler.

\- \*\*Yorum:\*\* Yorum mesajları sayılır. `REVIEW` görevi (12 saat bekleme) ve çekiliş yorum şartı ilerler.

\- Bot ve kanal kimlikleri kodda sabit. Taşırken ayara çevrilmeli.



\## 33. Özel Odalar (Private Rooms)



\*\*Durum:\*\* ⬜



\- \*\*Odaya girince oda açma:\*\* "Oda oluştur" ses kanalına giren üyeye kendi odası açılır.

&#x20; - Varsayılan kişi sınırı 5.

&#x20; - Boş kalınca 60 saniye sonra silinir.

&#x20; - 5 saniye spam koruması var.

\- \*\*Oda paneli:\*\*

&#x20; - Profil seç: kullanıcı başı en fazla 3 kayıtlı oda profili.

&#x20; - Kanal moderatörleri, kanala girebilecekler, kanaldan yasaklılar, odadan at.

&#x20; - İsim Değiştir, Limit (0-99), Kilitle/Aç, Kamera İzni, Yönetici Koruması.

\- \*\*Profiller:\*\* Odanın ayarları profil olarak kaydedilir, sonraki odada otomatik uygulanır.

\- Açılışta sahipsiz odalar temizlenir. Odaya geri dönen kullanıcıya izinleri geri verilir.

\- \*\*Panel (`/privateayar`):\*\* Ana Ses Kanalı Yap, Kategori Yap, Sistemi Sıfırla, Yenile.



\## 34. Kalıcı Odalar ve Ekipler



\*\*Durum:\*\* ⬜



\- \*\*Başvuru:\*\* Oda/ekip adı ve ekip üyeleri seçilir. En az 4 üye gerekir.

&#x20; - Başvuru yöneticilere düşer: Onayla, Reddet.

&#x20; - İsteğe bağlı oda açma ücreti (coin) alınır.

\- \*\*Oda sahibi paneli (`.kalıcıoda`, `/kalicioda`):\*\*

&#x20; - İsim değiştir, limit, kilit, kamera izni.

&#x20; - Üye ekle, üye çıkar.

&#x20; - Ekip rolünü yönet: ekip rolü oluştur, isim ve renk değiştir, üyeleri eşitle, rolü sil.

&#x20; - Profil oluştur: birincil renk, ikincil renk.

\- \*\*Admin paneli:\*\* Odalar listesi, rol izni değiştirme, kilit açma, oda silme. Ayrıca sunucu istatistikleri ve "En Aktif Ekipler (Haftalık)".

\- \*\*Aktiflik kontrolü:\*\*

&#x20; - Haftalık minimum 60 dakika ses şartı var.

&#x20; - Altında kalan odaya "Kalıcı Oda Aktiflik Uyarısı" gider. Düğmeler: Odayı Sil, Odayı Silme.

&#x20; - Bu kontrol 1 ve 6 saatlik döngülerle yapılır.

\- Oda kanalında panel mesajı her zaman en altta tutulur.

\- \*\*Panel (`/permanentayar`):\*\* Ses Kanalı Yap, Kategori Yap, Log Kanalı Yap, Oda Açma Ücreti, Sistemi Sıfırla, Yenile.



\## 35. DM Forum (Modmail)



\*\*Durum:\*\* ⬜



\- Bota DM atan her kullanıcı için forum kanalında (`DmForum`) bir başlık açılır. Mesajlar webhook ile kullanıcının adı ve avatarıyla aktarılır.

\- Başlığa yazılan yetkili cevabı kullanıcıya DM olarak gider.

\- Mesaj düzenleme, tepki ekleme ve kaldırma iki yönde eşitlenir.

\- \*\*Kontrol kanalı (`DmControl`):\*\* Bir kullanıcı etiketlenirse ya da ID'si yazılırsa ona manuel DM başlığı açılır. DM'i kapalıysa uyarı verilir.



\## 36. Silinen Etiket Bildirimi



\*\*Durum:\*\* ⬜



\- Bir mesajda etiketlenen kişi, o mesaj 24 saat içinde silinirse DM ile bilgilendirilir.

\- \*\*"Etiket Bildirimi" içeriği:\*\* gönderen, kanal, mesaj tarihi, mesaj içeriği.

\- Mesajı bot sildiyse (örneğin Chat Guard) bildirim gönderilmez. Kanalı göremeyen kişiye de gönderilmez.



\## 37. AFK



\*\*Durum:\*\* ⬜



\- \*\*`.afk \[sebep]` / `/afk`:\*\* AFK moduna girilir.

&#x20; - AFK kişi etiketlenince sebebi gösterilir. Kişi tekrar yazınca AFK kalkar.

&#x20; - Yetkili, `/afk kullanıcı` ile birini AFK ses odasına taşıyabilir.

\- \*\*Ses AFK kontrolü:\*\* Açık ses kanallarında AFK duran üye AFK kanalına taşınır.



\## 38. Otomatik Mesajlar



\*\*Durum:\*\* ⬜



\- \*\*Panel (`/mesajlar`):\*\* Yeni Ekle, Düzenle, Sil, Aktif/Pasif, sayfalama, Tümünü Sil, Yenile.

\- \*\*Mesaj alanları:\*\*

&#x20; - Kanal ID

&#x20; - Saat (SS:DD)

&#x20; - Mesaj içeriği

&#x20; - Tekrar aralığı (saat; 0 = günlük)

&#x20; - Tekrar sayısı (0 = sınırsız)

\- 30 saniyede bir zamanı gelen mesajlar gönderilir.



\## 39. Mesaj Oluşturucu



\*\*Durum:\*\* ✅ (webde Components V2 tasarlayıcısı olarak var)



\- \*\*`/mesaj oluştur`, `/mesaj düzenle mesaj\_id`:\*\* Discord içinden V2 mesaj tasarlar.

\- \*\*Bileşenler:\*\*

&#x20; - Metin

&#x20; - Bölüm (küçük resim veya düğme aksesuarı)

&#x20; - Ayırıcı (çizgi, küçük/büyük boşluk)

&#x20; - Medya Galerisi (açıklamalı)

&#x20; - Dosya (spoiler)

&#x20; - Düğme Satırı (5 stil, emoji, URL veya custom ID)

\- \*\*İşlemler:\*\* Bileşen ekle, düzenle, sil, yukarı/aşağı taşı. Konteyner rengi ve spoiler ayarı. V2 kodunu al. Sıfırla. Kanal seçip gönder.



\## 40. Topluluk Komutları



\*\*Durum:\*\* ⬜



\- \*\*`/itiraf itirafınız`:\*\* İtiraf kanalına anonim olarak gönderilir, log kanalına gönderenle birlikte kaydedilir. İtiraf kanalına normal mesaj yazılırsa silinir.

\- \*\*`/doğum-günü kullanıcı \[not] \[fotoğraf]`:\*\* Özel doğum günü kartı (canvas) ile kutlama yapar.

\- \*\*`/respect kullanıcı` ve sağ tık "Saygı Duy":\*\* Bir kişinin saygınlık puanını +1 artırır. 12 saatte bir kullanılabilir. Kendine ve botlara verilemez.

\- \*\*`.avatar` / `/avatar`:\*\* Avatarı tam boy gösterir. "Tarayıcıda Aç" düğmesi var.

\- \*\*`.yardım` / `.syardım` / `/yardım`:\*\* Kategorili yardım menüsü. Yetkili yardımı ayrıdır.

\- \*\*`.emojiekle` / `/emojiekle`:\*\* Bağlantıdan veya başka sunucunun emojisinden sunucuya emoji ekler.

\- \*\*`/motive`\*\* ⚫: Sadece o sunucuya özel bir şaka yanıtı.



\## 41. Haftalık Ödüller ve Saygınlık



\*\*Durum:\*\* ⬜



\- \*\*Haftalık aktiflik ödülleri:\*\*

&#x20; - Her hafta en çok ses, mesaj ve yayın yapanlara ödül rolleri verilir. Varsayılan olarak her kategoride 5 kişi.

&#x20; - Alt sınırlar: ses en az 1 saat, mesaj en az 100, yayın en az 30 dakika.

&#x20; - Sonuçlar log kanalına "Haftalık Aktiflik Ödülleri" (Ses, Mesaj ve Yayın Birincileri) olarak gönderilir.

\- \*\*Haftalık saygınlık birincisi:\*\* En çok saygınlık alan kişiye özel rol (`Roles.ArthurMorgan`) verilir. "Haftalık Saygınlık Birincisi" duyurusu yapılır.



\## 42. Otorol



\*\*Durum:\*\* 🟡 (girişte otomatik rol ✅; periyodik tarama ⬜)



5 dakikada bir rolsüz kalan üyelere üye rolü verilir.



\## 43. Kelime Türetmece



\*\*Durum:\*\* ⬜



\- Belirlenen kanalda kelime zinciri oynanır. Her kelime bir önceki kelimenin son harfiyle başlamalıdır.

\- \*\*Kurallar:\*\*

&#x20; - Tek kelime, sadece Türkçe harfler.

&#x20; - Daha önce yazılmış kelime kabul edilmez.

&#x20; - Aynı kişi art arda yazamaz.

&#x20; - TDK'da bulunmalı. Sözlük kontrolü dış servisle yapılır.

&#x20; - 300. kelimeye kadar Ğ veya J ile biten kelime yasaktır ("Yasaklı Harf Kullanımı").

\- Zincir tıkanırsa sistem yeni kelimeyle yeniler ("Sistem Tıkandı, Yenileniyor!"). Bot yeniden başlarsa kaldığı yerden devam eder.



\## 44. Vampir Köylü



\*\*Durum:\*\* ⬜



\- \*\*`.vampir-köylü`:\*\* Lobi açar. Ses kanalı tabanlıdır, gece ve gündüz döngüsü var.

\- \*\*Kurulum ekranı:\*\*

&#x20; - Rol sayıları (+1/-1)

&#x20; - Gece, tartışma ve oylama süreleri (+15 / -15 saniye)

&#x20; - Ölenin rolünü göster

&#x20; - Doktor kendini korusun

&#x20; - Doktor mirası

&#x20; - Otomatik rol dağıtımı

&#x20; - Yapay zekâ bot ekleme (kaç bot)

&#x20; - Test modu

\- \*\*Roller:\*\*



&#x20; | Rol | Taraf | Yetenek |

&#x20; |---|---|---|

&#x20; | Köylü 🧑‍🌾 | İyi | Şüphelileri bulup gündüz asmak |

&#x20; | Doktor 🩺 | İyi | Her gece birini korur. Aynı kişiyi art arda koruyamaz |

&#x20; | Gözcü 👁️ | İyi | Gözetlediği kişiyi o gece kimlerin ziyaret ettiğini öğrenir |

&#x20; | Avcı 🎯 | İyi | Hedefi kötüyse hedef ölür, iyiyse Avcı ölür |

&#x20; | Aura ✨ | İyi | Hedefin İyi, Kötü veya Tarafsız olduğunu öğrenir |

&#x20; | Dedektif 🕵️ | İyi | Hedefin tam rolünü öğrenir |

&#x20; | İzci 🏹 | İyi | Hedefin o gece yaptığı hareketi öğrenir |

&#x20; | Tuzakçı 🪤 | İyi | Tuzak kurduğu kişiyi ziyaret eden herkes yakalanır |

&#x20; | Medyum 🔮 | İyi | Oyunda 1 kez ölü birini diriltir |

&#x20; | Vampir 🧛 | Kötü | Her gece 1 kişiyi öldürür |

&#x20; | Vampir Lordu 👑 | Kötü | Lider. Gece saldırılarına bağışık, araştırmada iyi görünür, her gece öldürür |

&#x20; | Alfa Kurt 🐺 | Kötü | Birini Çırak Kurt yapar (1 kez) veya öldürür |

&#x20; | Çırak Kurt 🐺 | Kötü | Seçtiği kişi ertesi gün yazamaz ve oy kullanamaz |

&#x20; | Şaman 🔮 | Kötü | Efsunladığı kişi o gece araştırılırsa kötü görünür |

&#x20; | Büyücü 🪄 | Kötü | Büyülediği kişi o gece yeteneğini kullanamaz |

&#x20; | Bombacı 💣 | Tarafsız | Bombaladığı kişi ertesi gece patlar |

&#x20; | Seri Katil 🔪 | Tarafsız | Aynı gece 2 kişi öldürür (2 tur bekleme). Gece saldırılarına bağışık |

&#x20; | Deli 🤪 | Tarafsız | Kendine yanlış rol gösterilir, araştırmaları yanlış çıkar |

&#x20; | Soytarı 🤡 | Tarafsız | Asılırsa oyunu kazanır |

&#x20; | Kundakçı 🔥 | Tarafsız | Benzin döker veya döktüğü herkesi aynı anda yakar |

&#x20; | Cellat 🪓 | Tarafsız | Verilen hedefi halk oylamasında astırmaya çalışır |

&#x20; | Rastgele İyi / Kötü / Tarafsız / Herhangi 🎲 | - | Havuzdan rastgele rol atar |



\- \*\*Gündüz:\*\*

&#x20; - Muhtar seçimi yapılır. Muhtar öldüğünde varis seçer.

&#x20; - Tartışmadan sonra asılacak kişi oylanır. "Pas Geç" seçeneği var.

\- \*\*Gece:\*\* Herkes rolüne göre menüden hedef seçer. Vampirler sabaha not bırakabilir.

\- \*\*Görseller:\*\* "BU GECE ÖLENLER", "OYLAMA SONUCU", "OYUN SONA ERDİ" görselleri ve profil kartı. Sıralamada ayrı kategori var.



\## 45. Monopoly



\*\*Durum:\*\* ⬜



\- \*\*`.monopoly`, `/monopoly`, `.cpoly`:\*\* En fazla 18 kişilik metin kanalı Monopoly oyunu.

\- \*\*Düğmeler:\*\* Oyuna Katıl, Ayrıl, Oyunu Başlat, İptal Et, Zar At, Satın Al ($), Geliştir ($), Hızlı Uçuş Yap, Turu Bitir, İflas Et.

\- Tahta görseli canvas ile çizilir.

\- \*\*`.monopoly-profil`:\*\* İstatistik ve rozetler. \*\*`.monopoly-top`:\*\* Zafer sıralaması.



\## 46. Oyun Lobisi ve Riot Hesapları



\*\*Durum:\*\* ⬜



\- \*\*Lobi paneli (`.lobi-panel`):\*\* Lobi Kur / Güncelle, Lobimi İptal Et.

\- \*\*Lobi kurma:\*\*

&#x20; - Oyun: League of Legends veya VALORANT.

&#x20; - Mod: Dereceli Tek/Çift, Dereceli Esnek, Derecesiz, ARAM, Arena / Dereceli, Derecesiz, Tam Gaz, Kopya, Özel Oyun.

&#x20; - Aranan roller:

&#x20;   - LoL: Top, Jungle, Mid, ADC, Support.

&#x20;   - Valo: Düellocu, Gözcü, Öncü, Kontrol Uzmanı.

&#x20;   - Fark Etmez.

&#x20; - Rank aralığı, kaç kişi arandığı, not.

\- \*\*Lobi mesajı:\*\*

&#x20; - Düğmeler: Lobiye İzin İste, Lobiden Ayrıl.

&#x20; - Lobi sahibi için: Kabul Et, Reddet, Oyuncu At.

&#x20; - Süresi biten lobiler temizlenir. Süre uzatılabilir.

\- \*\*Riot hesap bağlama (`.riot-panel`):\*\*

&#x20; - LoL veya Valorant için Riot ID (İsim#Etiket) girilir.

&#x20; - Doğrulama: LoL'de profil ikonunu değiştirme, Valo'da kart değiştirme.

&#x20; - Hesaplarım ekranında Hesabı Çıkar.



\## 47. Sahte Twitter



\*\*Durum:\*\* ⬜



\- Bir kanalda Twitter benzeri akış oluşturulur.

\- \*\*Tweet Oluştur:\*\* "Neler oluyor?" formundan yazılır.

\- \*\*Tweet düğmeleri:\*\* Beğen (sayı), Retweet (sayı; yorumlu retweet formu), Profil.

\- \*\*Profil:\*\* Biyografi Düzenle. Takipçi ve takip edilen sayısı gösterilir.

\- \*\*Sağ tık "Takip Et/Bırak":\*\* Kullanıcıyı takip eder veya bırakır.



\## 48. Müzik ve Radyo



\*\*Durum:\*\* ⬜



\- \*\*`.müzik` / `/müzik`, müzik paneli:\*\*

&#x20; - Radyo istasyonu seç, kayıtlı playlist seç, rastgele playlist çal.

&#x20; - Playlist Ekle (ad ve Spotify/YouTube bağlantısı), Playlist Sil.

&#x20; - Şarkıyı Geç, Ses Ayarla (0-100), Sistemi Durdur.

\- \*\*7/24 ses kanalı:\*\* Bot açılışta `BotVoiceChannel` kanalına girip radyo çalar. Varsayılan: PowerTürk.



\## 49. Sahip ve Bot Yönetim Araçları



\*\*Durum:\*\* 🟡 (bot profili webden yönetiliyor; diğerleri ⬜)



\- \*\*`.manage-bots`:\*\* Profil Fotoğrafını Değiştir, İsmini Değiştir, Banner Değiştir, Yeniden Başlat. toji bots'ta bu webden yapılıyor ✅.

\- \*\*`.eval`:\*\* Kod çalıştırma. Güvenlik nedeniyle taşınmamalı ⚫.

\- \*\*`.setup`, `.kurulum`:\*\* Bkz. Bölüm 1.

\- \*\*`.riot-panel`, `.lobi-panel`:\*\* Bkz. Bölüm 46.



\## 50. Arka Plan İşleri Özeti



| İş | Sıklık | Ne Yapar |

|---|---|---|

| Ceza süresi kontrolü | Sürekli | Süresi dolan cezaları kaldırır |

| Kanıt zaman aşımı | 1 dk | 5 dakikada kanıt eklenmeyen cezaları denetime düşürür |

| Restrict taraması | 1 dk | Sahiplerden yasaklı rolleri alır |

| Tag taraması | 3 dk | Tag rolünü ve TagBan'ı uygular |

| Otorol | 5 dk | Rolsüzlere üye rolü verir |

| Süreli market rolleri | 5 dk | Süresi dolan rolleri alır |

| Booster kontrolü | 10 dk | Boost çekenlerin özel rollerini alır |

| Haftalık ödüller, saygınlık, haftalık XP | 15 dk kontrol | Pazartesi haftalık işlemleri yapar |

| Görev atama ve temizleme | 30 dk | Yetkililere görev atar, süresi bitenleri siler |

| 1E1 kontrolü | 30 dk | Haftalık özet ve hatırlatma |

| Otomatik mesajlar | 30 sn | Zamanı gelen mesajları gönderir |

| Etkinlik katılımcı takibi | 30 sn | Ses kanalındaki katılımcıların dakikasını sayar |

| Kalıcı oda aktifliği | 1 sa ve 6 sa | Aktif olmayan odalara uyarı gönderir |

| Otomatik yedek | Her gün 00:00 ve 12:00 | Yedek alır, 30 günden eskiyi siler |

| En iyi yetkili | İki haftada bir, Pazartesi | Son 14 günün XP birincisini ödüllendirir |

| Bump hatırlatma | Bump'tan 2 saat sonra | Ping rollerini etiketler |

| Coin soru oyunu | 30 dk | Yeni soru veya oyun açar |



\## 51. Taşıma Önerisi



toji bots'un modül yapısına (web paneli, sunucu başına ayar) uyacak şekilde, değer ve bağımlılığa göre önerilen sıra:



1\. \*\*Koruma (Guard), Chat Guard ve Sunucu Kayıtları:\*\* Her sunucu sahibinin ilk istediği şeyler. Yedekleme modülüyle doğrudan bağlantılı (silinen kanal ve rolü geri getirme).

2\. \~\~\*\*Moderasyonun eksikleri\*\*\~\~ (tamamlandı; kalan: yargı).

3\. \*\*Çekiliş ve Rol Butonları:\*\* Kısa sürer, kullanıcı çok kullanır.

4\. \*\*İstatistik ve Seviye:\*\* Mesaj, ses ve davet takibi. Ekonomi, sıralama, haftalık ödüller ve yetkili sistemi bunun üzerine kurulur.

5\. \*\*Tag, TagBan, Booster, AFK, Otomatik Mesajlar, DM Forum, Etiket Bildirimi:\*\* Bağımsız küçük modüller.

6\. \*\*Ekonomi ve Market, Coin Soru Oyunları.\*\*

7\. \*\*Özel Odalar, Kalıcı Odalar.\*\*

8\. \*\*Yetkili Görev ve XP, Üye Claim, Yetkili Alım, Başvurular, Değerlendirme, 1E1, Partner, Etkinlik:\*\* Birbirine bağlı büyük bir paket. İstatistik altyapısı hazır olunca yapılmalı.

9\. \*\*Oyunlar:\*\* Kelime Türetmece, Vampir Köylü, Monopoly, Oyun Lobisi.

10\. \*\*Dış servise bağlı olanlar:\*\* Müzik, Riot, Twitter. En sona bırakılmalı ya da hiç taşınmamalı.



Taşırken dikkat edilecekler:



\- \*\*Sabit kimlikler:\*\* Eski botta bazı kimlikler kodda sabit (oy botu ve kanalı, Disboard botu, hoş geldin metnindeki rol ve kanal, bazı muaf kullanıcılar, "Forum Sorumlusu/Lideri" gibi rol adları). Hepsi ayara çevrilmeli.

\- \*\*Tek sunucu varsayımı:\*\* Eski bot tek sunucu için yazılmış (`Settings.Main.GuildID`). toji bots'ta her şey sunucu kimliğine bağlı tutulmalı.



\---



\## Ek A: Ön Ekli Komutların Tamamı



Ön ekler: `.` `!` `-` (üçü de çalışır). Underworld rolündeki üye hiçbir ön ekli komutu kullanamaz.



\### Eğlence



| Komut | Diğer Adları | Kullanım | Açıklama | Dosya |

|---|---|---|---|---|

| `.\[eski bot]poly` | `cpoly` `monopoly` `borsa` `\[eski bot]poly-kur` `monopoly-kur` | `.\[eski bot]poly` | Metin kanalında maksimum 18 kişilik \[eski bot]poly oyun lobisi ve etkinliğini başlatır. | Fun/Monopoly.js |

| `.monopoly-profil` | `monopolyprofil` `cpoly-profil` `cpolyprofil` | `.monopoly-profil \[@kullanıcı]` | Monopoly (\[eski bot]poly) oyun istatistiklerinizi ve kazandığınız rozetleri görüntüler. | Fun/MonopolyProfil.js |

| `.monopoly-top` | `monopolytop` `cpoly-top` `cpolytop` | `.monopoly-top` | Sunucudaki en çok Monopoly zaferi kazanan oyuncuların sıralamasını gösterir. | Fun/MonopolyTop.js |

| `.vampir-köylü` | `vampirkoylu` `vk` `vampire-köylü` `vampire-lobby` `vampire-lobi` `vampire-panel` `vampire-lobby-panel` `vampire-lobi-panel` | `.vampir-köylü` | Vampir Köylü oyununu başlatır ve yönetir. | Fun/VampireKoylu.js |



\### Moderasyon



| Komut | Diğer Adları | Kullanım | Açıklama | Dosya |

|---|---|---|---|---|

| `.ban` | `yasakla` `banla` `yasak` `underworld` `ban-user` | `.ban <user\_id\\|mention> <sebep\\|reason>` | Belirtilen kullanıcıyı sunucudan yasaklar. | Moderation/Ban.js |

| `.bansorgula` | `ban-sorgula` `ban-sorgu` `ban-sorgu-sistemi` | `.bansorgula <user\_id\\|mention>` | Uzaklaştırılmış bir kullanıcının ban detaylarını, yetkilisini ve tarihini sorgular. | Moderation/BanSorgula.js |

| `.copycategory` | `kategorikopyala` | `.copycategory <KategoriID>` | Seçilen kategorinin tüm özellikleri ve izinleriyle bir kopyasını hemen altına oluşturur. | Moderation/CopyCategory.js |

| `.etkinlikcezalı` | `etkinlikcezali` `etkinlik-cezali` `etkinlik-cezalı` `eventcezali` `eventcezalı` `event-cezali` `e-cezali` `ecezali` | `.etkinlikcezalı <@kullanıcı> \[süre] \[sebep]` | Kullanıcıya Etkinlik Cezalı rolünü verir ve etkinlik cezası uygular. | Moderation/EtkinlikCezali.js |

| `.jail` | `cezalı` `karantina` `jail-user` `cezalı-sistemi` | `.jail <user\_id\\|mention> \[süre] \[sebep]` | Bir kullanıcıyı cezalıya atıp tüm kanallardan men eder. | Moderation/Jail.js |

| `.kilit` | `kanal-kilit` `chat-kilit` `lock` `unlock` `kanal-kilit-sistemi` | `.kilit <sebep\\|reason>` | Bir kanalı kilitler veya kilidini açar. | Moderation/Kilit.js |

| `.mute` | `chatmute` `voicemute` `sesmute` `sustur` `sessustur` `vmute` `cmute` `metinsustur` `chatsustur` `v-mute` `c-mute` | `.mute <user\_id\\|mention>` | Kullanıcının metin veya ses kanallarını kullanmasını ve 'mute' cezası vermenizi sağlar. | Moderation/Mute.js |

| `.rolizin` | `ri` | `.rolizin` | Rollerin kanallardaki spesifik izinlerini toplu yönetir. | Moderation/Rolizin.js |

| `.sicil` | `cezalar` `cezabilgi` `cezasıl` `cezasil` `cezalarım` `ceza-sorgu` `ceza-sorgula` `ceza-sorgulama` | `.sicil <user\_id\\|mention>` | Kullanıcının daha önce aldığı uyarı, ban ve mute gibi tüm cezaların listesini açar. | Moderation/Sicil.js |

| `.unban` | `unyasakla` `ununderworld` `unban-sistemi` | `.unban <user\_id\\|mention>` | Uzaklaştırılmış bir kullanıcının banını kaldırarak sunucuya tekrar girişini ve 'underworld' cezasını kaldırmanızı sağlar. | Moderation/Unban.js |

| `.unetkinlikcezali` | `unetkinlikcezalı` `un-etkinlikcezali` `un-etkinlik-cezali` `uneventcezali` `un-eventcezali` `un-ecezali` `unecezali` | `.unetkinlikcezali <@kullanıcı>` | Kullanıcının üzerindeki Etkinlik Cezalı cezasını ve rolünü kaldırır. | Moderation/UnEtkinlikCezali.js |

| `.unjail` | `uncezali` `uncezalı` `unkarantina` `unjail-sistemi` | `.unjail <user\_id\\|mention>` | Cezalı alanında bulunan bir üyeyi normal sunucu haklarına geri kavuşturur ve 'jail' cezasını kaldırmanızı sağlar. | Moderation/Unjail.js |

| `.unmute` | `unchatmute` `unvoicemute` `unsesmute` `unsustur` `unsessustur` `unvmute` `uncmute` `unmetinsustur` `unchatsustur` `unv-mute` `unc-mute` | `.unmute <user\_id\\|mention>` | Konuşma veya ses yasağı olan bir üyenin suskunluğunu süresi dolmadan açar ve 'mute' cezasını kaldırmanızı sağlar. | Moderation/Unmute.js |

| `.uyarı` | `warn` `uyari` `uyar` | `.uyarı <user\_id\\|mention> <reason>` | Sunucuda kural ihlali yapan bir kullanıcıya uyarı cezası vermenizi sağlar. | Moderation/Uyarı.js |



\### Sahip



| Komut | Diğer Adları | Kullanım | Açıklama | Dosya |

|---|---|---|---|---|

| `.af` | `amnesty` | `.af` | Suncudaki yasaklı, cezalı veya af bekleyen kullanıcılar için af menüsünü açar. | Owners/Af.js |

| `.backup` | `yedek` | `.backup` | Sunucunun yedeğini almanızı ve mevcut yedekleri görüntülemenizi sağlar. | Owners/Backup.js |

| `.özel-komut` | `ökomut` `custom-command` `custom-role` `custom-role-command` `custom-role-commands` `custom-roles` `custom-roles-command` `custom-roles-commands` `özelkomut` `özelkomutlar` `özel-komutlar` `özel-komut-komutları` `özel-komut-komutlari` | `.özel-komut` | Sunucuda özel komutlar oluşturmanızı ve mevcut özel komutları görüntülemenizi sağlar. | Owners/CustomRoleCommands.js |

| `.eval` | - | `.eval <code>` | bu komutu bilmesenizde olur be kanka | Owners/Eval.js |

| `.findguild` | `find-guild` `guildfind` `guild-find` `sunucu-bul` `sunucubul` `sunucu-bulma` `sunucubulma` | `.findguild <user\_id\\|mention>` | Belirtilen kullanıcının taşıdığı primary guild (klan) ID'sini bulur. | Owners/FindGuild.js |

| `.forceban` | `force-ban` `forceban-sistemi` | `.forceban <user\_id\\|mention> <sebep>` | Bir kullanıcıyı sunucudan yasaklar. | Owners/Forceban.js |

| `.jailayar` | `jail-ayar` `jail-settings` `jail-config` `jail-panel` `jail-ayarlar` `jail-ayarlari` | `.jail-ayar` | Sistemdeki jail (karantina) sebep ve sürelerini yönetebileceğiniz paneli açar. | Owners/JailAyar.js |

| `.kurulum` | - | `.kurulum` | bilmeseniz olur | Owners/Kurulum.js |

| `.levelayar` | - | - | Level rol sistemini yönetir (Mesaj ve Ses levelleri) | Owners/LevelAyar.js |

| `.levelcoinayarla` | `levelcoin-ayarla` `levelcoinsifirla` `levelcoin-sifirla` | `.levelcoinayarla \[@kullanici / hepsi]` | Kullanıcıların geçmiş seviye coinlerini sıfırlar ve mevcut seviyelerine (.setup / .ecoayar ayarına) göre coinlerini eşitler. | Owners/LevelCoinAyarla.js |

| `.lobi-panel` | `lobi` `lobby` `lobby-panel` | `.lobi-panel` | Oyuncu bulma sistemi, düzenlenecek. | Owners/LobbyPanel.js |

| `.manage-bots` | `manage-bot` `bot-manage` `bot-manage-panel` `bot-panel` | `.manage-bots` | Bot yönetim panelini açar. | Owners/ManageBot.js |

| `.marketdüzenle` | `editmarket` | `.marketdüzenle` | Ekonomi marketindeki ürünleri düzenler (Sadece Sahipler). | Owners/MarketDuzenle.js |

| `.muteayar` | `mute-ayar` `mute-settings` `mute-config` `mute-panel` `mute-ayarlar` `mute-ayarlari` | `.mute-ayar` | Sistemdeki mute sebep ve sürelerini yönetebileceğiniz paneli açar. | Owners/MuteAyar.js |

| `.ownerban` | `oban` `owner-ban` `oban-sistemi` | `.ownerban <user\_id\\|mention> <reason>` | Sahiplerin sunucudan bir kullanıcıyı uzaklaştırarak 'ban' cezası uygulamanızı sağlar. | Owners/OBan.js |

| `.ownerunban` | `ownerunyargı` `ownerunyargi` `ownerunyargı-sistemi` `ownerunyargi-sistemi` | `.ownerunban <user\_id\\|mention>` | Sahiplerin sunucudan uzaklaştırılmış bir kullanıcının banını kaldırarak sunucuya tekrar girişini ve 'ban' cezasını kaldırmanızı sağlar. | Owners/OUnban.js |

| `.riot-panel` | `riot-accounts` `game-accounts` `riot-accounts-panel` `game-accounts-panel` | `.riot-panel` | Düzenlenecek. | Owners/RiotPanel.js |

| `.setup` | `ayarlar` `ayar` `config` `config-panel` `settings` | `.setup` | Botun veri tabanı bağlantılarını ve sunucu ayarlarını yapılandırma arayüzüdür. | Owners/Setup.js |

| `.sicil-temizle` | `sicilsil` `temizle` `sicil-temizleme` `siciltemizle` | `.sicil-temizle <user\_id\\|mention>` | İstisnai durumlarda bir kullanıcının geçmişteki tüm ceza kayıtlarını sıfırlar. | Owners/Sicil Temizle.js |

| `.siparişler` | `orders` `teslimat` `order-panel` `order-management` | `.siparişler` | Sunucudaki siparişleri yönetebileceğiniz paneli açar. | Owners/Siparisler.js |

| `.tagban` | `yasaklı-tag` `tag-ban` `tag-ban-panel` `tagban-panel` | `.tagban` | Sunucu etiketi (guildtag) yasaklama panelini açar. | Owners/TagBan.js |



\### Yetkili



| Komut | Diğer Adları | Kullanım | Açıklama | Dosya |

|---|---|---|---|---|

| `.çekiliş` | `giveaway` `cekilis` | `.çekiliş` | Sunucuda çekiliş başlatmanızı, şartlı çekiliş oluşturmanızı, kazananı tekrarlamanızı veya çekilişi bitirmenizi sağlar. | Staff/Cekilis.js |

| `.claims` | `claimlerim` | `.claims` | Aktif claimlerinizi görüntüleyin. | Staff/Claims.js |

| `.denetimtest` | - | - | DenetimTest komutu. | Staff/DenetimTest.js |

| `.emojiekle` | `emoji-ekle` `addemoji` `add-emoji` `emojiekle-sistemi` | `.emojiekle <link> <isim>` | Dış kaynaklı bir emojiyi URL veya isimle sunucuya pratikçe ekler. | Staff/EmojiEkle.js |

| `.event` | `etkinlikler` | - | Etkinlik Ana Yönetim Panelini açar. | Staff/Etkinlik.js |

| `.görevdenetim` | `gorevdenetim` `görev-denetim` `gdenetim` `denetim` | - | Görevdenetim komutunu yönetmenizi sağlar. | Staff/GorevDenetim.js |

| `.görev` | `tasks` `gorevlerim` `gorev` | - | - | Staff/Gorevlerim.js |

| `.guard` | `güvenlik` `koruma` `guard-sistemi` `whitelist` `whitelist-sistemi` `guard-panel` `guard-dashboard` | `.guard` | Sunucu korumasını (Guard) sistemini yönetmenizi sağlayan paneli açar ve ayarları görüntüler. | Staff/Guard.js |

| `.kalıcıoda` | `poda` `kalicioda` `ekip` `team` `permanentroom` `permanent-room` `permanentroom-sistemi` `permanent-room-sistemi` | `.kalıcıoda` | Merkezi Kalıcı Oda Yönetim Panelini açar ve ayarları görüntüler. | Staff/KalıcıOda.js |

| `.oryantasyon` | `oryantasyon-baslat` `oryantasyon-bitir` `orient` | `.oryantasyon <@kullanıcı>` | Yeni bir yetkili ile aynı ses kanalında minimum 3 dakikalık oryantasyon sürecini başlatır veya bitirir. | Staff/Oryantasyon.js |

| `.rol-al` | `role-remove` `rolsil` `rol-sil` `rol-al-sistemi` | `.rol-al` | Üyeden veya topluluktan rol almanızı sağlar. | Staff/Rol-Al.js |

| `.rol-ver` | `role-add` `rolver` `rol-ver-sistemi` | `.rol-ver` | Üyeye veya topluluğa rol vermenizi sağlar. | Staff/Rol-Ver.js |

| `.rolbilgim` | `özelkomutlarım` `kotalarım` `rolverilerim` | `.rolbilgim` | Kullanabildiğiniz özel rol komutlarını ve limitlerinizi gösterir. | Staff/RolBilgim.js |

| `.rol-log` | `role-log` `rollog` `rol-gecmisi` `role-history` `rol-log-sistemi` `rol-log-rol` | `.rol-log \[kullanıcı]` | Bir üyeye yetki veya rol değişimlerinin kim tarafından yapıldığını log halinde sunar. | Staff/RolLog.js |

| `.rolsüz-ver` | `rolsuz-ver` `rolsuzver-sistemi` `rolsuzver` | `.rolsuzver` | Üye rolü olmayan ve cezası bulunmayan herkese üye rolü verir. | Staff/RolsuzVer.js |

| `.say` | `say-stats` `say-istatistik` `say-istatistikleri` | `.say` | Sunucudaki toplam üye, aktif, sesli ve taglı kullanıcı sayısını anlık raporlar. | Staff/Say.js |

| `.seslog` | `ses-log` `seslog-sistemi` | `.seslog <user\_id\\|mention>` | Kullanıcının sesli kanallarda ne kadar kaldığını ve hangi kanallarda gezdiğini dökümler. | Staff/SesLog.js |

| `.sil` | `temizle` `clear` `purge` `delete` `mesaj-sil` `mesaj-temizle` `mesaj-silme` | `.sil <miktar\\|amount> \\| .sil hepsi` | Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler. | Staff/Sil.js |

| `.staffrating` | `sr` `değerlendirmeler` | `.staffrating \[@Kullanıcı/ID]` | Yetkili değerlendirmelerini listeler. | Staff/StaffRating.js |

| `.ticket` | `destek` `destek-talebi` `ticket-sistemi` | `.ticket ekle/çıkar/izin @üye` | Destek talebinde üye ekleme, çıkarma ve mesaj izni verme işlemlerini yapmanızı sağlar. | Staff/Ticket.js |

| `.ticketbugfix` | `ticketbufix` `ticket-bug-fix` `ticket-sifirla` | `.ticketbugfix <@kullanıcı/ID>` | Buga giren (kanalı silinmiş ama veritabanında açık görünen) bilet verisini temizler. | Staff/TicketBugFix.js |

| `.yetki-taşı` | `yetki-tasi` `yetkitaşı` `yetkitasima` `yetki-tasima` | `.yetki-taşı @KaynakKullanıcı @HedefKullanıcı` | Yetki-taşı komutu ile rollerin başka bir üyeye taşınmasını ve kaynağın 'üye' rollerine indirgenmesini sağlar. | Staff/Yetki Taşı.js |

| `.yetkitasi` | `yetkitaşı` | `.yetkitasi <@KaynakKullanıcı> <@HedefKullanıcı>` | Bir kullanıcının yetkilerini başka bir kullanıcıya taşır. | Staff/YetkiTasi.js |

| `.ytclaim` | `claimyt` `yetkiliclaim` `yt-claim` `yetkili-claim` | `.ytclaim <@kullanıcı>` | Yeni alınan bir yetkiliyi 6 saat içerisinde kendinize claimlersiniz. | Staff/YtClaim.js |



\### İstatistik



| Komut | Diğer Adları | Kullanım | Açıklama | Dosya |

|---|---|---|---|---|

| `.birebir` | - | - | - | Stats/1e1.js |

| `.arkaplan` | `background` `bg` `arka-plan` | `.arkaplan <resim\_url> \\| sıfırla>` | Sunucuda 50 ve üzeri mesaj veya ses seviyesine sahip kullanıcılar arka planlarını değiştirebilir. | Stats/Background.js |

| `.detay-denetim` | `rolstat` `detay-denetim-sistemi` `detay-denetim-rol` | `.detay-denetim <@rol\\|rol\_id>` | Belirtilen rolün üyelerinin detaylı istatistiklerini gösterir. | Stats/Detay Denetim.js |

| `.grafik` | `graph` `graphs` `istatistik-grafik` `istatistik-graph` `istatistik-graphs` | `.grafik \[kullanıcı/sunucu]` | Sunucudaki son bir haftalık aktiflik verilerini grafikler eşliğinde raporlar. | Stats/Graphs.js |

| `.davet` | `invite` `davet-sistemi` `invite-system` | `.davet \[kullanıcı]` | Üyenin veya kendinizin sunucuya kaç kişi davet ettiğini ayrıntılı gösterir. | Stats/Invite.js |

| `.sıralama` | `leaderboard` `toplist` `toplist-sistemi` `toplist-sıralama` `top` | `.sıralama` | Sunucunun en aktif (mesaj, ses, davet) ilk 10 üyesini sıralı listeyle gösterir. | Stats/Leaderboard.js |

| `.rank` | `seviye` `rank-sistemi` `seviye-sistemi` | `.rank \[kullanıcı]` | Sunucudaki aktifliğinize göre kazandığınız XP seviyesini ve rütbe kartını açar. | Stats/Rank.js |

| `.rol-denetim` | `role-inspection` `rol-denetim-sistemi` `rol-denetim-rol` | `.rol-denetim \[rol]` | Belirli bir roldeki tüm üyelerin o hafta yaptığı toplam aktifliği analiz eder. | Stats/Rol Denetim.js |

| `.stat` | `istatistik` `istatistik-sistemi` | `.stat \[kullanıcı]` | Genel sunucu aktifliğinizi (mesaj, ses, kategori) tek bir panelde özetler. | Stats/Stat.js |



\### Kullanıcı



| Komut | Diğer Adları | Kullanım | Açıklama | Dosya |

|---|---|---|---|---|

| `.müzik` | `muzik` `music` `radyo` | `.müzik` | Gelişmiş Müzik ve Playlist Yönetim Paneli | User/muzik.js |

| `.afk` | `afk-sistemi` `afk-sistemi-ayarla` `afk-sistemi-kapat` | `.afk \[sebep]` | Klavyeden uzak olduğunuzu belirtmek için AFK moduna girersiniz. | Users/afk.js |

| `.avatar` | `avatar-sistemi` `avatar-göster` `avatar-gösterme` | `.avatar \[kullanıcı]` | Bir kullanıcının avatarını gösterir. | Users/Avatar.js |

| `.coin` | `cash` `mağaza` `market` `shop` `bakiye` `money` `cüzdan` | `.coin <user\_id\\|mention>` | Mevcut bakiyenizi, mağaza ürünlerini ve sipariş geçmişinizi içeren ekonomi panelini açar. | Users/Coin.js |

| `.dil` | `language` `lang` `dil-sistemi` `language-system` | `.dil <tr\\|en>` | Botun dilini değiştirin. / Change the bot language. | Users/Language.js |

| `.yardım` | `help` `syardım` `syardim` `staffhelp` `staffyardım` `staff-yardım` | `.yardım / .syardım` | Yardım ve yetkili yardım bilgilerini gösterir. | Users/Yardım.js |



\## Ek B: Eğik Çizgi (Slash) Komutlarının Tamamı



\### Geliştirici / Ayar



\- \*\*/boostayar\*\* — Sunucu Takviye (Boost) sistemini yönetir

\- \*\*/ecoayar\*\* — Ekonomi sistemini yönetir

\- \*\*/levelayar\*\* — Level rol sistemini yönetir (Mesaj ve Ses levelleri)

\- \*\*/mesaj\*\* — V2 Panel sistemi ile gelişmiş mesaj oluşturun veya düzenleyin.

&#x20; - `oluştur` (alt komut) — Yeni bir mesaj oluşturma paneli başlatır.

&#x20; - `düzenle` (alt komut) — Mevcut bir mesajı düzenleme paneli başlatır.

&#x20;   - `mesaj\_id` (metin, zorunlu) — Düzenlenecek mesajın ID'si

\- \*\*/permanentayar\*\* — Kalıcı Özel Oda sistemini yönetir

\- \*\*/privateayar\*\* — Özel Oda (Private Rooms) sistemini yönetir

\- \*\*/restrictayar\*\* — Kısıtlı yetkili (Restrict) sistemini yönetir

\- \*\*/tagban\*\* — Yasaklı tag yönetim menüsünü açar.



\### Ekonomi



\- \*\*/coin\*\* — Mevcut bakiyenizi, mağaza ürünlerini ve sipariş geçmişinizi içeren ekonomi panelini açar.

&#x20; - `kullanıcı` (kullanıcı) — İstatistiklerine bakmak istediğiniz kullanıcı

\- \*\*/marketdüzenle\*\* — Ekonomi marketindeki ürünleri düzenler (Sadece Sahipler).

\- \*\*/siparisler\*\* — Sunucudaki siparişleri yönetebileceğiniz paneli açar.



\### Eğlence



\- \*\*/\[eski bot]poly\*\* — Metin kanalında maksimum 18 kişilik \[eski bot]poly etkinliğini başlatır.

\- \*\*/monopoly\*\* — Metin kanalında maksimum 18 kişilik dinamik Monopoly oyunu başlatır.

\- \*\*/monopolyprofil\*\* — Monopoly (\[eski bot]poly) oyun istatistiklerinizi ve rozetlerinizi görüntüler.

&#x20; - `kullanıcı` (kullanıcı) — İstatistiklerini görmek istediğiniz kullanıcıyı seçin

\- \*\*/monopolytop\*\* — Sunucudaki en çok Monopoly zaferi kazanan oyuncuların sıralamasını gösterir.



\### Moderasyon



\- \*\*/af\*\* — Sunucudaki Jail ve Underworld cezaları için af menüsünü açar.

\- \*\*/ban\*\* — Kullanıcıyı sunucudan uzaklaştırmanızı ve 'underworld' cezası vermenizi sağlar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Banlanacak kullanıcıyı seçin

&#x20; - `sebep` (metin) — Banlama sebebini belirtin

\- \*\*/bansorgula\*\* — Uzaklaştırılmış bir kullanıcının ban detaylarını sorgular.

&#x20; - `kullanıcı\_id` (metin) — Kullanıcı ID'si

&#x20; - `kullanıcı` (kullanıcı) — Kullanıcı

\- \*\*/copycategory\*\* — Seçilen kategorinin tüm özellikleri ve izinleriyle bir kopyasını hemen altına oluşturur.

&#x20; - `kategori\_id` (metin, zorunlu) — Kopyalanacak kategorinin ID'si

\- \*\*/emojiekle\*\* — Dış kaynaklı bir emojiyi URL veya isimle sunucuya pratikçe ekler.

&#x20; - `link\_veya\_emoji` (metin, zorunlu) — Link veya varsayılan emoji

&#x20; - `isim` (metin) — Emojinin verilecek ismi

\- \*\*/etkinlikcezali\*\* — Kullanıcıya Etkinlik Cezalı rolünü verir ve ceza uygular.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Caza uygulanacak kullanıcıyı seçin

&#x20; - `süre` (metin) — Ceza süresi (örn: 1h, 1d, 3d)

&#x20; - `sebep` (metin) — Cezalandırma sebebi

\- \*\*/forceban\*\* — Kullanıcıyı sunucudan uzaklaştırmanızı sağlar.

&#x20; - `id` (metin, zorunlu) — Kullanıcıyı sunucudan uzaklaştırmanızı sağlar.

&#x20; - `sebep` (metin) — Kullanıcıyı sunucudan uzaklaştırmanızı sağlar.

\- \*\*/jail\*\* — Kullanıcıyı karantinaya atıp tüm kanallardan men eder.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Jail atılacak kullanıcıyı seçin

&#x20; - `süre` (metin) — Jail süresi (örn: 1h, 30m, 1d)

&#x20; - `sebep` (metin) — Jail sebebini belirtin

\- \*\*/kilit\*\* — Sohbetin aşırı hızlı aktığı veya sorun çıktığı durumlarda kanalı yazışmaya kapatır.

\- \*\*/mute\*\* — Kullanıcının metin veya ses kanallarını kullanmasını yasaklar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Mute atılacak kullanıcı.

\- \*\*/rolal\*\* — Üyeden veya topluluktan rol almanızı sağlar (Yetkiye göre akıllı menü).

\- \*\*/rolver\*\* — Üyeye veya topluluğa rol vermenizi sağlar (Yetkiye göre akıllı menü).

\- \*\*/rolizin\*\* — Bir veya birden fazla rolün izinlerini toplu yönetir.

\- \*\*/say\*\* — Sunucudaki toplam üye, aktif, sesli ve taglı kullanıcı sayısını anlık raporlar.

\- \*\*/seslog\*\* — Kullanıcının sesli kanallarda ne kadar kaldığını ve hangi kanallarda gezdiğini dökümler.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Ses loglarını görmek istediğiniz kullanıcı

\- \*\*/sicil\*\* — Kullanıcının daha önce aldığı uyarı, ban ve mute gibi tüm cezaların listesini açar.

&#x20; - `kullanıcı` (kullanıcı) — Siciline bakmak istediğiniz kullanıcı

&#x20; - `cezano` (sayı) — Özellikle bir cezanın detayına bakmak için ceza numarası

\- \*\*/siciltemizle\*\* — İstisnai durumlarda bir kullanıcının geçmişteki tüm ceza kayıtlarını sıfırlar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Sicili temizlenecek kullanıcı

\- \*\*/sil\*\* — Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.

&#x20; - `miktar` (sayı) — Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.

&#x20; - `hepsi` (evet/hayır) — Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.

\- \*\*/unban\*\* — Uzaklaştırılmış bir kullanıcının banını kaldırır.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Banı kaldırılacak kullanıcı.

\- \*\*/unetkinlikcezali\*\* — Kullanıcının üzerindeki Etkinlik Cezalı cezasını ve rolünü kaldırır.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Cezası kaldırılacak kullanıcıyı seçin

\- \*\*/unjail\*\* — Karantina alanında bulunan bir üyenin cezasını kaldırır.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Cezası kaldırılacak kullanıcı.

\- \*\*/unmute\*\* — Susturulmuş bir üyenin cezasını kaldırır.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Cezası kaldırılacak kullanıcı.

\- \*\*/unyargı\*\* — Unyargı komutu ile 'yargı' cezasını kaldırmanızı sağlar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Cezası kaldırılacak kullanıcı

&#x20; - `sebep` (metin) — Kaldırma sebebi

\- \*\*/uyari\*\* — Kullanıcıya kural ihlali sebebiyle uyarı verir.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Kullanıcıya kural ihlali sebebiyle uyarı verir.

&#x20; - `sebep` (metin, zorunlu) — Kullanıcıya kural ihlali sebebiyle uyarı verir.

\- \*\*/yargı\*\* — Yargı komutu ile 'yargı' cezası uygulamanızı sağlar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Yargılanacak kullanıcı

&#x20; - `sebep` (metin) — Ceza sebebi



\### Sahip



\- \*\*/jailayar\*\* — Jail sebep ve sürelerini yönetebileceğiniz paneli açar. \_(Gerekli izin: ManageChannels)\_

\- \*\*/ozel-komut\*\* — Sunucuda özel komutlar oluşturmanızı ve yönetmenizi sağlar.



\### Yetkili



\- \*\*/mesajlar\*\* — Otomatik mesaj yönetim paneli

\- \*\*/başvuru-düzenle\*\* — Aktif bir başvuru panelinin ayarlarını düzenler.

&#x20; - `panel` (metin, zorunlu) — Düzenlenecek panel adı veya custom\_id

&#x20; - `isim` (metin) — Panelin yeni adı

&#x20; - `onaylayacak\_roller` (metin) — Onay/Red yapabilecek Rol ID'leri (Araya boşluk koyun)

&#x20; - `verilecek\_roller` (metin) — Onaylanınca verilecek Rol ID'leri (Araya boşluk koyun)

&#x20; - `zaman\_limiti` (sayı) — Cevaplama süresi limiti (dk)

\- \*\*/başvuru-oluştur\*\* — Yeni bir başvuru paneli oluşturur.

&#x20; - `ad` (metin, zorunlu) — Panel adı

&#x20; - `custom\_id` (metin, zorunlu) — Buton custom ID (benzersiz)

&#x20; - `sorular` (metin, zorunlu) — Sorular (\\| ile ayır)

&#x20; - `onay\_rolleri` (metin) — Onaylayabilecek rol IDleri (virgülle ayır)

&#x20; - `verilecek\_roller` (metin) — Onayda verilecek rol IDleri (virgülle ayır)

&#x20; - `sure` (sayı) — Toplam başvuru süresi (dakika)

\- \*\*/başvuru-sil\*\* — Bir başvuru panelini siler.

&#x20; - `panel` (metin, zorunlu) — Panel adı veya custom\_id

\- \*\*/başvuru-temizle\*\* — Kullanıcının tüm başvurularını temizler.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Başvuruları temizlenecek kullanıcı

\- \*\*/başvurular\*\* — Aktif başvuru panellerini listeler.

\- \*\*/cekilis\*\* — Sunucuda çekiliş başlatmanızı veya yönetmenizi sağlar.

\- \*\*/claims\*\* — Aktif claimlerinizi görüntüleyin.

\- \*\*/etkinlik\*\* — Etkinlik Ana Yönetim Panelini açar.

\- \*\*/findguild\*\* — Kullanıcının taşıdığı primary guild (klan) ID'sini bulur.

&#x20; - `id` (metin, zorunlu) — Bilgisi alınacak kullanıcının ID'si.

\- \*\*/denetim\*\* — Bir yetkilinin veya tüm rank'ın zorunlu görev durumunu denetler.

&#x20; - `kullanıcı` (kullanıcı) — Denetlenecek yetkiliyi seçin.

&#x20; - `rol` (rol) — Denetlenecek rütbeyi/rolü seçin.

\- \*\*/görevlerim\*\* — Görev ve yetki ilerleme durumunuzu görüntüler.

&#x20; - `user` (kullanıcı) — Görüntülemek istediğiniz kullanıcıyı seçin.

\- \*\*/görevsorgula\*\* — Bir yetkilinin görev geçmişini ve kazandığı XP'leri sorgular.

&#x20; - `kullanıcı` (kullanıcı) — Sorgulanacak yetkiliyi seçin.

\- \*\*/oryantasyon\*\* — Yeni yetkili ile aynı ses kanalında minimum 3 dakikalık oryantasyon sürecini başlatır veya bitirir.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Oryantasyon yapılacak yeni yetkiliyi seçin

\- \*\*/panel\*\* — Yetkili Görev \& XP Sistemi Yönetim Paneli

\- \*\*/partner\*\* — Partner yöneticisi kontrol paneli.

\- \*\*/rolbilgim\*\* — Kullanabildiğiniz özel rol komutlarını ve kotalarınızı gösterir.

\- \*\*/rolbutonu-düzenle\*\* — Mevcut bir rol butonu kuralını düzenler.

&#x20; - `custom\_id` (metin, zorunlu) — Düzenlenecek butonun arka plan kimliği (Örn: cekilis\_rol)

&#x20; - `rol` (rol) — Yeni rol (Değiştirmek istemiyorsanız boş bırakın)

&#x20; - `aksiyon` (metin) — Yeni aksiyon (Değiştirmek istemiyorsanız boş bırakın) Seçenekler: Sadece Rol Ver, Sadece Rol Al

&#x20; - `bildirim\_mesaji` (metin) — Yeni bildirim mesajı (Değiştirmek istemiyorsanız boş bırakın)

\- \*\*/rolbutonu-liste\*\* — Oluşturulan tüm rol butonlarını listeler.

\- \*\*/rolbutonu-oluştur\*\* — Butona tıklandığında rol verecek/alacak bir sistem (kural) oluşturur.

&#x20; - `custom\_id` (metin, zorunlu) — Butonun arka plan kimliği (Örn: cekilis\_rol)

&#x20; - `rol` (rol, zorunlu) — İşlem yapılacak rol

&#x20; - `aksiyon` (metin, zorunlu) — Kullanıcı butona basınca ne yapılsın? Seçenekler: Sadece Rol Ver, Sadece Rol Al

&#x20; - `bildirim\_mesaji` (metin) — İşlem başarılı olduğunda çıkacak mesaj

\- \*\*/rolbutonu-sil\*\* — Daha önce oluşturulmuş bir rol butonu kuralını siler.

&#x20; - `custom\_id` (metin, zorunlu) — Silinecek butonun özel kimliği (rolebtn\_ hariç)

\- \*\*/staffrating\*\* — Yetkili değerlendirmelerini listeler.

&#x20; - `kullanici` (kullanıcı) — Değerlendirmelerini görmek istediğiniz yetkili (Boş bırakırsanız kendiniz)

\- \*\*/ticket-paneli\*\* — Yeni bir destek talebi paneli oluşturur ve yönetir.

&#x20; - `oluştur` (alt komut) — Yeni bir ticket paneli oluşturur.

&#x20;   - `ad` (metin, zorunlu) — Panelin adı (örn: Şikayet Talebi)

&#x20;   - `custom\_id` (metin, zorunlu) — Sistemsel benzersiz ID (örn: sikayet)

&#x20;   - `kategori` (kanal, zorunlu) — Ticketların açılacağı kategori

&#x20;   - `sorular` (metin) — Modalda sorulacak sorular (\\| ile ayırın)

&#x20;   - `yetkili\_rolleri` (metin) — Görebilecek roller (Virgülle ayırın, ID girin)

&#x20;   - `kapatma\_rolleri` (metin) — Kapatabilecek roller (Virgülle ayırın, ID girin)

&#x20;   - `mesaj` (metin) — Butonun üstünde yazacak açıklama

&#x20; - `gönder` (alt komut) — Oluşturulan ticket panelini mevcut kanala gönderir.

&#x20;   - `custom\_id` (metin, zorunlu) — Gönderilecek panelin ID'si

&#x20; - `sil` (alt komut) — Mevcut bir ticket panelini siler.

&#x20;   - `custom\_id` (metin, zorunlu) — Silinecek panelin ID'si

&#x20; - `liste` (alt komut) — Mevcut ticket panellerini listeler.

\- \*\*/ticket\*\* — Destek talebi ve yetkilendirme sistemi yönetim komutları.

&#x20; - `ekle` (alt komut) — Destek talebine bir kullanıcı ekler.

&#x20;   - `kullanıcı` (kullanıcı, zorunlu) — Eklenecek kullanıcı

&#x20; - `çıkar` (alt komut) — Destek talebinden bir kullanıcıyı çıkarır.

&#x20;   - `kullanıcı` (kullanıcı, zorunlu) — Çıkarılacak kullanıcı

&#x20; - `izin` (alt komut) — Bir kullanıcıya özel bir yetki/izin sağlar.

&#x20;   - `kullanıcı` (kullanıcı, zorunlu) — Kullanıcı

&#x20; - `banla` (alt komut) — Bir kullanıcının ticket açmasını yasaklar.

&#x20;   - `kullanıcı` (kullanıcı, zorunlu) — Yasaklanacak kullanıcı

&#x20;   - `sebep` (metin, zorunlu) — Yasaklama sebebi

&#x20; - `ban-kaldir` (alt komut) — Bir kullanıcının ticket açma yasağını kaldırır.

&#x20;   - `kullanıcı` (kullanıcı, zorunlu) — Yasağı kaldırılacak kullanıcı

&#x20; - `ban-liste` (alt komut) — Ticket açması yasaklanan tüm kullanıcıları listeler.

\- \*\*/yetkitasi\*\* — Bir kullanıcının yetkilerini başka bir kullanıcıya taşır.

&#x20; - `kaynak\_kullanici` (kullanıcı, zorunlu) — Yetkileri alınacak kaynak kullanıcı

&#x20; - `hedef\_kullanici` (kullanıcı, zorunlu) — Yetkilerin verileceği hedef kullanıcı

\- \*\*/ytclaim\*\* — Yeni alınan bir yetkiliyi 6 saat içerisinde claimlemenizi sağlar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Claimlenecek yeni yetkiliyi seçin



\### İstatistik



\- \*\*/1e1\*\* — 1E1 Görüşme Başlatır veya Paneli Açar

&#x20; - `hedef` (kullanıcı) — Sorgulamak istediğiniz kişi

\- \*\*/arka-plan\*\* — Arka-plan komutunu yönetmenizi sağlar.

&#x20; - `url` (metin, zorunlu) — Arka-plan komutunu yönetmenizi sağlar.

\- \*\*/davet\*\* — Davet komutunu yönetmenizi sağlar.

&#x20; - `kullanıcı` (kullanıcı) — Davet komutunu yönetmenizi sağlar.

\- \*\*/detaydenetim\*\* — Bir rolün üyelerini seçmeli filtrelerle çok detaylı denetler.

&#x20; - `rol` (rol, zorunlu) — Denetlemek istediğiniz rolü seçin.

\- \*\*/grafik\*\* — Grafik komutunu yönetmenizi sağlar.

&#x20; - `tür` (metin, zorunlu) — Grafik komutunu yönetmenizi sağlar. Seçenekler: Sunucu, Kullanıcı

&#x20; - `kullanıcı` (kullanıcı) — Grafik komutunu yönetmenizi sağlar.

\- \*\*/leaderboard\*\* — Sunucu genelindeki verilerin sıralamasını görüntüler.

\- \*\*/rank\*\* — Sunucudaki aktifliğinize göre kazandığınız XP seviyesini ve rütbe kartını açar.

&#x20; - `kullanıcı` (kullanıcı) — Rank kartı açılacak kullanıcı

\- \*\*/roldenetim\*\* — Belirli bir roldeki tüm üyelerin o hafta yaptığı toplam aktifliği analiz eder.

&#x20; - `rol` (rol, zorunlu) — Denetlenecek rol

\- \*\*/rollog\*\* — Bir kullanıcının geçmiş rol kayıtlarını listeler.

&#x20; - `user` (kullanıcı, zorunlu) — Geçmişini görmek istediğiniz kullanıcıyı belirtin.

\- \*\*/stat\*\* — Genel sunucu aktifliğinizi (mesaj, ses, kategori) tek bir panelde özetler.

&#x20; - `kullanıcı` (kullanıcı) — İstatistiklerine bakmak istediğiniz kullanıcı



\### Kullanıcı



\- \*\*/avatar\*\* — Sizin veya belirttiğiniz birinin profil fotoğrafını tam boy ve HD kalitede gösterir.

&#x20; - `kişi` (metin) — Sizin veya belirttiğiniz birinin profil fotoğrafını tam boy ve HD kalitede gösterir.

\- \*\*/doğum-günü\*\* — Bir kullanıcının doğum gününü özel bir kartla kutlayın

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Doğum gününü kutlamak istediğiniz kullanıcı

&#x20; - `not` (metin) — Karta eklemek istediğiniz özel not (İsteğe bağlı)

&#x20; - `fotoğraf` (dosya) — Karta eklemek istediğiniz özel fotoğraf (İsteğe bağlı)

\- \*\*/itiraf\*\* — Itiraf komutunu yönetmenizi sağlar.

&#x20; - `itirafınız` (metin, zorunlu) — Itiraf komutunu yönetmenizi sağlar.

\- \*\*/motive\*\* — Motive komutunu yönetmenizi sağlar.

\- \*\*/müzik\*\* — Gelişmiş Müzik ve Playlist Yönetim Paneli

\- \*\*/respect\*\* — Respect komutunu yönetmenizi sağlar.

&#x20; - `kullanıcı` (kullanıcı, zorunlu) — Respect komutunu yönetmenizi sağlar.

\- \*\*Saygı Duy\*\* (sağ tık menüsü) — Kullanıcıya sağ tıklayınca çıkar.

\- \*\*Takip Et/Bırak\*\* (sağ tık menüsü) — Kullanıcıya sağ tıklayınca çıkar.

\- \*\*/afk\*\* — AFK moduna girmenizi veya yetkili iseniz bir kullanıcıyı AFK odasına taşımanızı sağlar.

&#x20; - `kullanıcı` (kullanıcı) — AFK odasına taşımak istediğiniz kullanıcı (Sadece yetkililer)

&#x20; - `sebep` (metin) — AFK olma sebebiniz

\- \*\*/kalicioda\*\* — Merkezi Kalıcı Oda Yönetim Paneli

\- \*\*/language\*\* — Change the bot language / Botun dilini değiştirin.

&#x20; - `lang` (metin, zorunlu) — Select the language / Dili seçin Seçenekler: Türkçe, English

\- \*\*/yardım\*\* — Yardım komutunu yönetmenizi sağlar.





