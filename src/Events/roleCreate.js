const GuardRoleCreate = require('../Modules/Guard/GuardRoleCreate');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardRoleCreate', func: GuardRoleCreate }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').roleCreate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] roleCreate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'roleCreate'
};
