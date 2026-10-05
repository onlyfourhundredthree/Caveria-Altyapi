const PermanentRoomService = require("../../../Services/PermanentRoomService");

module.exports = {
    conf: {
        usages: ["kalıcıoda", "poda", "kalicioda", "ekip", "team", "permanentroom", "permanent-room", "permanentroom-sistemi", "permanent-room-sistemi"],
        description: "Merkezi Kalıcı Oda Yönetim Panelini açar ve ayarları görüntüler.",
        category: "Staff",
        usage: ".kalıcıoda"
    },

    run: async (client, message, args) => {
        if (message.deletable) message.delete().catch(() => { });
        const payload = await PermanentRoomService.getDashboardPayload(client, message.member);
        return message.channel.send(payload);
    }
};
