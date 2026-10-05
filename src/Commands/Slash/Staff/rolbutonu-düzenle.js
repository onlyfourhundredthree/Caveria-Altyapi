const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const RoleButton = require("../../../Core/Database/RoleButton");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolbutonu-düzenle")
        .setDescription("Mevcut bir rol butonu kuralını düzenler.")
        .addStringOption(o => o.setName("custom_id").setDescription("Düzenlenecek butonun arka plan kimliği (Örn: cekilis_rol)").setRequired(true))
        .addRoleOption(o => o.setName("rol").setDescription("Yeni rol (Değiştirmek istemiyorsanız boş bırakın)").setRequired(false))
        .addStringOption(o => 
            o.setName("aksiyon")
            .setDescription("Yeni aksiyon (Değiştirmek istemiyorsanız boş bırakın)")
            .setRequired(false)
            .addChoices(
                { name: "Sadece Rol Ver", value: "give" },
                { name: "Sadece Rol Al", value: "take" },
                { name: "Duruma Göre Değiştir (Toggle)", value: "toggle" }
            )
        )
        .addStringOption(o => o.setName("bildirim_mesaji").setDescription("Yeni bildirim mesajı (Değiştirmek istemiyorsanız boş bırakın)").setRequired(false)),

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });
        }

        const customId = interaction.options.getString("custom_id").trim().replace(/[^a-zA-Z0-9_-]/g, "");

        const existing = await RoleButton.findOne({ guildID: interaction.guild.id, customId });
        if (!existing) {
            return interaction.reply({ content: `❌ \`${customId}\` ID'sine sahip bir kural bulunamadı.`, flags: [MessageFlags.Ephemeral] });
        }

        const newRole = interaction.options.getRole("rol");
        const newActionType = interaction.options.getString("aksiyon");
        const newSuccessMessage = interaction.options.getString("bildirim_mesaji");

        let updated = false;

        if (newRole) {
            if (interaction.guild.members.me.roles.highest.position <= newRole.position) {
                return interaction.reply({ content: `❌ Etiketlediğiniz rol benim rolümden yüksek olduğu için veremem/alamam. Lütfen rolümü yukarı taşıyın.`, flags: [MessageFlags.Ephemeral] });
            }
            existing.roleId = newRole.id;
            updated = true;
        }

        if (newActionType) {
            existing.actionType = newActionType;
            updated = true;
        }

        if (newSuccessMessage !== null) {
            existing.successMessage = newSuccessMessage;
            updated = true;
        }

        if (!updated) {
            return interaction.reply({ content: `⚠️ Hiçbir değişiklik yapmadınız. Değiştirmek istediğiniz alanları doldurun.`, flags: [MessageFlags.Ephemeral] });
        }

        await existing.save();

        const role = interaction.guild.roles.cache.get(existing.roleId);
        const actionText = existing.actionType === "give" ? "Rol Verme" : existing.actionType === "take" ? "Rol Alma" : "Rol Değiştirme (Verme/Alma)";

        return interaction.reply({
            content: `✅ **Rol Buton Kuralı Güncellendi!**\n\n📌 **Yeni Aksiyon:** \`${actionText}\`\n🎭 **Yeni Rol:** ${role || "\`Bilinmiyor\`"}\n📝 **Yeni Mesaj:** \`${existing.successMessage || "Belirtilmedi"}\`\n\nBu değişiklik mevcut panellerdeki \`rolebtn_${customId}\` butonlarına anında etki edecektir.`,
            flags: [MessageFlags.Ephemeral]
        });
    }
};
