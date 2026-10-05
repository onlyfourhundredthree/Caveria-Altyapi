const moment = require("moment-timezone");
const ConfigManager = require("./ConfigManager");
const SystemSettings = require("../Database/SystemSettings");
const OneOnOneAssignment = require("../Database/OneOnOneAssignment");
const OneOnOneRecord = require("../Database/OneOnOneRecord");
const OneOnOneSettings = require("../Database/OneOnOneSettings");
const { V2PanelBuilder } = require("../Builders/V2PanelBuilder");
const { MessageFlags } = require("discord.js");

module.exports = (client) => {
    const check = async () => {
        try {
            const now = moment().tz("Europe/Istanbul");
            const weekKey = now.format("YYYY-[W]WW");
            const mainGuildID = ConfigManager.get("Main.GuildID");
            const guild = client.guilds.cache.get(mainGuildID) || client.guilds.cache.first();
            if (!guild) return;

            const settings = await OneOnOneSettings.findOne({ guildID: guild.id });
            if (!settings || !settings.enabled) return;

            // 1. HAFTA SONU (PAZAR GECE) OTOMATİK GENEL RAPOR LOGU
            if (now.day() === 0 && now.hour() >= 23) {
                const lockKey = `OneOnOneWeeklyReport_${weekKey}`;
                const lock = await SystemSettings.findOneAndUpdate(
                    { key: lockKey },
                    { $setOnInsert: { value: true, updatedAt: new Date() } },
                    { upsert: true, new: false }
                );

                if (!lock) {
                    console.log(`[1E1-JOB] Sending weekly summary report for: ${weekKey}`);
                    await sendWeeklySummaryReport(guild, weekKey, settings);
                }
            }

            // 2. HAFTA ORTASI HATIRLATMALARI (ÇARŞAMBA VE CUMA)
            if ((now.day() === 3 || now.day() === 5) && now.hour() === 18 && now.minute() <= 30) {
                const reminderLockKey = `OneOnOneReminder_${weekKey}_Day${now.day()}`;
                const lock = await SystemSettings.findOneAndUpdate(
                    { key: reminderLockKey },
                    { $setOnInsert: { value: true, updatedAt: new Date() } },
                    { upsert: true, new: false }
                );

                if (!lock) {
                    await sendManagerReminders(guild, weekKey, settings);
                }
            }

        } catch (error) {
            console.error("[OneOnOneJob] Error:", error);
        }
    };

    setTimeout(() => check(), 20000);
    setInterval(check, 30 * 60 * 1000);
};

async function sendWeeklySummaryReport(guild, weekKey, settings) {
    try {
        const channelID = settings.reportChannelId || ConfigManager.get("Channels.EventLog");
        if (!channelID) return;

        const channel = guild.channels.cache.get(channelID);
        if (!channel || !channel.isTextBased()) return;

        const allAssignments = await OneOnOneAssignment.find({ guildID: guild.id });
        const totalManagers = allAssignments.length;
        let totalStaff = 0;
        allAssignments.forEach(a => totalStaff += a.assignedMemberIDs.length);

        const records = await OneOnOneRecord.find({ guildID: guild.id, weekKey: weekKey });
        const completedCount = records.length;
        const completionRate = totalStaff > 0 ? Math.round((completedCount / totalStaff) * 100) : 0;

        const openFollowUpsCount = await OneOnOneRecord.countDocuments({
            guildID: guild.id,
            "followUp.required": true,
            "followUp.status": { $in: ["Açık", "Devam Ediyor"] }
        });

        const panel = new V2PanelBuilder();
        panel.addText(`> ## 📊 1E1 HAFTALIK ÖZET RAPORU\n> -# Hafta: \`${weekKey}\` | Tamamlanma Oranı: **%${completionRate}** (\`${completedCount} / ${totalStaff}\`)`);
        panel.addDivider(1);

        const managerOverview = [];
        for (const assign of allAssignments) {
            const mDone = records.filter(r => r.managerID === assign.managerID).length;
            const mTotal = assign.assignedMemberIDs.length;
            managerOverview.push(`> <@${assign.managerID}>: \`${mDone} / ${mTotal}\` tamamlandı`);
        }

        panel.addText(`### 👥 Yönetici Bazlı Sonuçlar\n${managerOverview.join("\n") || "Kayıtlı yönetici yok"}`);
        panel.addDivider(1);
        panel.addText(`**📌 Sunucu Genel Açık Takip Konusu Sayısı:** \`${openFollowUpsCount}\` adet`);

        await channel.send({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
    } catch (e) {
        console.error("[OneOnOneJob] sendWeeklySummaryReport Error:", e);
    }
}

async function sendManagerReminders(guild, weekKey, settings) {
    try {
        const assignments = await OneOnOneAssignment.find({ guildID: guild.id });
        for (const assign of assignments) {
            if (assign.assignedMemberIDs.length === 0) continue;

            const records = await OneOnOneRecord.find({
                guildID: guild.id,
                weekKey: weekKey,
                managerID: assign.managerID
            });

            const pendingMemberIDs = assign.assignedMemberIDs.filter(mID => !records.some(r => r.memberID === mID));
            if (pendingMemberIDs.length > 0) {
                const managerMember = await guild.members.fetch(assign.managerID).catch(() => null);
                if (managerMember) {
                    const pendingMentions = pendingMemberIDs.map(m => `<@${m}>`).join(", ");
                    const messageContent = `👋 Merhaba <@${assign.managerID}>,\n\n**${weekKey}** haftası 1E1 görüşmelerinizde henüz görüşme raporu girmediğiniz **${pendingMemberIDs.length}** yetkiliniz bulunuyor:\n> ${pendingMentions}\n\nLütfıen haftalık 1E1 görüşmelerinizi tamamlayıp **\`.1e1\`** panelinden raporlarınızı girmeyi unutmayın!`;
                    await managerMember.send(messageContent).catch(() => {});
                }
            }
        }
    } catch (e) {
        console.error("[OneOnOneJob] sendManagerReminders Error:", e);
    }
}
