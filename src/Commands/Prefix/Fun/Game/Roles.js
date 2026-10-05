// Oyun içi rollerin özelliklerini ve tabanını barındıran yapı.
// İleride yeni bir rol eklenmek istendiğinde bu objeye eklenerek genel sistemde kolayca entegre edilebilir.
//
// `setup` alanı (opsiyonel):
//   - mode: "count"  → sayı artır/azalt (min..max arası)
//   - mode yok      → setup ekranında ayarlanmaz (örn. Köylü otomatik kalan)
//   - key:  settings.roles içindeki karşılığı
//   - default: başlangıç değeri
//   - min / max: count modu için sınırlar
module.exports = {
    VAMPIR: {
        id: "VAMPIR",
        name: "Vampir",
        side: "BAD",
        description: "Her gece 1 oyuncuyu öldürebilirsin.",
        emoji: "🧛",
        order: 1,
        setup: { mode: "count", key: "vampire", default: 0, min: 0, max: 10 }
    },
    DOKTOR: {
        id: "DOKTOR",
        name: "Doktor",
        side: "GOOD",
        description: "Her gece bir oyuncuyu koruyabilirsin. Art arda aynı kişiyi koruyamazsın.",
        emoji: "🩺",
        order: 0,
        setup: { mode: "count", key: "doctor", default: 0, min: 0, max: 5 }
    },
    GOZCU: {
        id: "GOZCU",
        name: "Gözcü",
        side: "GOOD",
        description: "Her gece seçtiğin oyuncunun evini gözetler, onu o gece kimlerin ziyaret ettiğini öğrenirsin.",
        emoji: "👁️",
        order: 2,
        setup: { mode: "count", key: "seer", default: 0, min: 0, max: 5 }
    },
    AVCI: {
        id: "AVCI",
        name: "Avcı",
        side: "GOOD",
        description: "Her gece bir oyuncuyu hedef alırsın. Hedefin kötüyse ölür, iyiyse SEN ölürsün.",
        emoji: "🎯",
        order: 3,
        setup: { mode: "count", key: "hunter", default: 0, min: 0, max: 5 }
    },
    AURA: {
        id: "AURA",
        name: "Aura",
        side: "GOOD",
        description: "Her gece seçtiğin oyuncunun İyi, Kötü veya Tarafsız tarafta olduğunu öğrenirsin.",
        emoji: "✨",
        order: 4,
        setup: { mode: "count", key: "aura", default: 0, min: 0, max: 5 }
    },
    BOMBACI: {
        id: "BOMBACI",
        name: "Bombacı",
        side: "NEUTRAL",
        description: "Bombaladığın oyuncu ertesi gece patlar. Bombalanan önce ölürse Bombacı patlar.",
        emoji: "💣",
        order: 5,
        setup: { mode: "count", key: "bomber", default: 0, min: 0, max: 3 }
    },
    SERI_KATIL: {
        id: "SERI_KATIL",
        name: "Seri Katil",
        side: "NEUTRAL",
        description: "Aynı gece 2 oyuncuyu öldürebilirsin (2 tur bekleme). Gece saldırılarına (Vampir, Alfa Kurt) karşı bağışıksındır.",
        emoji: "🔪",
        order: 6,
        setup: { mode: "count", key: "serial_killer", default: 0, min: 0, max: 3 }
    },
    ALFA_KURT: {
        id: "ALFA_KURT",
        name: "Alfa Kurt",
        side: "BAD",
        description: "Bir oyuncuyu Çırak Kurt olarak kendi tarafına kazandır (1x) veya öldür.",
        emoji: "🐺",
        order: 7,
        setup: { mode: "count", key: "alfa_wolf", default: 0, min: 0, max: 2 }
    },
    DEDEKTIF: {
        id: "DEDEKTIF",
        name: "Dedektif",
        side: "GOOD",
        description: "Araştırdığın oyuncunun tam rolünü KESİN olarak öğrenirsin.",
        emoji: "🕵️",
        order: 8,
        setup: { mode: "count", key: "detective", default: 0, min: 0, max: 3 }
    },
    IZCI: {
        id: "IZCI",
        name: "İzci",
        side: "GOOD",
        description: "Her gece seçtiğin oyuncunun o gece yaptığı hareketi öğrenirsin.",
        emoji: "🏹",
        order: 9,
        setup: { mode: "count", key: "scout", default: 0, min: 0, max: 3 }
    },

    TUZAKCI: {
        id: "TUZAKCI",
        name: "Tuzakçı",
        side: "GOOD",
        description: "Tuzak kurduğun kişiyi ziyaret eden herkes tuzağa yakalanır.",
        emoji: "🪤",
        order: 11,
        setup: { mode: "count", key: "trapper", default: 0, min: 0, max: 3 }
    },
    DELI: {
        id: "DELI",
        name: "Deli",
        side: "NEUTRAL",
        description: "Kendine yanlış rol gösterilir. Araştırma yaptığında yanlış sonuç görürsün.",
        emoji: "🤪",
        order: 12,
        setup: { mode: "count", key: "fool", default: 0, min: 0, max: 2 }
    },
    CIRAK_KURT: {
        id: "CIRAK_KURT",
        name: "Çırak Kurt",
        side: "BAD",
        description: "Seçtiğin oyuncu ertesi gün mesaj yazamaz ve oy kullanamaz.",
        emoji: "🐺",
        order: 13
    },
    MEDYUM: {
        id: "MEDYUM",
        name: "Medyum",
        side: "GOOD",
        description: "Oyun boyunca 1 kez ölmüş bir oyuncuyu diriltebilirsin.",
        emoji: "🔮",
        order: 14,
        setup: { mode: "count", key: "medium", default: 0, min: 0, max: 1 }
    },
    SOYTARI: {
        id: "SOYTARI",
        name: "Soytarı",
        side: "NEUTRAL",
        description: "Kendini halka astırmaya çalış! Asılırsan oyunu sen kazanırsın.",
        emoji: "🤡",
        order: 99,
        setup: { mode: "count", key: "jester", default: 0, min: 0, max: 3 }
    },
    KUNDAKCI: {
        id: "KUNDAKCI",
        name: "Kundakçı",
        side: "NEUTRAL",
        description: "Her gece birine benzin dök veya benzin döktüğün herkesi aynı anda yakarak öldür!",
        emoji: "🔥",
        order: 15,
        setup: { mode: "count", key: "arsonist", default: 0, min: 0, max: 3 }
    },
    CELLAT: {
        id: "CELLAT",
        name: "Cellat",
        side: "NEUTRAL",
        description: "Oyun başı sana bir hedef verilir. Tüm amacın hedefini halk oylamasında astırmaktır.",
        emoji: "🪓",
        order: 16,
        setup: { mode: "count", key: "executioner", default: 0, min: 0, max: 3 }
    },
    R_GOOD: {
        id: "R_GOOD",
        name: "Rastgele İyi",
        side: "GOOD",
        description: "İyiler havuzundan rastgele bir rol atar.",
        emoji: "🎲",
        order: 100,
        isVirtual: true,
        setup: { mode: "count", key: "r_good", default: 0, min: 0, max: 10 }
    },
    R_BAD: {
        id: "R_BAD",
        name: "Rastgele Kötü",
        side: "BAD",
        description: "Kötüler havuzundan rastgele bir rol atar.",
        emoji: "🎲",
        order: 101,
        isVirtual: true,
        setup: { mode: "count", key: "r_bad", default: 0, min: 0, max: 10 }
    },
    R_NEUTRAL: {
        id: "R_NEUTRAL",
        name: "Rastgele Tarafsız",
        side: "NEUTRAL",
        description: "Tarafsızlar havuzundan rastgele bir rol atar.",
        emoji: "🎲",
        order: 102,
        isVirtual: true,
        setup: { mode: "count", key: "r_neutral", default: 0, min: 0, max: 5 }
    },
    R_ANY: {
        id: "R_ANY",
        name: "Rastgele Herhangi",
        side: "ANY",
        description: "Oyunda tamamen rastgele herhangi bir özel rol atar.",
        emoji: "🎲",
        order: 103,
        isVirtual: true,
        setup: { mode: "count", key: "r_any", default: 0, min: 0, max: 15 }
    },
    SAMAN: {
        id: "SAMAN",
        name: "Şaman",
        side: "BAD",
        description: "Gece birini efsunlarsın. Efsunlanan kişi, o gece araştırılırsa her zaman KÖTÜ/VAMPİR olarak gözükür.",
        emoji: "🔮",
        order: 17,
        setup: { mode: "count", key: "shaman", default: 0, min: 0, max: 2 }
    },
    BUYUCU: {
        id: "BUYUCU",
        name: "Büyücü",
        side: "BAD",
        description: "Gece birini büyülersin. Büyülenen kişi o geceki yeteneğini kullanamaz (Susturulur).",
        emoji: "🪄",
        order: 18,
        setup: { mode: "count", key: "sorcerer", default: 0, min: 0, max: 2 }
    },
    VAMPIR_LORDU: {
        id: "VAMPIR_LORDU",
        name: "Vampir Lordu",
        side: "BAD",
        description: "Vampirlerin lideri. Gece saldırılarına karşı bağışıksındır. Araştırmalarda İYİ/KÖYLÜ olarak gözükürsün. Her gece 1 kişiyi öldürebilirsin.",
        emoji: "👑",
        order: 19,
        setup: { mode: "count", key: "vampire_lord", default: 0, min: 0, max: 1 }
    },
    KOYLU: {
        id: "KOYLU",
        name: "Köylü",
        side: "GOOD",
        description: "Halktan birisin. Şüphelileri bulup gündüzleri asmalısın.",
        emoji: "🧑‍🌾",
        order: 99
    }
};