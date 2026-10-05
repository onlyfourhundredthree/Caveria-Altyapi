const { EmbedBuilder, MessageFlags } = require("discord.js");
const StaffUser = require("../../Core/Database/StaffUser");
const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StaffManager = require("../../Core/Handlers/StaffManager");

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("manual_promo_")) return;

    const isAdmin = interaction.member.permissions.has("Administrator");
    const isOwner = ConfigManager.isOwner(interaction.member);
    if (!isOwner && !isAdmin) {
        return interaction.reply({ content: "Bu işlemi sadece üst yetkililer gerçekleştirebilir.", flags: [MessageFlags.Ephemeral] });
    }

    const parts = interaction.customId.split("_");
    const targetUserID = parts[2];
    const rankDBID = parts[3];

    const targetMember = await interaction.guild.members.fetch(targetUserID).catch(() => null);
    if (!targetMember) {
        return interaction.reply({ content: "Kullanıcı sunucuda bulunamadı.", flags: [MessageFlags.Ephemeral] });
    }

    const MandatoryTaskLog = require("../../Core/Database/MandatoryTaskLog");
    const rank = await StaffRoleSystem.findById(rankDBID);
    if (!rank) {
        return interaction.reply({ content: "Rütbe tanımı veritabanında bulunamadı.", flags: [MessageFlags.Ephemeral] });
    }

    const requiredWeeks = rank.mandatoryWeeks || 2;
    const completedWeeks = await MandatoryTaskLog.countDocuments({
        guildID: interaction.guild.id, userID: targetMember.id, status: "COMPLETED"
    });
    if (requiredWeeks > 0 && completedWeeks < requiredWeeks) {
        return interaction.reply({ content: `Bu yetkili henüz **${requiredWeeks} hafta zorunlu görev** tamamlama şartını karşılamış değil (Mevcut: ${completedWeeks}/${requiredWeeks}).`, flags: [MessageFlags.Ephemeral] });
    }

    try {
        await targetMember.roles.add(rank.roleID);
        await StaffManager.applyAllMilestoneRoles(targetMember, rank);

        const allRanks = await StaffRoleSystem.find({ guildID: interaction.guild.id, active: true }).sort({ requiredXP: 1 });
        const lowerRanks = allRanks.filter(r => r.requiredXP < rank.requiredXP);
        let oldRankObj = null;
        for (const lr of lowerRanks) {
            if (targetMember.roles.cache.has(lr.roleID)) {
                oldRankObj = lr;
                await targetMember.roles.remove(lr.roleID).catch(() => { });
            }
        }

        await StaffManager.resetStats(targetMember, rank.requiredXP);

        const promoLogID = ConfigManager.get("Channels.PromotionLog");
        const promoLog = interaction.guild.channels.cache.get(promoLogID);

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Manuel Rütbe Atlatıldı", iconURL: targetMember.user.displayAvatarURL({ dynamic: true }) })
            .setDescription(`${targetMember} kullanıcısı, ${interaction.user} tarafından **${rank.rankName}** rütbesine yükseltildi.`)
            .addFields(
                { name: "Yeni Rütbe", value: rank.rankName, inline: true },
                { name: "Onaylayan", value: interaction.user.toString(), inline: true }
            )
            .setColor("Green")
            .setTimestamp();

        if (promoLog) {
            promoLog.send({ embeds: [embed] });
        }

        await interaction.update({
            content: `${ConfigManager.get("Emojis.toji_onay") || "✨"} ${targetMember} başarıyla **${rank.rankName}** yapıldı.`,
            components: [],
            embeds: interaction.message.embeds 
        });

    } catch (err) {
        console.error("Promotion Error:", err);
        await interaction.reply({ content: "Rol verme işlemi sırasında bir hata oluştu.", flags: [MessageFlags.Ephemeral] });
    }
};
