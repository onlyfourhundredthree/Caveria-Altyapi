const AFK = require("../../Core/Database/AFK");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (oldState, newState) => {
    if (newState.member.user.bot) return;

    // Check if user is AFK
    const afkData = await AFK.findOne({ userID: newState.id });
    if (!afkData) return;

    const publicVoices = ConfigManager.get("Channels.PublicVoices") || [];
    
    // Yalnızca public bir ses kanalında olup olmadığına bakıyoruz
    const isNowPublic = newState.channelId && publicVoices.includes(newState.channelId);
    
    let shouldRemoveAFK = false;

    // Durum 1: Kullanıcı ses kanalını değiştirdi ve yeni girdiği kanal public bir kanal
    if (oldState.channelId !== newState.channelId && isNowPublic) {
        shouldRemoveAFK = true;
    }

    // Durum 2: Kullanıcı halihazırda public bir kanalda ve mikrofonunu açtı
    // selfMute veya serverMute'dan biri açıldıysa (yani önceden kapalıydı, şimdi açık)
    if (!shouldRemoveAFK && isNowPublic && oldState.channelId === newState.channelId) {
        const wasMuted = oldState.selfMute || oldState.serverMute;
        const isMutedNow = newState.selfMute || newState.serverMute;
        
        // Mikrofon kapalıyken açıldıysa
        if (wasMuted && !isMutedNow) {
            shouldRemoveAFK = true;
        }
    }

    if (shouldRemoveAFK) {
        await AFK.deleteOne({ userID: newState.id });
        
        // Ses kanalında AFK'dan çıkış yapıldığı için kullanıcıya bilgi mesajı verebiliriz
        // veya sessizce kaldırabiliriz. Sessiz kaldırmak spam'i önler.
    }
};
