const GuardMemberRemove = require('../Modules/Guild/GuardMemberRemove');
const InviteLeave = require('../Modules/Guild/InviteLeave');

module.exports = async (member) => {
    const modules = [
        { name: 'GuardMemberRemove', func: GuardMemberRemove },
        { name: 'InviteLeave', func: InviteLeave }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').guildMemberRemove });
    modules.push({ name: 'OneOnOneLeave', func: (m) => require('../Services/Systems/OneOnOneService').onMemberLeave(m) });
    for (const mod of modules) {
        try {
            await mod.func(member);
        } catch (error) {
            console.error(`[Listener Error] guildMemberRemove -> ${mod.name} modülünde hata oluştu:`, error);
        }
    }
};

module.exports.conf = {
    name: "guildMemberRemove"
};
