const { PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class EmojiService {
    static async execute(context, linkArg, nameArg, messageAttachments = null) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const { toji_onay, toji_iptal } = ConfigManager.get("Emojis") || { toji_onay: "✅", toji_iptal: "❌" };

        if (!member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers) &&
            !member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !ConfigManager.isOwner(member)) {
            const errObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_iptal} Bu komutu kullanmak için gerekli yetkiye sahip değilsin!` }] }]
            };
            if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
            return context.reply(errObj).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
        }

        let link, name;

        if (messageAttachments && messageAttachments.size > 0) {
            const firstAttach = messageAttachments.first();
            link = firstAttach.url;
            name = nameArg || linkArg || firstAttach.name.replace(/\.[^/.]+$/, "");
        } else {
            if (!linkArg) {
                const errObj = {
                    flags: [MessageFlags.IsComponentsV2],
                    components: [{ type: 17, components: [{ type: 10, content: `> ${toji_iptal} Lütfen bir emoji, link veya görsel belirtin.` }] }]
                };
                if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
                return context.reply(errObj).then(msg => setTimeout(() => msg.delete().catch(() => { }), 5000));
            }

            const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
            const match = linkArg.match(emojiRegex);

            if (match) {
                const animated = match[1] === 'a';
                const emojiName = match[2];
                const emojiId = match[3];
                link = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}`;
                name = nameArg || emojiName;
            } else {
                link = linkArg;
                name = nameArg || "yeni_emoji";
            }
        }

        try {
            const emoji = await guild.emojis.create({ attachment: link, name: name });
            const sucObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_onay} **${emoji.name}** emojisi başarıyla sunucuya eklendi! ${emoji}` }] }]
            };
            
            if (isInteraction) return context.reply(sucObj);
            return context.channel.send(sucObj);
        } catch (error) {
            console.error(error);
            let errContent = "Bir hata oluştu. Linkin geçerli olduğundan veya dosya boyutunun uygun olduğundan emin olun.";
            if (error.code === 30008) errContent = "Maksimum emoji sayısına ulaşıldı!";
            if (error.code === 50035) errContent = "Geçersiz form body veya görsel formatı.";

            const errObj = {
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ${toji_iptal} Emoji eklenirken hata oluştu: ${errContent}` }] }]
            };
            if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
            return context.reply(errObj).then(msg => setTimeout(() => msg.delete().catch(() => { }), 10000));
        }
    }
}

module.exports = EmojiService;
