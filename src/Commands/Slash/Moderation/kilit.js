const { SlashCommandBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kilit")
        .setDescription("Sohbetin aşırı hızlı aktığı veya sorun çıktığı durumlarda kanalı yazışmaya kapatır."),

    async execute(interaction) {
        const { member, guild, channel, user: author } = interaction;

        if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !ConfigManager.isOwner(member)) {
            return interaction.reply({ 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ℹ️ Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısınız.` }] }]
            });
        }

        const everyone = guild.roles.everyone;
        const currentPerms = channel.permissionsFor(everyone);
        const isLocked = !currentPerms.has(PermissionsBitField.Flags.SendMessages);

        if (isLocked) {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> 🔓 Kanal başarıyla mesaj gönderimine **açıldı**.` }] }]
            });
        } else {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: false });
            await interaction.reply({ 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> 🔒 Kanal başarıyla mesaj gönderimine **kapatıldı**.\n> Sadece yetkililer konuşabilir.` }] }]
            });
        }
    }
};
