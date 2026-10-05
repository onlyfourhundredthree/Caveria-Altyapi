const AFK = require("../../Core/Database/AFK");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const moment = require("moment");

module.exports = async (message) => {
    if (message.author.bot || !message.guild) return;

    const afkData = await AFK.findOne({ userID: message.author.id });
    if (afkData) {
        // Eğer kullanıcı henüz birkaç saniye önce AFK olduysa, AFK moduna girdiği komutun kendi mesajıyla AFK'dan çıkmasını engellemek için 3 saniyelik bir koruma payı bırakıyoruz.
        if (Date.now() - afkData.date < 3000) return;

        await AFK.deleteOne({ userID: message.author.id });
        
        const emojis = ConfigManager.get("Emojis") || {};
        const maravilhaOnay = emojis.toji_onay ? `${emojis.toji_onay} ` : "";
        
        const replyV2 = [{
            type: 17,
            components: [
                {
                    type: 10,
                    content: `> ${maravilhaOnay} <@${message.author.id}>, **AFK** modundan çıkış yaptın. Tekrar hoş geldin!`
                }
            ]
        }];

        const msg = await message.channel.send({ components: replyV2, flags: [1 << 15] });
        setTimeout(() => {
            msg.delete().catch(() => {});
        }, 10000);
    }

    if (message.mentions.users.size > 0) {
        let isDeleted = false;
        const emojis = ConfigManager.get("Emojis") || {};
        const maravilhaInfo = emojis.toji_info ? `${emojis.toji_info} ` : "ℹ️ ";

        for (const user of message.mentions.users.values()) {
            const userAfkData = await AFK.findOne({ userID: user.id });
            if (userAfkData) {
                if (!isDeleted) {
                    if (message.deletable) {
                        await message.delete().catch(() => {});
                        isDeleted = true;
                    }
                }

                const duration = moment.duration(Date.now() - userAfkData.date).format("D [gün], H [saat], m [dakika], s [saniye]");
                
                const afkAlertV2 = [{
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ${maravilhaInfo} <@${user.id}> şu anda **AFK** modunda.\n> \n> **Sebep:** \`${userAfkData.reason}\`\n> **Süre:** \`${duration}\``
                        }
                    ]
                }];

                const alertMsg = await message.channel.send({ components: afkAlertV2, allowedMentions: { repliedUser: false }, flags: [1 << 15] });
                setTimeout(() => {
                    alertMsg.delete().catch(() => {});
                }, 10000);

                break;
            }
        }
    }
};
