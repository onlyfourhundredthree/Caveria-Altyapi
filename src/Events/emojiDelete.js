const GuardEmojiDelete = require('../Modules/Guard/GuardEmojiDelete');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardEmojiDelete', func: GuardEmojiDelete }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').emojiDelete });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] emojiDelete -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'emojiDelete'
};
