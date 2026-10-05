const Punitives = require("../../Core/Database/Punitives");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const ModerationService = require("../../Services/Moderation/ModerationService");

module.exports = async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    const cid = interaction.customId || "";
    if (!cid.startsWith("jail_select_reason_")) return;

    const parts = cid.replace("jail_select_reason_", "").split("_");
    const targetID = parts[0];
    const staffID = parts[1];

    if (interaction.user.id !== staffID) {
        return interaction.reply({ content: "❌ Bu menüyü sadece işlemi başlatan yetkili kullanabilir.", ephemeral: true });
    }

    const selectedValue = interaction.values[0];
    const allReasons = ConfigManager.get("PunishmentReasons") || [];
    const jailReasonObj = allReasons.find(r => r && r.type === 3 && r.value === selectedValue);

    if (!jailReasonObj) {
        return interaction.reply({ content: "❌ Seçilen jail sebebi sistemde bulunamadı.", ephemeral: true });
    }

    const targetUser = await interaction.client.users.fetch(targetID).catch(() => null);
    if (!targetUser) {
        return interaction.reply({ content: "❌ Kullanıcı bulunamadı.", ephemeral: true });
    }

    // Calculate past jail count for this user
    const pastJailsCount = await Punitives.countDocuments({ Member: targetID, Type: "Cezalandırılma" });

    let chosenDuration = jailReasonObj.date1 || "1d";
    if (pastJailsCount === 1) {
        chosenDuration = jailReasonObj.date2 || "3d";
    } else if (pastJailsCount >= 2) {
        chosenDuration = jailReasonObj.date3 || "7d";
    }

    const reasonLabel = `${jailReasonObj.label} (${pastJailsCount + 1}. İhlal)`;

    await interaction.deferUpdate().catch(() => {});
    await ModerationService.handleJail(interaction, targetUser, reasonLabel, chosenDuration);
};
