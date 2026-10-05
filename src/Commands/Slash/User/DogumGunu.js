const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const generateBirthdayCard = require('../../../Core/Handlers/BirthdayCanvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("doğum-günü")
        .setDescription("Bir kullanıcının doğum gününü özel bir kartla kutlayın")
        .addUserOption(option => 
            option.setName("kullanıcı")
                .setDescription("Doğum gününü kutlamak istediğiniz kullanıcı")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("not")
                .setDescription("Karta eklemek istediğiniz özel not (İsteğe bağlı)")
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option.setName("fotoğraf")
                .setDescription("Karta eklemek istediğiniz özel fotoğraf (İsteğe bağlı)")
                .setRequired(false)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser("kullanıcı");
        const customNote = interaction.options.getString("not");

        const targetMember = interaction.options.getMember("kullanıcı");
        const displayName = targetMember ? targetMember.displayName : (targetUser.globalName || targetUser.username);
        
        const customPhoto = interaction.options.getAttachment("fotoğraf");

        const memberData = {
            username: displayName,
            avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
            customPhotoUrl: customPhoto ? customPhoto.url : null,
            note: customNote // will use default in Canvas if null
        };

        try {
            const buffer = await generateBirthdayCard(memberData);
            const attachment = new AttachmentBuilder(buffer, { name: 'birthday.png' });

            await interaction.editReply({
                content: `🎉 ${targetUser} kullanıcısının doğum günü kutlu olsun! 🎂`,
                files: [attachment]
            });
        } catch (error) {
            console.error("[BirthdayCard Error]", error);
            await interaction.editReply({ content: "Doğum günü kartı oluşturulurken bir hata oluştu." });
        }
    }
};
