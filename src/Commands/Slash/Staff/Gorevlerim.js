const { SlashCommandBuilder } = require('discord.js');
const StaffService = require("../../../Services/Staff/StaffService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("görevlerim")
        .setDescription("Görev ve yetki ilerleme durumunuzu görüntüler.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("Görüntülemek istediğiniz kullanıcıyı seçin.")
                .setRequired(false)),
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: "Belirtilen kullanıcı sunucuda bulunamadı.", ephemeral: true });
        }

        await interaction.deferReply();
        
        try {
            const { renderTaskCanvas } = require("../../../Services/Staff/TaskCanvas");
            const buffers = await renderTaskCanvas(client, targetUser, member);
            if (!buffers || buffers.length === 0) {
                return interaction.editReply({ content: "Bu kullanıcının yetkili bilgisi bulunamadı." });
            }

            const { AttachmentBuilder } = require("discord.js");
            const attachments = buffers.map((buf, i) => new AttachmentBuilder(buf, { name: `task_panel_${i}.png` }));
            
            const containerComponents = [];
            for (let i = 0; i < buffers.length; i++) {
                containerComponents.push({
                    type: 12, // Container
                    items: [{ media: { url: `attachment://task_panel_${i}.png` } }]
                });
                if (i !== buffers.length - 1) {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                }
            }

            const components = [{ type: 17, components: containerComponents }];
            
            return interaction.editReply({
                content: null,
                components,
                files: attachments,
                flags: [1 << 15]
            });
        } catch (error) {
            console.error("Görevlerim slash komutu hatası:", error);
            await interaction.editReply({ content: "Görsel oluşturulurken bir hata meydana geldi." });
        }
    }
};
