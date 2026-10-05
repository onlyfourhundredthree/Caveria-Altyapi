const { MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class YetkiTasiService {
    static async execute(context, sourceIdRaw, targetIdRaw) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;
        const emojis = ConfigManager.get("Emojis") || {};

        if (!ConfigManager.isOwner(member)) {
            const errObj = { content: "Bu komutu kullanmaya yetkiniz yok." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const sourceId = sourceIdRaw?.replace(/[<@!>]/g, '');
        const targetId = targetIdRaw?.replace(/[<@!>]/g, '');

        if (!sourceId || !targetId) {
            const errObj = { content: "Lütfen kaynak ve hedef kullanıcıları belirtin." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const source = await guild.members.fetch(sourceId).catch(() => null);
        const target = await guild.members.fetch(targetId).catch(() => null);

        if (!source || !target) {
            const errObj = { content: "Belirttiğiniz kullanıcılar sunucuda bulunamadı." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (source.id === target.id) {
            const errObj = { content: "Aynı kullanıcı üzerinde işlem yapamazsınız." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (source.user.bot || target.user.bot) {
            const errObj = { content: "Botlar üzerinde işlem yapamazsınız." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        if (!source.manageable || !target.manageable) {
            const errObj = { content: "Bu kullanıcılardan birinin rollerini yönetmeye yetkim yok. Rol hiyerarşimi kontrol edin." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const rolesToGive = source.roles.cache
            .filter(r => r.id !== guild.id && r.editable)
            .map(r => r.id);

        let targetSuccess = true;
        let sourceSuccess = true;

        await target.roles.add(rolesToGive).catch(err => {
            targetSuccess = false;
            console.error("Hedefe rol ekleme hatası:", err);
        });

        const boosterRole = guild.roles.cache.find(r => r.tags?.premiumSubscriberRole);

        let keepRoles = source.roles.cache
            .filter(r => r.id === guild.id 
                || r.name.toLowerCase().includes("üye") 
                || (boosterRole && r.id === boosterRole.id) 
            )
            .map(r => r.id);

        await source.roles.set(keepRoles).catch(err => {
            sourceSuccess = false;
            console.error("Kaynaktan rol alma/set etme hatası:", err);
        });

        const success = targetSuccess && sourceSuccess;

        const panel = new V2PanelBuilder()
            .addAccessory((isInteraction ? context.user : context.author).displayAvatarURL({ extension: 'png' }), `> ## ${emojis.toji_sparkles || "✨"} Yetki Taşıma İşlemi\n> **Yetkili:** ${member}`)
            .addDivider(1)
            .addText(`**Kaynak Kullanıcı:** ${source} (\`${source.id}\`)\n**Hedef Kullanıcı:** ${target} (\`${target.id}\`)\n**Durum:** ${success ? (emojis.toji_onay || "✅") + " Başarılı" : (emojis.toji_iptal || "❌") + " Başarısız"}`);

        const replyObj = {
            flags: [MessageFlags.IsComponentsV2],
            components: panel.toJSON(),
            allowedMentions: { parse: [] }
        };

        if (isInteraction) {
            return context.reply(replyObj);
        } else {
            return context.reply(replyObj);
        }
    }
}

module.exports = YetkiTasiService;
