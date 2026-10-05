const InviteCreate = require('../Modules/Guild/InviteCreate');

module.exports = async (...args) => {
    const modules = [
        { name: 'InviteCreate', func: InviteCreate }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] inviteCreate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'inviteCreate'
};
