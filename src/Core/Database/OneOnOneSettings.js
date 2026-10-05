const { Schema, model } = require("mongoose");

const OneOnOneSettings = new Schema({
    guildID: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true },
    managerRoleId: { type: String, default: "" }, // Backward compatibility
    managerRoleIds: [{ type: String }], // Çoklu 1E1 Yöneticileri Rolü
    maxQuotaPerManager: { type: Number, default: 5 }, // Varsayılan max yetkili sayısı
    reportChannelId: { type: String, default: "" }, // 1E1 Log ve Rapor Kanalı
    rewardXP: { type: Number, default: 250 }, // 1E1 Tamamlama Görev XP Ödülü
    reminderEnabled: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = model("OneOnOneSettings", OneOnOneSettings);
