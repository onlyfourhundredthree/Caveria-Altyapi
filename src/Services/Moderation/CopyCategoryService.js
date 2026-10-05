const { PermissionsBitField, MessageFlags, ChannelType } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

class CopyCategoryService {
    static async execute(context, categoryId) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;
        const emojis = ConfigManager.get("Emojis") || {};

        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !ConfigManager.isOwner(member)) {
            const panel = new V2PanelBuilder().addText(`> ${emojis.toji_info || "ℹ️"} Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısınız.`);
            return context.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() });
        }

        if (!categoryId) {
            const panel = new V2PanelBuilder().addText(`> ${emojis.toji_iptal || "❌"} Lütfen kopyalamak istediğiniz kategorinin ID'sini belirtin.`);
            return context.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() });
        }

        const sourceCategory = guild.channels.cache.get(categoryId);
        if (!sourceCategory || sourceCategory.type !== ChannelType.GuildCategory) {
            const panel = new V2PanelBuilder().addText(`> ${emojis.toji_iptal || "❌"} Belirtilen ID'ye sahip bir kategori bulunamadı.`);
            return context.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() });
        }

        try {
            const permissionOverwrites = sourceCategory.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                allow: overwrite.allow.bitfield,
                deny: overwrite.deny.bitfield,
                type: overwrite.type
            }));

            await guild.channels.create({
                name: sourceCategory.name,
                type: ChannelType.GuildCategory,
                permissionOverwrites: permissionOverwrites,
                position: sourceCategory.position + 1
            });

            const panel = new V2PanelBuilder().addText(`> ${emojis.toji_onay || "✅"} **${sourceCategory.name}** kategorisi tüm yetkileriyle birlikte başarıyla kopyalandı.`);
            await context.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() });
        } catch (error) {
            console.error("Kategori kopyalama hatası:", error);
            const panel = new V2PanelBuilder().addText(`> ${emojis.toji_iptal || "❌"} Kategori kopyalanırken bir hata oluştu: ${error.message}`);
            await context.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() });
        }
    }
}

module.exports = CopyCategoryService;
