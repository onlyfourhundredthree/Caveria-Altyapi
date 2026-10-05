const DmReactionremove = require('../Modules/Message/DmReactionremove');

module.exports = async (...args) => {
    const modules = [
        { name: 'DmReactionremove', func: DmReactionremove }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] messageReactionRemove -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'messageReactionRemove'
};
