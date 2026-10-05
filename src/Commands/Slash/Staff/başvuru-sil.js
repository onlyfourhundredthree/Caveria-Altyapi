const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ApplicationPanel = require("../../../Core/Database/ApplicationPanel");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("başvuru-sil")
        .setDescription("Bir başvuru panelini siler.")
        .addStringOption(o => o.setName("panel").setDescription("Panel adı veya custom_id").setRequired(true).setAutocomplete(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const panels = await ApplicationPanel.find({ guildID: interaction.guild.id, active: true }).lean();
        const filtered = panels.filter(p => p.name.includes(focused) || p.customId.includes(focused)).slice(0, 25);
        return interaction.respond(filtered.map(p => ({ name: `${p.name} (${p.customId})`, value: p.customId })));
    },

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Yetkin yok.", flags: [MessageFlags.Ephemeral] });
        }

        const query = interaction.options.getString("panel");
        const panel = await ApplicationPanel.findOne({ guildID: interaction.guild.id, customId: query });
        if (!panel) return interaction.reply({ content: "Panel bulunamadı.", flags: [MessageFlags.Ephemeral] });

        await ApplicationPanel.deleteOne({ _id: panel._id });
        return interaction.reply({ content: `✅ **${panel.name}** (\`${panel.customId}\`) paneli silindi.`, flags: [MessageFlags.Ephemeral] });
    }
};
