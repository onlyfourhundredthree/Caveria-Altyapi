const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const RoleButton = require("../../../Core/Database/RoleButton");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolbutonu-liste")
        .setDescription("Oluşturulan tüm rol butonlarını listeler."),
    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Bu komutu kullanmak için yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const buttons = await RoleButton.find({ guildID: interaction.guild.id });

        if (buttons.length === 0) {
            return interaction.reply({ content: "Hiç rol butonu kuralı bulunmuyor.", flags: [MessageFlags.Ephemeral] });
        }

        let liste = `**Mevcut Rol Butonu Kuralları (${buttons.length} adet):**\n\n`;

        for (const btn of buttons) {
            const role = interaction.guild.roles.cache.get(btn.roleId);
            const actionText = btn.actionType === "toggle" ? "Değiştir (Ver/Al)" : (btn.actionType === "give" ? "Sadece Ver" : "Sadece Al");
            liste += `> 🏷️ **ID:** \`${btn.customId}\`\n`;
            liste += `> 🎯 **Rol:** ${role ? role.toString() : "\`Bilinmeyen Rol\`"}\n`;
            liste += `> ⚙️ **İşlem:** ${actionText}\n`;
            if (btn.successMessage) {
                liste += `> 💬 **Mesaj:** ${btn.successMessage}\n`;
            }
            liste += `\n`;
        }

        const emojis = ConfigManager.get("Emojis") || {};
        
        // Eğer 2000 karakteri aşarsa, txt olarak gönderelim
        if (liste.length > 2000) {
            const buffer = Buffer.from(liste, "utf-8");
            return interaction.reply({
                content: `${emojis.toji_onay || "✅"} Çok fazla buton kuralı olduğu için dosya olarak gönderildi.`,
                files: [{ name: "rol-butonlari.txt", attachment: buffer }],
                flags: [MessageFlags.Ephemeral]
            });
        }

        const componentsV2 = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: liste
                    }
                ]
            }
        ];

        return interaction.reply({
            flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
            components: componentsV2
        });
    }
};
