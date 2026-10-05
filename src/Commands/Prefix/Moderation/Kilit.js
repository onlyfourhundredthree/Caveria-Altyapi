const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const { PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    conf: {
        usages: ["kilit", "kanal-kilit", "chat-kilit", "lock", "unlock", "kanal-kilit-sistemi"],
        description: "Bir kanalı kilitler veya kilidini açar.",
        category: "Moderation",
        usage: ".kilit <sebep|reason>"
    },

    run: async (client, message, args) => {
        const emojis = ConfigManager.get("Emojis") || {};
        const toji_info = emojis.toji_info || "ℹ️";
        const toji_nokta = emojis.toji_nokta || "⛔";
        const maravilha_tik = emojis.maravilha_tik || emojis.toji_onay || "✨";

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !ConfigManager.isOwner(message.member)) {
            return message.reply({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_info} Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısınız.` }] }]
            }).then(x => setTimeout(() => x.delete().catch(() => { }), 5000));
        }

        const everyone = message.guild.roles.everyone;
        const currentPerms = message.channel.permissionsFor(everyone);
        const isLocked = !currentPerms.has(PermissionsBitField.Flags.SendMessages);

        if (isLocked) {
            await message.channel.permissionOverwrites.edit(everyone, {
                SendMessages: null
            });
            return message.channel.send({
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${maravilha_tik} Kanal başarıyla mesaj gönderimine **açıldı**.` }] }]
            });
        } else {
            await message.channel.permissionOverwrites.edit(everyone, {
                SendMessages: false
            });
            return message.channel.send({
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_nokta} Kanal başarıyla mesaj gönderimine **kapatıldı**.\n> Sadece yetkililer konuşabilir.` }] }]
            });
        }
    },
};
