const fs = require("fs");
const path = require("path");
const UserSettings = require("../Database/UserSettings");
const ConfigManager = require("./ConfigManager");

class LM {
    constructor() {
        this.locales = new Map();
        this.userCache = new Map(); // Simple cache to prevent DB spam: userID -> lang
    }

    init() {
        const localesPath = path.resolve(__dirname, "../../Locales");
        if (!fs.existsSync(localesPath)) fs.mkdirSync(localesPath);

        const files = fs.readdirSync(localesPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const langCode = file.split('.')[0];
            try {
                const data = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
                this.locales.set(langCode, data);
            } catch (err) {
                console.error(`Error loading locale ${file}:`, err);
            }
        }
        console.log(`Loaded ${this.locales.size} languages:`, Array.from(this.locales.keys()));
    }

    /**
     * Resolves the preferred language for a user/member
     * Priority: 1. DB Settings, 2. English Role, 3. Default (tr)
     * @param {import("discord.js").GuildMember} member 
     * @param {string} userID 
     * @returns {Promise<string>}
     */
    async getLanguage(member, userID) {
        if (!userID && member) userID = member.id;
        if (!userID) return "tr";

        // Check cache first
        if (this.userCache.has(userID)) {
            const cachedLang = this.userCache.get(userID);
            if (cachedLang) return cachedLang;
        }

        // Check DB
        const settings = await UserSettings.findOne({ userID });
        if (settings && settings.language) {
            this.userCache.set(userID, settings.language);
            return settings.language;
        }

        // Check Role if DB is null
        if (member) {
            const englishRole = ConfigManager.get("Roles.EnglishRole");
            if (englishRole && member.roles && member.roles.cache.has(englishRole)) {
                return "en";
            }
        }

        return "tr";
    }

    /**
     * Translates a string key into the specified language.
     * @param {string} key - The JSON key to translate.
     * @param {string} lang - The language code (e.g. 'tr', 'en').
     * @param {object} args - Optional variables to replace (e.g. { user: 'Zemheri' })
     * @returns {string}
     */
    t(key, lang = "tr", args = {}) {
        const resolveKey = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

        const strings = this.locales.get(lang) || this.locales.get("tr");
        let text = strings ? resolveKey(strings, key) : null;

        if (!text) {
            // Fallback to TR if missing in EN
            const fallbackStrings = this.locales.get("tr");
            text = fallbackStrings ? resolveKey(fallbackStrings, key) : key;
        }

        if (!text || typeof text !== 'string') return key;

        for (const [k, v] of Object.entries(args)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }

        return text;
    }

    /**
     * Update user language preference
     */
    async setLanguage(userID, lang) {
        this.userCache.set(userID, lang);
        await UserSettings.findOneAndUpdate(
            { userID },
            { language: lang },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }
}

module.exports = new LM();
