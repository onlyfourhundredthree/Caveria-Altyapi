const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sil")
        .setDescription("Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.")
        .addIntegerOption(option =>
            option.setName("miktar")
                .setDescription("Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100))
        .addBooleanOption(option =>
            option.setName("hepsi")
                .setDescription("Belirtilen miktardaki mesajı toplu olarak kanaldan kalıcı olarak temizler.")),

    async execute(interaction) {
        const { member, channel, options } = interaction;

        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !ConfigManager.isOwner(member)) {
            return interaction.reply({ 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ℹ️ Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısınız.` }] }]
            });
        }

        const hepsi = options.getBoolean("hepsi");
        const amount = options.getInteger("miktar");

        if (hepsi) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            let deletedTotal = 0;
            let deleted;
            do {
                deleted = await channel.bulkDelete(100, true).catch(() => new Map());
                deletedTotal += deleted.size;
            } while (deleted && deleted.size > 0);

            return interaction.editReply({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> 🗑️ Kanal başarıyla temizlendi! **${deletedTotal}** adet (14 günden yeni) mesaj silindi.` }] }]
            });
        }

        if (!amount) {
            return interaction.reply({ 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ℹ️ Lütfen bir miktar belirtin veya **hepsi: True** seçeneğini kullanın.` }] }]
            });
        }

        await channel.bulkDelete(amount, true).then(deletedMessages => {
            interaction.reply({ 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> 🗑️ Başarıyla **${deletedMessages.size}** adet mesaj silindi.` }] }]
            });
        }).catch(err => {
            console.error(err);
            interaction.reply({ 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ⚠️ Mesajlar silinirken bir hata oluştu (14 günden eski mesajlar silinemez).` }] }]
            });
        });
    }
};
