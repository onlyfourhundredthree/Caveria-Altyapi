const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const Punitives = require("../../../Core/Database/Punitives");
const { PermissionsBitField, MessageFlags } = require('discord.js');

module.exports = {
    conf: {
        usages: ["forceban", "force-ban", "forceban-sistemi"],
        description: "Bir kullanıcıyı sunucudan yasaklar.",
        category: "Owners",
        usage: ".forceban <user_id|mention> <sebep>"
    },

    run: async (client, message, args) => {
        if (!ConfigManager.isOwner(message.member)) {
            return message.reply("Bu komutu kullanmaya yetkiniz yok.").then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            });
        }

        let user = message.mentions.users.first() || client.users.cache.get(args[0]) || await client.users.fetch(args[0]).catch(() => null);
        let targetId = user ? user.id : args[0];

        if (!targetId) {
            return message.reply("Bir kullanıcı veya ID belirtmelisiniz.").then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            });
        }

        if (targetId === message.author.id) {
            return message.reply("Kendinize işlem uygulayamazsınız.").then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 5000);
            });
        }

        let Reason = args.splice(1).join(" ");
        if (!Reason) Reason = "Sebep belirtilmedi.";

        try {
            const forcebanData = await Punitives.findOne({ Member: targetId, Type: "Kalkmaz Yasaklama", Active: true });

            if (forcebanData) {
                await Punitives.updateOne({ No: forcebanData.No }, { $set: { Active: false, Expried: Date.now(), Remover: message.author.id } });
                await message.guild.members.unban(targetId).catch(err => {
                    console.error("Unban failed (maybe not banned), but DB removed:", err.message);
                });

                const emojis = ConfigManager.get("Emojis") || {};
                const successEmoji = emojis.toji_onay || "🟢";
                const responseLayout = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `> ${successEmoji} **${user ? user.tag : targetId}** kullanıcısının forceban yasağı kaldırıldı.`
                            }
                        ]
                    }
                ];
                return message.channel.send({ flags: [MessageFlags.IsComponentsV2], components: responseLayout });

            } else {
                const target = message.guild.members.cache.get(targetId) || user || { id: targetId };
                await target.addPunitives(1, message.member, Reason, message);
            }

        } catch (err) {
            console.error(err);
            message.reply("İşlem sırasında bir hata oluştu.");
        }
    },
};

