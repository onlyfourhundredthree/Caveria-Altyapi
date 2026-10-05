const GuardRoleDelete = require('../Modules/Guard/GuardRoleDelete');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardRoleDelete', func: GuardRoleDelete }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').roleDelete });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] roleDelete -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'roleDelete'
};
