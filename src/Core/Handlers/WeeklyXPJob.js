const moment = require("moment-timezone");
const ConfigManager = require("./ConfigManager");
const Settings = require("../../../Settings.json");
const SystemSettings = require("../Database/SystemSettings");
const StaffUser = require("../Database/StaffUser");

module.exports = (client) => {
    const check = async () => {
        const now = moment().tz("Europe/Istanbul");

        if (now.day() === 1) {
            const weekKey = `WeeklyXPReset_${now.isoWeekYear()}_${now.isoWeek()}`;
            const lock = await SystemSettings.findOneAndUpdate(
                { key: weekKey },
                { $setOnInsert: { value: true, updatedAt: new Date() } },
                { upsert: true, new: false }
            );

            if (!lock) {
                console.log(`[WEEKLY-XP-RESET] Auto-reset is DISABLED for week: ${weekKey}`);
            }
        }
    };

    setTimeout(() => check(), 10000);
    setInterval(check, 15 * 60 * 1000);
};
