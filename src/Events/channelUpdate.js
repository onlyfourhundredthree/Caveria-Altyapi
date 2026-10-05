const GuardChannelUpdate = require('../Modules/Guard/GuardChannelUpdate');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardChannelUpdate', func: GuardChannelUpdate }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').channelUpdate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] channelUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'channelUpdate'
};
