const GuildMemberUpdate = require('../Modules/Guild/GuildMemberUpdate');
const ScreeningCheck = require('../Modules/Guild/ScreeningCheck');

module.exports = async (...args) => {
    const modules = [
        { name: 'GuildMemberUpdate', func: GuildMemberUpdate },
        { name: 'ScreeningCheck', func: ScreeningCheck }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').guildMemberUpdate });
    modules.push({ name: 'OwnerRoleGuard', func: require("../Core/Handlers/OwnerRoleGuard").guildMemberUpdate });
    modules.push({ name: 'CustomRoleGuard', func: require("../Core/Handlers/CustomRoleGuard").guildMemberUpdate });
    modules.push({ name: 'OneOnOneRoleUpdate', func: (oldM, newM) => require("../Services/Systems/OneOnOneService").onMemberUpdate(oldM, newM) });
    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error('[Listener Error] guildMemberUpdate -> ' + mod.name + ' modülünde hata oluştu:', error);
        }
    }
};

module.exports.conf = {
    name: 'guildMemberUpdate'
};
