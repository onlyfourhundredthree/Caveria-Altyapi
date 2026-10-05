const GuardEmojiCreate = require('../Modules/Guard/GuardEmojiCreate');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardEmojiCreate', func: GuardEmojiCreate }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').emojiCreate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] emojiCreate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'emojiCreate'
};
