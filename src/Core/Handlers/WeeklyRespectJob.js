const moment = require("moment-timezone");
const StatHistory = require("../Database/StatHistory");
const ConfigManager = require("./ConfigManager");
const Settings = require("../../../Settings.json");
const SystemSettings = require("../Database/SystemSettings");
const { MessageFlags } = require("discord.js");

module.exports = (client) => {
    const check = async () => {
        const now = moment().tz("Europe/Istanbul");

        if (now.day() === 1) {
            const weekKey = `WeeklyRespect_${now.isoWeekYear()}_${now.isoWeek()}`;
            const lock = await SystemSettings.findOneAndUpdate(
                { key: weekKey },
                { $setOnInsert: { value: true, updatedAt: new Date() } },
                { upsert: true, new: false }
            );

            if (!lock) {
                console.log(`[WEEKLY-RESPECT] Running for week: ${weekKey}`);
                await runWeeklyRespect(client);
            }
        }
    };

    setTimeout(() => check(), 5000);
    setInterval(check, 15 * 60 * 1000);
};

async function runWeeklyRespect(client) {
    const guild = client.guilds.cache.get(Settings.Main.GuildID);
    if (!guild) return;

    const arthurRoleID = ConfigManager.get("Roles.ArthurMorgan");
    if (!arthurRoleID) return;

    const sevenDaysAgo = moment().tz("Europe/Istanbul").subtract(7, "days").format("YYYY-MM-DD");
    const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");

    const topRespectRes = await StatHistory.aggregate([
        { $match: { guildID: guild.id, date: { $gte: sevenDaysAgo, $lt: today } } },
        { $group: { _id: "$userID", weeklyRespect: { $sum: "$respect" } } },
        { $sort: { weeklyRespect: -1 } },
        { $limit: 1 }
    ]);

    const topRespect = topRespectRes[0];
    const arthurRole = guild.roles.cache.get(arthurRoleID);

    if (arthurRole) {
        const currentHolders = guild.members.cache.filter(m => m.roles.cache.has(arthurRoleID));
        for (const [id, m] of currentHolders) {
            await m.roles.remove(arthurRole).catch(() => { });
        }

        if (topRespect && topRespect.weeklyRespect > 0) {
            const winner = await guild.members.fetch(topRespect._id).catch(() => null);
            if (winner) {
                await winner.roles.add(arthurRole).catch(() => { });

                const logChannel = guild.channels.cache.find(c => c.name.toLowerCase().includes("respect-log"));
                if (logChannel) {
                    const components = [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 9,
                                    accessory: { type: 11, media: { url: winner.user.displayAvatarURL() } },
                                    components: [
                                        {
                                            type: 10,
                                            content: `## Haftalık Saygınlık Birincisi\n> Tebrikler ${winner}! Geçtiğimiz haftanın en saygın kullanıcısı olarak belirlendin.`
                                        }
                                    ]
                                },
                                { type: 14, divider: true, spacing: 1 },
                                {
                                    type: 10,
                                    content: `### Özet Veriler\n- **Kullanıcı:** ${winner}\n- **Puan:** \`${topRespect.weeklyRespect} respect\`\n- **Ödül:** <@&${arthurRoleID}>`
                                },
                                {
                                    type: 10,
                                    content: `-# Arthur Morgan rolü yeni sahibine teslim edilmiştir.`
                                }
                            ]
                        }
                    ];

                    await logChannel.send({
                        flags: [MessageFlags.IsComponentsV2],
                        components
                    });
                }
            }
        }
    }
}

module.exports.runWeeklyRespect = runWeeklyRespect;
