const GuardEmojiUpdate = require('../Modules/Guard/GuardEmojiUpdate');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardEmojiUpdate', func: GuardEmojiUpdate }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').emojiUpdate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] emojiUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'emojiUpdate'
};
