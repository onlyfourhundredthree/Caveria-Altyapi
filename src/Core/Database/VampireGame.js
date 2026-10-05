    const mongoose = require("mongoose");

    const schema = mongoose.Schema({
        guildID: String,
        channelID: String,
        voiceChannelID: String,
        hostID: String,
        votingMessageID: String,
        isActive: { type: Boolean, default: true },
        phase: { type: String, default: "LOBBY" },
        dayCount: { type: Number, default: 0 },
        phaseEndTime: { type: Number, default: 0 },

        settings: {
            playerCount: { type: Number, default: 0 },
            roles: { type: Object, default: {} },
            revealRoleOnDeath: { type: Boolean, default: true },
            doctorSelfProtect: { type: Boolean, default: true },
            nightDuration: { type: Number, default: 90 },
            voteDuration: { type: Number, default: 90 },
            discussionDuration: { type: Number, default: 60 },
            doctorInheritance: { type: Boolean, default: false },
            ttsRoleMode: { type: Number, default: 1 }, // 1: Sides, 2: All Roles, 3: Silent
            autoRoles: { type: Boolean, default: false },
            testMode: { type: Boolean, default: false }
        },

        players: [{
            id: String,
            role: String,
            fakeName: String,
            originalName: String,
            fakeRole: String,
            isAlive: { type: Boolean, default: true },
            isProtected: { type: Boolean, default: false },
            isBot: { type: Boolean, default: false },
            votedFor: String,
            lastSeenDay: { type: Number, default: 0 },
            // Doktor: art arda aynı kişiyi koruyamaz
            lastProtectedTarget: { type: String, default: null },
            protectedTargets: { type: [String], default: [] },
            actions: { type: Object, default: {} },
            // Bombacı: bombaladığı kişi
            bombTarget: { type: String, default: null },
            // Oyun sonu MVP hesaplaması için
            stats: { type: Object, default: { kills: 0, saves: 0, correctVotes: 0, checks: 0 } },
            // Seri Katil: bekleme sayacı (0 ise kullanabilir)
            cooldown: { type: Number, default: 0 },
            // Alfa Kurt: çırak dönüştürme kullanıldı mı
            hasConverted: { type: Boolean, default: false },
            // Medyum: diriltme kullanıldı mı
            hasRevived: { type: Boolean, default: false },
            // Çırak Kurt: ertesi gün susturuldu mu
            isSilenced: { type: Boolean, default: false },
            // Deli: gördüğü sahte rol
            fakeRole: { type: String, default: null },
            // Tuzakçı: tuzak kurulan kişi
            trapTarget: { type: String, default: null },
            // Bombacı: bomba patlama günü
            bombExplodeDay: { type: Number, default: null },
            // Cellat: hedef kişi
            cellatTarget: { type: String, default: null },
            // Kundakçı: benzin dökülmüş mü
            doused: { type: Boolean, default: false },
            // Şaman: efsunlanmış mı (bu gece araştırılırsa KÖTÜ çıkar)
            isFramed: { type: Boolean, default: false }
        }],

        history: { type: Array, default: [] },
        vampireNote: { type: String, default: "" },
        mayorID: { type: String, default: null },
        phaseBeforeInheritance: { type: String, default: null }
    });

    module.exports = mongoose.model("VampireGame", schema);