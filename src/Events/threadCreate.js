const ThreadTaskProgress = require('../Modules/Channel/ThreadTaskProgress');

module.exports = async (...args) => {
    const modules = [
        { name: 'ThreadTaskProgress', func: ThreadTaskProgress }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] threadCreate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'threadCreate'
};
