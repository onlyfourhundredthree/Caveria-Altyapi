const GuardServer = require('../Modules/Guard/GuardServer');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardServer', func: GuardServer }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').guildUpdate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] guildUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'guildUpdate'
};
