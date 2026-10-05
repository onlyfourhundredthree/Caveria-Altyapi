const { SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const ApplicationPanel = require("../../../Core/Database/ApplicationPanel");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("başvuru-oluştur")
        .setDescription("Yeni bir başvuru paneli oluşturur.")
        .addStringOption(o => o.setName("ad").setDescription("Panel adı").setRequired(true))
        .addStringOption(o => o.setName("custom_id").setDescription("Buton custom ID (benzersiz)").setRequired(true))
        .addStringOption(o => o.setName("sorular").setDescription("Sorular (| ile ayır)").setRequired(true))
        .addStringOption(o => o.setName("onay_rolleri").setDescription("Onaylayabilecek rol IDleri (virgülle ayır)").setRequired(false))
        .addStringOption(o => o.setName("verilecek_roller").setDescription("Onayda verilecek rol IDleri (virgülle ayır)").setRequired(false))
        .addIntegerOption(o => o.setName("sure").setDescription("Toplam başvuru süresi (dakika)").setRequired(false)),

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });
        }

        const name = interaction.options.getString("ad");
        const customId = interaction.options.getString("custom_id");
        const questionsStr = interaction.options.getString("sorular");
        const approveStr = interaction.options.getString("onay_rolleri") || "";
        const giveStr = interaction.options.getString("verilecek_roller") || "";
        const timeLimit = interaction.options.getInteger("sure") || 10;

        const existing = await ApplicationPanel.findOne({ customId });
        if (existing) return interaction.reply({ content: `❌ \`${customId}\` ID'si zaten kullanılıyor.`, flags: [MessageFlags.Ephemeral] });

        const questions = questionsStr.split("|").map(q => ({ question: q.trim() })).filter(q => q.question);
        if (questions.length === 0) return interaction.reply({ content: "En az 1 soru belirtmelisin.", flags: [MessageFlags.Ephemeral] });

        const approveRoles = approveStr.split(",").map(r => r.trim()).filter(r => r);
        const giveRoles = giveStr.split(",").map(r => r.trim()).filter(r => r);

        await ApplicationPanel.create({
            guildID: interaction.guild.id,
            name,
            customId,
            questions,
            answerTimeLimit: timeLimit,
            approveRoles,
            giveRoles
        });

        return interaction.reply({
            content: `✅ **${name}** paneli oluşturuldu!\n\n📋 **Panel ID:** \`${customId}\`\n🔘 **Buton Custom ID:** \`app_start_${customId}\`\n📝 Soru: ${questions.length} | ⏱ Süre: ${timeLimit} dk\n👥 Onay: ${approveRoles.length || 0} rol | 🎁 Verilecek: ${giveRoles.length || 0} rol`,
            flags: [MessageFlags.Ephemeral]
        });
    }
};
