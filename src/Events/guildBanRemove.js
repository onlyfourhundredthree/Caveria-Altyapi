const ForcebanCheck = require('../Modules/Guard/ForcebanCheck');
const BanRemoveTracker = require('../Modules/Moderation/BanRemoveTracker');

module.exports = async (...args) => {
    const modules = [
        { name: 'ForcebanCheck', func: ForcebanCheck },
        { name: 'BanRemoveTracker', func: BanRemoveTracker }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] guildBanRemove -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'guildBanRemove'
};
