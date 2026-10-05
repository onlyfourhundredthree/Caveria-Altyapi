const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const ApplicationPanel = require("../../../Core/Database/ApplicationPanel");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("başvurular")
        .setDescription("Aktif başvuru panellerini listeler."),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const panels = await ApplicationPanel.find({ guildID: interaction.guild.id, active: true }).lean();
        if (panels.length === 0) return interaction.editReply({ content: "Hiç aktif panel bulunamadı." });

        const lines = panels.map(p => {
            const approveMentions = p.approveRoles.map(id => {
                const role = interaction.guild.roles.cache.get(id);
                return role ? `<@&${role.id}>` : `\`${id}\``;
            }).join(", ") || "Yok";

            const giveMentions = p.giveRoles.map(id => {
                const role = interaction.guild.roles.cache.get(id);
                return role ? `<@&${role.id}>` : `\`${id}\``;
            }).join(", ") || "Yok";

            return `### ${p.name}\n` +
                `> **Custom ID:** \`${p.customId}\`\n` +
                `> **Buton ID:** \`app_start_${p.customId}\`\n` +
                `> **Sorular:** ${p.questions.length} adet\n` +
                `> **Süre:** ${p.answerTimeLimit} dk\n` +
                `> **Onay Rolleri:** ${approveMentions}\n` +
                `> **Verilecek Roller:** ${giveMentions}`;
        });

        const embed = new EmbedBuilder()
            .setTitle("📋 Aktif Başvuru Panelleri")
            .setDescription(lines.join("\n\n"))
            .setColor("Blue")
            .setFooter({ text: `Toplam: ${panels.length} panel` });

        return interaction.editReply({ embeds: [embed] });
    }
};
