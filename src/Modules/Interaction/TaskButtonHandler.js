const { EmbedBuilder, MessageFlags } = require("discord.js");
const TaskSettings = require("../../Core/Database/TaskSettings");
const StaffUser = require("../../Core/Database/StaffUser");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (interaction) => {
    if (!interaction.guild) return;

    let taskID;
    if (interaction.isButton() && interaction.customId.startsWith("task_done_")) {
        taskID = interaction.customId.replace("task_done_", "");
    } else if (interaction.isStringSelectMenu() && interaction.customId === "task_select_menu") {
        taskID = interaction.values[0];
    } else {
        return;
    }
    const taskDef = await TaskSettings.findById(taskID);

    if (!taskDef) {
        return interaction.reply({
            content: "Bu görev tanımı artık mevcut değil.",
            flags: [MessageFlags.Ephemeral]
        });
    }

    const topStaff = await StaffUser.aggregate([
        { $unwind: "$categoryStats" },
        { $match: { "categoryStats.category": taskDef.taskCategory } },
        { $sort: { "categoryStats.count": -1 } },
        { $limit: 10 },
        {
            $project: {
                userID: 1,
                completedCount: "$categoryStats.count",
                totalMessages: 1,
                totalVoiceMinutes: 1
            }
        }
    ]);

    const embed = new EmbedBuilder()
        .setAuthor({ name: `${taskDef.taskCategory} Kategorisi - En İyi 10 Yetkili`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setColor("#5865F2")
        .setFooter({ text: `${interaction.guild.name} • Görev Liderlik Tablosu`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    if (topStaff.length > 0) {
        let listStr = topStaff.map((staff, index) => {
            let totalStatDisplay = "";
            let completedCount = staff.completedCount || 0;

            if (taskDef.taskCategory === "VOICE") {
                totalStatDisplay = `(Toplam: ${Math.floor((staff.totalVoiceMinutes || 0) / 60)}s ${(staff.totalVoiceMinutes || 0) % 60}d)`;
            } else if (taskDef.taskCategory === "PUBLIC_VOICE") {
                totalStatDisplay = `(Toplam Public: ${Math.floor((staff.totalPublicVoiceMinutes || 0) / 60)}s ${(staff.totalPublicVoiceMinutes || 0) % 60}d)`;
            } else if (taskDef.taskCategory === "MESSAGE") {
                totalStatDisplay = `(Toplam: ${staff.totalMessages || 0} mesaj)`;
            }

            const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🔹";
            return `${emoji} \`${index + 1}.\` <@${staff.userID}> - **${completedCount} Tamamlama** ${totalStatDisplay}`;
        }).join("\n");
        embed.setDescription(`Aşağıda **${taskDef.taskCategory}** kategorisindeki görevleri en çok bitiren ilk 10 yetkili sıralanmıştır:\n\n${listStr}`);
    } else {
        embed.setDescription(`${ConfigManager.get("Emojis.toji_iptal") || "✨"} **${taskDef.taskCategory}** kategorisinde henüz görev tamamlayan bir yetkili bulunmuyor.`);
    }

    await interaction.reply({
        embeds: [embed],
        flags: [MessageFlags.Ephemeral]
    });
};
