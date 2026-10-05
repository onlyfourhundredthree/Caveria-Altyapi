const InviteDelete = require('../Modules/Guild/InviteDelete');

module.exports = async (...args) => {
    const modules = [
        { name: 'InviteDelete', func: InviteDelete }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] inviteDelete -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'inviteDelete'
};
