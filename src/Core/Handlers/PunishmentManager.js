const Punitives = require("../Database/Punitives");
const ConfigManager = require("./ConfigManager");
const { EmbedBuilder, MessageFlags } = require("discord.js");

class PunishmentManager {
    static async calculatePoints(userID) {
        const allPunitives = await Punitives.find({ Member: userID, Hidden: { $ne: true } });
        let points = 0;
        allPunitives.forEach(p => {
            const reason = (p.Reason || "").toLowerCase();
            if (reason.includes("otomatik ceza") || reason.includes("otomatik puan")) return;

            const type = (p.Type || "").toLowerCase();
            if (type.includes("cezalandır") || type.includes("jail")) points += 30;
            else if (type.includes("sustur") || type.includes("mute")) points += 15;
            else if (type.includes("uyarı")) points += 5;
        });
        return points;
    }

    static async checkAutoPunishment(member, message, skipAuto = false) {
        return; 
        if (skipAuto || !member || !message || !message.guild) return;

        const points = await this.calculatePoints(member.id);
        let autoPunishType = null;
        let duration = null;
        let reason = `Otomatik Ceza Puanı Limit Aşımı (${points} Puan)`;

        if (points >= 280) {
            autoPunishType = 3;
            duration = "120d";
        } else if (points >= 260) {
            autoPunishType = 3;
            duration = "60d";
        } else if (points >= 240) {
            autoPunishType = 3;
            duration = "30d";
        } else if (points >= 220) {
            autoPunishType = 3;
            duration = "25d";
        } else if (points >= 200) {
            autoPunishType = 3;
            duration = "22d";
        } else if (points >= 180) {
            autoPunishType = 3;
            duration = "18d";
        } else if (points >= 160) {
            autoPunishType = 3;
            duration = "14d";
        } else if (points >= 140) {
            autoPunishType = 3;
            duration = "10d";
        } else if (points >= 120) {
            autoPunishType = 3;
            duration = "6d";
        } else if (points >= 100) {
            autoPunishType = 3;
            duration = "3d";
        } else if (points >= 80) {
            autoPunishType = 3;
            duration = "1d";
        }

        if (autoPunishType) {
            if (autoPunishType === 3) {
                const isJailed = await Punitives.findOne({ Member: member.id, Type: "Cezalandırılma", Active: true });
                if (isJailed) return;
            }

            const staff = message.guild.members.me || { id: message.client.user.id, user: message.client.user };

            const fakeMessage = {
                guild: message.guild,
                member: staff,
                author: message.client.user,
                user: message.client.user,
                reply: async (opt) => {
                    const channel = message.channel;
                    if (channel && channel.send) return channel.send(opt).catch(() => { });
                },
                followUp: async (opt) => {
                    const channel = message.channel;
                    if (channel && channel.send) return channel.send(opt).catch(() => { });
                },
                silent: false
            };

            await member.addPunitives(autoPunishType, staff, reason, fakeMessage, duration, null, true);
        }
    }
    static async syncAllAutoPunishments(guild) {
        const distinctMembers = await Punitives.distinct("Member");
        console.log(`[SYNC] Checking ${distinctMembers.length} users for missed auto-punishments...`);

        for (const userID of distinctMembers) {
            try {
                const member = await guild.members.fetch(userID).catch(() => null);
                if (!member) continue;

                const points = await this.calculatePoints(userID);
                if (points < 80) continue;

                const fakeMessage = {
                    guild: guild,
                    client: guild.client,
                    channel: guild.channels.cache.find(c => c.id === "1396095921405558875") || { send: () => { } },
                    silent: true
                };

                await this.checkAutoPunishment(member, fakeMessage).catch(err => {
                    if (err.code !== 11000) {
                        console.error(`[SYNC] Error processing ${userID}:`, err);
                    }
                });
            } catch (err) {
                console.error(`[SYNC] General error for ${userID}:`, err);
            }
        }
        console.log(`[SYNC] Auto-punishment sync completed.`);
    }
}

module.exports = PunishmentManager;
