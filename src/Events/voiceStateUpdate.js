const AFKVoiceControl = require('../Modules/Voice/AFKVoiceControl');
const CheckMute = require('../Modules/Voice/CheckMute');
const LobbyCleaner = require('../Modules/Voice/LobbyCleaner');
const PermanentRoomVoiceTracker = require('../Modules/Voice/PermanentRoomVoiceTracker');
const PrivateRoomVoiceStateUpdate = require('../Modules/Voice/PrivateRoomVoiceStateUpdate');
const StreamStats = require('../Modules/Voice/StreamStats');
const VoiceLog = require('../Modules/Voice/VoiceLog');
const VoiceStats = require('../Modules/Voice/VoiceStats');

module.exports = async (oldState, newState) => {
    const modules = [
        { name: 'AFKVoiceControl', func: AFKVoiceControl },
        { name: 'CheckMute', func: CheckMute },
        { name: 'LobbyCleaner', func: LobbyCleaner },
        { name: 'PermanentRoomVoiceTracker', func: PermanentRoomVoiceTracker },
        { name: 'PrivateRoomVoiceStateUpdate', func: PrivateRoomVoiceStateUpdate },
        { name: 'StreamStats', func: StreamStats },
        { name: 'VoiceLog', func: VoiceLog },
        { name: 'VoiceStats', func: VoiceStats },
        { name: 'VampireLobbyCleaner', func: require('../Modules/Voice/VampireLobbyCleaner') },
        { name: 'OneOnOneVoiceTracker', func: require('../Modules/Voice/OneOnOneVoiceTracker') },
        { name: 'OryantasyonVoiceTracker', func: require('../Services/Staff/OryantasyonService').handleVoiceStateUpdate }
    ];

    for (const mod of modules) {
        try {
            await mod.func(oldState, newState);
        } catch (error) {
            console.error(`[Listener Error] voiceStateUpdate -> ${mod.name} modülünde hata oluştu:`, error);
        }
    }
};

module.exports.conf = {
    name: "voiceStateUpdate"
};
