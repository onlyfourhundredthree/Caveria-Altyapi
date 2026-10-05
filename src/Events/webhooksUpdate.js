const GuardWebhookUpdate = require('../Modules/Guard/GuardWebhookUpdate');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuardWebhookUpdate', func: GuardWebhookUpdate }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] webhooksUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'webhooksUpdate'
};
