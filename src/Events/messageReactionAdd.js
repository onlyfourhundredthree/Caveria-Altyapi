const DmReactionadd = require('../Modules/Message/DmReactionadd');

module.exports = async (...args) => {
    const modules = [
        { name: 'DmReactionadd', func: DmReactionadd }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] messageReactionAdd -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'messageReactionAdd'
};
