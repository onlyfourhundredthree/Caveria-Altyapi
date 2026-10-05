const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ApplicationPanel = require("../../../Core/Database/ApplicationPanel");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("başvuru-düzenle")
        .setDescription("Aktif bir başvuru panelinin ayarlarını düzenler.")
        .addStringOption(o => o.setName("panel").setDescription("Düzenlenecek panel adı veya custom_id").setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName("isim").setDescription("Panelin yeni adı").setRequired(false))
        .addStringOption(o => o.setName("onaylayacak_roller").setDescription("Onay/Red yapabilecek Rol ID'leri (Araya boşluk koyun)").setRequired(false))
        .addStringOption(o => o.setName("verilecek_roller").setDescription("Onaylanınca verilecek Rol ID'leri (Araya boşluk koyun)").setRequired(false))
        .addIntegerOption(o => o.setName("zaman_limiti").setDescription("Cevaplama süresi limiti (dk)").setRequired(false)),

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
        if (!panel) return interaction.reply({ content: "Belirtilen panel bulunamadı.", flags: [MessageFlags.Ephemeral] });

        const isim = interaction.options.getString("isim");
        const onayRol = interaction.options.getString("onaylayacak_roller");
        const verRol = interaction.options.getString("verilecek_roller");
        const zaman = interaction.options.getInteger("zaman_limiti");

        let changed = [];

        if (isim) {
            panel.name = isim;
            changed.push(`İsim: ${isim}`);
        }
        if (onayRol) {
            const arr = onayRol.split(" ").filter(x => x.trim().length > 0);
            panel.approveRoles = arr;
            changed.push(`Onaylayacak Roller: ${arr.length} adet`);
        }
        if (verRol) {
            const arr = verRol.split(" ").filter(x => x.trim().length > 0);
            panel.giveRoles = arr;
            changed.push(`Verilecek Roller: ${arr.length} adet`);
        }
        if (zaman) {
            panel.answerTimeLimit = zaman;
            changed.push(`Zaman Limiti: ${zaman} dk`);
        }

        if (changed.length === 0) {
            return interaction.reply({ content: "Herhangi bir değişiklik yapmadın.", flags: [MessageFlags.Ephemeral] });
        }

        await panel.save();

        return interaction.reply({
            content: `✅ **${panel.customId}** ID'li panel başarıyla güncellendi!\n**Değişenler:**\n- ` + changed.join("\n- "),
            flags: [MessageFlags.Ephemeral]
        });
    }
};
