const GuardBanAdd = require('../Modules/Guard/GuardBanAdd');
const RightClickBanLog = require('../Modules/Guard/RightClickBanLog');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardBanAdd', func: GuardBanAdd },
        { name: 'RightClickBanLog', func: RightClickBanLog }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] guildBanAdd -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'guildBanAdd'
};
