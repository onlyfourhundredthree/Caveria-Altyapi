const SystemSettings = require("../Database/SystemSettings");
const Settings = require("../../../Settings.json");
const DefaultConfig = require("../Config/DefaultConfig");

class ConfigManager {
    constructor() {
        this.cache = new Map();
        this.initialized = false;
        for (const [key, value] of Object.entries(DefaultConfig)) {
            this.cache.set(key, JSON.parse(JSON.stringify(value)));
        }
    }

    async init() {
        if (this.initialized) return;
        await this.loadFromDB();
        this.initialized = true;
    }

    async reload() {
        this.cache.clear();

        const path = require("path");
        const defaultConfigPath = path.resolve(__dirname, "../Configs/DefaultConfig.js");
        delete require.cache[defaultConfigPath];
        const NewDefaultConfig = require("../Config/DefaultConfig.js");

        for (const [key, value] of Object.entries(NewDefaultConfig)) {
            this.cache.set(key, value);
        }

        await this.loadFromDB();
        return true;
    }

    async loadFromDB() {
        try {
            const allSettings = await SystemSettings.find({});
            for (const doc of allSettings) {
                this.cache.set(doc.key, doc.value);
            }

            if (Settings.Owners && !this.cache.has("Owners")) {
                await this.set("Owners", Settings.Owners, "System Init");
            }
        } catch (error) {
            console.error("ConfigManager Load Error:", error);
        }
    }

    _deepMerge(defaultObj, dbObj) {
        if (!defaultObj || typeof defaultObj !== 'object' || Array.isArray(defaultObj)) return dbObj;
        if (!dbObj || typeof dbObj !== 'object' || Array.isArray(dbObj)) return dbObj;

        const merged = JSON.parse(JSON.stringify(defaultObj));
        for (const [k, v] of Object.entries(dbObj)) {
            if (v && typeof v === 'object' && !Array.isArray(v) && merged[k] && typeof merged[k] === 'object' && !Array.isArray(merged[k])) {
                merged[k] = this._deepMerge(merged[k], v);
            } else {
                merged[k] = v;
            }
        }
        return merged;
    }

    get(key) {
        if (!key) return null;

        // 1. Settings.json (En yüksek öncelik - Ana ayarlar için)
        if (Settings[key] !== undefined && key !== "Main") return Settings[key];
        if (Settings.Main && Settings.Main[key] !== undefined) return Settings.Main[key];

        // 2. Cache (MongoDB) üzerinden çözümleme
        let dbValue = this.cache.get(key); // Önce direkt anahtarı kontrol et
        
        if (dbValue === undefined && key.includes('.')) {
            const parts = key.split('.');
            if (this.cache.has(parts[0])) {
                let current = this.cache.get(parts[0]);
                for (let i = 1; i < parts.length; i++) {
                    if (current && typeof current === 'object') {
                        current = current[parts[i]];
                    } else {
                        current = undefined;
                        break;
                    }
                }
                if (current !== undefined) dbValue = current;
            }
        }

        // 3. DefaultConfig (Eğer veritabanında hiç yoksa varsayılana dön)
        let defValue = DefaultConfig[key];
        if (defValue === undefined && key.includes('.')) {
            const parts = key.split('.');
            let current = DefaultConfig[parts[0]];
            if (current) {
                for (let i = 1; i < parts.length; i++) {
                    if (current && typeof current === 'object') {
                        current = current[parts[i]];
                    } else {
                        current = undefined;
                        break;
                    }
                }
                if (current !== undefined) defValue = current;
            }
        }

        if (dbValue !== undefined) {
            if (defValue !== undefined && typeof defValue === 'object' && !Array.isArray(defValue)) {
                return this._deepMerge(defValue, dbValue);
            }
            return dbValue;
        }

        return defValue !== undefined ? defValue : null;
    }

    async set(key, value, updatedBy = "System") {
        try {
            const result = await SystemSettings.findOneAndUpdate(
                { key: key },
                { key: key, value: value, updatedBy: updatedBy, updatedAt: new Date() },
                { upsert: true, new: true }
            );
            this.cache.set(key, value);
            return true;
        } catch (error) {
            console.error(`ConfigManager Set Error (${key}):`, error.message);
            return false;
        }
    }

    async updateNested(mainKey, nestedPath, value, updatedBy) {
        try {
            let mainObj = this.get(mainKey) || {};
            mainObj = JSON.parse(JSON.stringify(mainObj));

            const parts = nestedPath.split('.');
            let current = mainObj;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) current[parts[i]] = {};
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;

            this.cache.set(mainKey, mainObj);

            await SystemSettings.findOneAndUpdate(
                { key: mainKey },
                { key: mainKey, value: mainObj, updatedBy: updatedBy, updatedAt: new Date() },
                { upsert: true, new: true }
            );
            return true;
        } catch (error) {
            console.error(`ConfigManager UpdateNested Error (${mainKey}.${nestedPath}):`, error.message);
            return false;
        }
    }


    isOwner(memberOrUser) {
        if (!memberOrUser) return false;

        let owners = this.get("Owners");
        if (!Array.isArray(owners)) owners = [];
        const id = memberOrUser.id;

        if (owners.includes(id)) return true;

        if (memberOrUser.roles && memberOrUser.roles.cache) {
            return memberOrUser.roles.cache.some(role => owners.includes(role.id));
        }

        return false;
    }
}

module.exports = new ConfigManager();

