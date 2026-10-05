const ScheduledMessage = require("../../Core/Database/ScheduledMessage");
const moment = require("moment-timezone");
const client = global.bot;

class MessageScheduler {
    constructor() {
        this.interval = null;
    }

    async init() {
        if (this.interval) return;

        this.interval = setInterval(() => this.check(), 30000);
    }

    async check() {
        const now = moment().tz("Europe/Istanbul");
        const currentHour = now.hour();
        const currentMinute = now.minute();

        try {
            const matches = await ScheduledMessage.find({
                active: true,
                minute: currentMinute
            });

            for (const item of matches) {
                const lastSent = item.lastSent ? moment(item.lastSent).tz("Europe/Istanbul") : null;
                if (lastSent && lastSent.format("YYYY-MM-DD HH:mm") === now.format("YYYY-MM-DD HH:mm")) {
                    continue;
                }

                let shouldSend = false;
                if (!item.isRepeating) {
                    if (currentHour === item.hour) shouldSend = true;
                } else {
                    const hourDiff = currentHour - item.hour;
                    const normalizedHourDiff = (hourDiff + 24) % 24;

                    if (item.intervalHours > 0 && normalizedHourDiff % item.intervalHours === 0) {
                        const currentRep = Math.floor(normalizedHourDiff / item.intervalHours) + 1;
                        if (item.maxRepetitions === 0 || currentRep <= item.maxRepetitions) {
                            shouldSend = true;
                        }
                    }
                }

                if (shouldSend) {
                    const channel = client.channels.cache.get(item.channelID) || await client.channels.fetch(item.channelID).catch(() => null);
                    if (channel) {
                        await channel.send({ content: item.message }).catch(() => { });
                        item.lastSent = now.toDate();
                        await item.save();
                    }
                }
            }
        } catch (err) {
            console.error("[Message Scheduler] Check Error:", err);
        }
    }


}

module.exports = new MessageScheduler();
