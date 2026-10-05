const GuardMemberAdd = require('../Modules/Guild/GuardMemberAdd');
const InviteJoin = require('../Modules/Guild/InviteJoin');
const JoinEvent = require('../Modules/Guild/JoinEvent');

module.exports = async (member) => {
    const RoomJoinRestore = require('../Modules/Guild/RoomJoinRestore');

    const modules = [
        { name: 'RoomJoinRestore', func: RoomJoinRestore },
        { name: 'GuardMemberAdd', func: GuardMemberAdd },
        { name: 'InviteJoin', func: InviteJoin },
        { name: 'JoinEvent', func: JoinEvent }
    ];

    modules.push({ name: 'LogHandler', func: require('../Modules/Ready/LogHandler').guildMemberAdd });
    for (const mod of modules) {
        try {
            await mod.func(member);
        } catch (error) {
            console.error(`[Listener Error] guildMemberAdd -> ${mod.name} modülünde hata oluştu:`, error);
        }
    }
};

module.exports.conf = {
    name: "guildMemberAdd"
};
