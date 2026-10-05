const { EmbedBuilder } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

class PrivateRoomLogger {
    static async log(guild, action, details, color = "#2b2d31") {
        const logChannelId = ConfigManager.get("privateRooms.loggingChannelId");
        if (!logChannelId) return;

        const channel = guild.channels.cache.get(logChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Özel Oda Sistem Kaydı", iconURL: guild.iconURL({ dynamic: true }) })
            .setTitle(action)
            .setDescription(details)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `${guild.name} • Özel Oda Log`, iconURL: guild.iconURL() });

        try {
            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error("Private Room Logging Error:", err);
        }
    }
}

class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    setCooldown(userId, duration) {
        this.cooldowns.set(userId, Date.now() + duration);
    }

    isCoolingDown(userId) {
        const expiration = this.cooldowns.get(userId);
        if (!expiration) return false;
        if (Date.now() > expiration) {
            this.cooldowns.delete(userId);
            return false;
        }
        return true;
    }

    getRemaining(userId) {
        const expiration = this.cooldowns.get(userId);
        if (!expiration) return 0;
        return Math.max(0, expiration - Date.now());
    }
}

const interactionCooldowns = new CooldownManager();
const joinCooldowns = new CooldownManager();

module.exports = { PrivateRoomLogger, interactionCooldowns, joinCooldowns };
