const GuardSettings = require("../Database/GuardSettings");

const limitCache = new Map();

class GuardManager {


    static async checkLimit(guildID, userID, type) {
        if (!userID || !type) return false;

        let settings = await this.getSettings(guildID);
        if (!settings) return false;

        if (settings.enabled === false) return false;
        if (settings.fullAccess.includes(userID)) return false;

        const config = settings[type];
        if (!config || !config.limit) return false; 

        const key = `${guildID}-${userID}-${type}`;
        const now = Date.now();

        if (!limitCache.has(key)) {
            limitCache.set(key, []);
        }

        const userHistory = limitCache.get(key);

        const validTime = now - config.time;
        const recentActions = userHistory.filter(timestamp => timestamp > validTime);

        recentActions.push(now);
        limitCache.set(key, recentActions);

        if (recentActions.length > config.limit) {
            return {
                limited: true,
                action: config.action 
            };
        }

        return false;
    }


    static isWhitelisted(userID, member, type, settings) {
        if (!settings || settings.enabled === false) return true;

        if (this._checkList(settings.fullAccess, userID, member)) return true;

        if (type.startsWith("role") && this._checkList(settings.roleAccess, userID, member)) return true;
        if (type.startsWith("channel") && this._checkList(settings.channelAccess, userID, member)) return true;
        if ((type.startsWith("emoji") || type.startsWith("sticker")) && this._checkList(settings.emojiAccess, userID, member)) return true;
        if (type === "botAdd" && this._checkList(settings.botAccess, userID, member)) return true;

        return false;
    }


    static _checkList(list, userID, member) {
        if (!list || !Array.isArray(list)) return false;
        if (list.includes(userID)) return true;
        if (member && member.roles && member.roles.cache) {
            return member.roles.cache.some(r => list.includes(r.id));
        }
        return false;
    }

    static async getSettings(guildID) {
        const cached = limitCache.get(`settings-${guildID}`);
        if (cached) return cached;

        let settings = await GuardSettings.findOne({ guildID });
        if (!settings) {
            settings = await GuardSettings.create({ guildID });
        }

        limitCache.set(`settings-${guildID}`, settings);
        setTimeout(() => limitCache.delete(`settings-${guildID}`), 5 * 60 * 1000);

        return settings;
    }

    static async clearCache(guildID) {
        limitCache.delete(`settings-${guildID}`);
    }
}

module.exports = GuardManager;
