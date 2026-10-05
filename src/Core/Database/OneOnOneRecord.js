const { Schema, model } = require("mongoose");

const OneOnOneRecord = new Schema({
    guildID: { type: String, required: true },
    weekKey: { type: String, required: true }, // e.g. "2026-W31"
    managerID: { type: String, required: true },
    memberID: { type: String, required: true },

    generalStatus: { 
        type: String, 
        enum: ["Çok İyi", "İyi", "Normal", "Sorunlu", "Kritik"],
        default: "Normal" 
    },
    performanceScore: { type: Number, min: 1, max: 5, default: 5 }, // 1 - 5 Yıldız Performans Puanı
    staffCondition: { type: String, default: "" }, // Yöneticinin değerlendirmesi
    
    problem: {
        exists: { type: Boolean, default: false },
        content: { type: String, default: "" }
    },
    
    suggestion: { type: String, default: "" }, // Yetkilinin önerisi
    managerNote: { type: String, default: "" }, // Yöneticinin gizli özel notu (Sadece Yönetim Görür)

    followUp: {
        required: { type: Boolean, default: false },
        content: { type: String, default: "" },
        status: { 
            type: String, 
            enum: ["Açık", "Çözüldü", "Devam Ediyor", "İptal"],
            default: "Açık" 
        },
        resolvedAt: { type: Date },
        resolutionNote: { type: String, default: "" }
    },

    voiceDurationMinutes: { type: Number, default: 0 }, // Ses kanalındaki görüşme süresi (dakika)
    voiceVerified: { type: Boolean, default: false }, // Ses kanalında canlı yapılıp yapılmadığı

    completedAt: { type: Date, default: Date.now }
});

OneOnOneRecord.index({ guildID: 1, weekKey: 1, memberID: 1 }, { unique: true });
OneOnOneRecord.index({ guildID: 1, managerID: 1, weekKey: 1 });
OneOnOneRecord.index({ guildID: 1, memberID: 1 });
OneOnOneRecord.index({ guildID: 1, "followUp.required": 1, "followUp.status": 1 });

module.exports = model("OneOnOneRecord", OneOnOneRecord);
