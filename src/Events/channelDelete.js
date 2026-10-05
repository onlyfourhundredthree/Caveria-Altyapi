const GuardChannelDelete = require('../Modules/Guard/GuardChannelDelete');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardChannelDelete', func: GuardChannelDelete }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').channelDelete });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] channelDelete -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'channelDelete'
};
