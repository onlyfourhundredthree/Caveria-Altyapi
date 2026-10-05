const GuardRoleUpdate = require('../Modules/Guard/GuardRoleUpdate');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardRoleUpdate', func: GuardRoleUpdate }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').roleUpdate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] roleUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'roleUpdate'
};
