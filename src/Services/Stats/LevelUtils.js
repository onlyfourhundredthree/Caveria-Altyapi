module.exports = {
    // Mesaj seviyesi hesabı (30.000 mesaj = ~Level 40)
    calculateMessageLevel: (totalMessages) => {
        if (!totalMessages || totalMessages < 0) return 0;
        if (totalMessages < 1000) {
            return Math.floor(Math.sqrt(totalMessages / 10));
        } else {
            const extra = totalMessages - 1000;
            const extraLevel = Math.pow(extra / 250, 1 / 1.4);
            return Math.floor(10 + extraLevel);
        }
    },

    // Ses seviyesi hesabı (Dakika bazlı: 10 Saat = Lvl 10, 244 Saat = Lvl 40)
    calculateVoiceLevel: (totalVoiceMs) => {
        if (!totalVoiceMs || totalVoiceMs < 0) return 0;
        const voiceMinutes = Math.floor(totalVoiceMs / 60000);
        if (voiceMinutes < 600) {
            return Math.floor(Math.sqrt(voiceMinutes / 6));
        } else {
            const extra = voiceMinutes - 600;
            const extraLevel = Math.pow(extra / 120, 1 / 1.4);
            return Math.floor(10 + extraLevel);
        }
    },

    // Belirtilen mesaj seviyesine ulaşmak için gereken toplam XP (mesaj sayısı)
    getMessageXP: (level) => {
        if (level <= 0) return 0;
        if (level <= 10) {
            return Math.ceil(10 * Math.pow(level, 2));
        } else {
            const extra = level - 10;
            return Math.ceil(1000 + 250 * Math.pow(extra, 1.4));
        }
    },

    // Belirtilen ses seviyesine ulaşmak için gereken toplam XP (dakika)
    getVoiceXP: (level) => {
        if (level <= 0) return 0;
        if (level <= 10) {
            return Math.ceil(6 * Math.pow(level, 2));
        } else {
            const extra = level - 10;
            return Math.ceil(600 + 120 * Math.pow(extra, 1.4));
        }
    },

    // Belirtilen ses seviyesine ulaşmak için gereken milisaniye
    getVoiceXPInMs: (level) => {
        if (level <= 0) return 0;
        if (level <= 10) {
            return Math.ceil(6 * Math.pow(level, 2)) * 60000;
        } else {
            const extra = level - 10;
            return Math.ceil(600 + 120 * Math.pow(extra, 1.4)) * 60000;
        }
    }
};
