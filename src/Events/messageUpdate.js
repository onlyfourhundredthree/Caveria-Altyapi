const DmUpdate = require('../Modules/Message/DmUpdate');
const MessageUpdate = require('../Modules/Message/MessageUpdate');
const PartnerEdit = require('../Modules/Guild/PartnerEdit');

module.exports = async (...args) => {
    const modules = [
        { name: 'DmUpdate', func: DmUpdate },
        { name: 'MessageUpdate', func: MessageUpdate },
        { name: 'PartnerEdit', func: PartnerEdit }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').messageUpdate });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] messageUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'messageUpdate'
};
