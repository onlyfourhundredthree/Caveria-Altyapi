const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const RoleButton = require("../../../Core/Database/RoleButton");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rolbutonu-oluştur")
        .setDescription("Butona tıklandığında rol verecek/alacak bir sistem (kural) oluşturur.")
        .addStringOption(o => o.setName("custom_id").setDescription("Butonun arka plan kimliği (Örn: cekilis_rol)").setRequired(true))
        .addRoleOption(o => o.setName("rol").setDescription("İşlem yapılacak rol").setRequired(true))
        .addStringOption(o => 
            o.setName("aksiyon")
            .setDescription("Kullanıcı butona basınca ne yapılsın?")
            .setRequired(true)
            .addChoices(
                { name: "Sadece Rol Ver", value: "give" },
                { name: "Sadece Rol Al", value: "take" },
                { name: "Duruma Göre Değiştir (Toggle)", value: "toggle" }
            )
        )
        .addStringOption(o => o.setName("bildirim_mesaji").setDescription("İşlem başarılı olduğunda çıkacak mesaj").setRequired(false)),

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });
        }

        const customIdRaw = interaction.options.getString("custom_id").trim();
        const customId = customIdRaw.replace(/[^a-zA-Z0-9_-]/g, ""); // Güvenlik: sadece harf, rakam ve tire

        if (!customId) {
            return interaction.reply({ content: "❌ Lütfen geçerli bir custom_id girin (Boşluk veya özel karakter kullanmayın).", flags: [MessageFlags.Ephemeral] });
        }

        const role = interaction.options.getRole("rol");
        const actionType = interaction.options.getString("aksiyon");
        const successMessage = interaction.options.getString("bildirim_mesaji") || "";

        const existing = await RoleButton.findOne({ guildID: interaction.guild.id, customId });
        if (existing) {
            return interaction.reply({ content: `❌ \`${customId}\` ID'si zaten kullanımda. Farklı bir isim seçin.`, flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.guild.members.me.roles.highest.position <= role.position) {
            return interaction.reply({ content: `❌ Etiketlediğiniz rol benim rolümden yüksek olduğu için veremem/alamam. Lütfen rolümü yukarı taşıyın.`, flags: [MessageFlags.Ephemeral] });
        }

        await RoleButton.create({
            guildID: interaction.guild.id,
            customId,
            roleId: role.id,
            actionType,
            successMessage
        });

        const actionText = actionType === "give" ? "Rol Verme" : actionType === "take" ? "Rol Alma" : "Rol Değiştirme (Verme/Alma)";

        return interaction.reply({
            content: `✅ **Rol Buton Kuralı Oluşturuldu!**\n\n📌 **Role Verilecek Aksiyon:** \`${actionText}\`\n🎭 **İşlem Görecek Rol:** ${role}\n📝 **Bildirim Mesajı:** \`${successMessage || "Belirtilmedi"}\`\n\n👉 **Kullanım:** .mesajoluştur vb. menüler ile bir buton oluştururken Custom ID (Özel ID) kısmına tam olarak şunu yazmalısınız:\n\`\`\`rolebtn_${customId}\`\`\``,
            flags: [MessageFlags.Ephemeral]
        });
    }
};
