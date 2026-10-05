const { PermissionsBitField, EmbedBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["yetki-taşı", "yetki-tasi", "yetkitaşı", "yetkitasima", "yetki-tasima"],
        description: "Yetki-taşı komutu ile rollerin başka bir üyeye taşınmasını ve kaynağın 'üye' rollerine indirgenmesini sağlar.",
        category: "Staff",
        usage: ".yetki-taşı @KaynakKullanıcı @HedefKullanıcı"
    },


    run: async (client, message, args) => {
        if (
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !ConfigManager.isOwner(message.member)
        ) return message.reply("Bu komutu kullanmaya yetkiniz yok.").then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));

        let source = message.mentions.members.at(0)
        let target = message.mentions.members.at(1)

        if (!source || !target)
            return message.reply("İşlem yapabilmek için **iki kullanıcıyı** doğru sırada etiketlemelisiniz.\nDoğru Kullanım: `.yttasi @RolüAlınacakKullanıcı @RolüVerilecekKullanıcı`").then(msg => setTimeout(() => msg.delete().catch(() => { }), 10000));

        if (source.id === target.id)
            return message.reply("Aynı kullanıcı üzerinde işlem yapamazsınız.").then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));

        if (source.user.bot || target.user.bot)
            return message.reply("Botlar üzerinde işlem yapamazsınız.").then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));

        if (!source.manageable || !target.manageable)
            return message.reply("Bu kullanıcılardan birinin rollerini yönetmeye yetkim yok. Rol hiyerarşimi kontrol edin.").then(msg => setTimeout(() => msg.delete().catch(() => { }), 7000));

        const rolesToGive = source.roles.cache
            .filter(r => r.id !== message.guild.id && r.editable)
            .map(r => r.id);

        let targetSuccess = true;
        let sourceSuccess = true;

        await target.roles.add(rolesToGive).catch(err => {
            targetSuccess = false;
            console.error("Hedefe rol ekleme hatası:", err);
        });

        const boosterRole = message.guild.roles.cache.find(r => r.tags?.premiumSubscriberRole);

        let keepRoles = source.roles.cache
            .filter(r => r.id === message.guild.id // everyone
                || r.name.toLowerCase().includes("üye") // "üye" içeren
                || (boosterRole && r.id === boosterRole.id) // booster
            )
            .map(r => r.id);

        await source.roles.set(keepRoles).catch(err => {
            sourceSuccess = false;
            console.error("Kaynaktan rol alma/set etme hatası:", err);
        });

        const success = targetSuccess && sourceSuccess;

        const componentsV2 = [
            {
                type: 17, // Main Container
                accent_color: success ? 0x248046 : 0xFF3B30,
                components: [
                    {
                        type: 9, // Section with accessory
                        accessory: {
                            type: 11,
                            media: { url: message.author.displayAvatarURL({ extension: 'png' }) }
                        },
                        components: [
                            {
                                type: 10,
                                content: `> ## ${ConfigManager.get("Emojis.toji_sparkles") || "✨"} Yetki Taşıma İşlemi\n> **Yetkili:** ${message.member}`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `**Kaynak Kullanıcı:** ${source} (\`${source.id}\`)\n**Hedef Kullanıcı:** ${target} (\`${target.id}\`)\n**Durum:** ${success ? (ConfigManager.get("Emojis.toji_onay") || "✨") + " Başarılı" : (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Başarısız"}`
                    }
                ]
            }
        ];

        message.channel.send({
            flags: [MessageFlags.IsComponentsV2],
            components: componentsV2,
            allowedMentions: { parse: [] }
        });
    },
};
