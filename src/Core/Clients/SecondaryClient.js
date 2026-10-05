const { Client, GatewayIntentBits, Partials } = require("discord.js");
const Settings = require("../../../Settings.json");

const secondaryClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.GuildMember]
});

const SECONDARY_TOKEN = Settings.Secondary?.Token || process.env.SECONDARY_BOT_TOKEN || "";
const SECONDARY_GUILD_ID = Settings.Secondary?.GuildID || process.env.SECONDARY_GUILD_ID || "";

secondaryClient.once("ready", () => {
    console.log(`[SecondaryClient] Başarıyla giriş yapıldı: ${secondaryClient.user.tag} - İkincil Sunucu.`);
});

function initSecondaryClient() {
    if (!SECONDARY_TOKEN || SECONDARY_TOKEN.startsWith("YOUR_")) {
        console.log("[SecondaryClient] İkincil bot tokenı tanımlanmadığı için devre dışı bırakıldı.");
        return;
    }
    secondaryClient.login(SECONDARY_TOKEN).catch((err) => {
        console.error("[SecondaryClient] İkincil bota giriş yapılırken hata:", err);
    });
}

module.exports = {
    secondaryClient,
    SECONDARY_GUILD_ID,
    initSecondaryClient
};
