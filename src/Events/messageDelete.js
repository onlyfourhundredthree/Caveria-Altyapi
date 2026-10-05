module.exports = async (...args) => {
    const modules = [
        { name: 'LogHandler', func: require('../Modules/Ready/LogHandler').messageDelete },
        { name: 'MentionDeleteNotifier', func: require('../Modules/Message/MentionDeleteNotifier') }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] messageDelete -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'messageDelete'
};
