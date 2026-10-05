const GuardChannelCreate = require('../Modules/Guard/GuardChannelCreate');
const ThreadTaskProgress = require('../Modules/Channel/ThreadTaskProgress');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardChannelCreate', func: GuardChannelCreate },
        { name: 'ThreadTaskProgress', func: ThreadTaskProgress }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').channelCreate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] channelCreate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'channelCreate'
};
