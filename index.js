process.env.TZ = 'Europe/Istanbul';
const { AsyncLocalStorage } = require('node:async_hooks');
global.interactionStore = new AsyncLocalStorage();
const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");

const client = global.bot = global.client = new Client({
    fetchAllMembers: true,
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildEmojisAndStickers, 
        GatewayIntentBits.GuildIntegrations, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.GuildInvites, 
        GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.DirectMessages, 
        GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.MessageContent
    ],
    shards: "auto",
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction, Partials.GuildScheduledEvent, Partials.User, Partials.ThreadMember]
});

client.commands = new Collection();
client.aliases = new Collection();
client.cooldown = new Map();
client.roleLogCache = new Map();

client.setMaxListeners(50);

const Settings = require("./Settings.json");
const mongoose = require("./src/Core/Handlers/Mongo");

require("./src/Core/Handlers/Functions")(client);
require("./src/Core/Handlers/CommandLoader")(client);
require("./src/Core/Handlers/SlashCommandLoader")(client);
require("./src/Core/Handlers/ErrorLogger")(client);
require("./src/Core/Handlers/PunishmentExtension")();
require("./src/Core/Handlers/EvidenceJob")(client);
require("./src/Core/Handlers/Events");



async function startBot() {
    await mongoose.connection.asPromise();
    
    const ConfigManager = require("./src/Core/Handlers/ConfigManager");
    await ConfigManager.init();
    
    client.login(Settings.Main.Moderation).catch((error) => console.error("Bot Bağlanamadı!", error));

    const { initSecondaryClient } = require("./src/Core/Clients/SecondaryClient");
    initSecondaryClient();
}
startBot();

const StatCacheManager = require("./src/Core/Handlers/StatCacheManager");

process.on('uncaughtException', (err) => {
    StatCacheManager.createBackupSync(); 
    console.error(err);
    process.exit(1);
});

process.on('SIGINT', () => {
    StatCacheManager.createBackupSync();
    process.exit(0);
});

process.on('SIGTERM', () => {
    StatCacheManager.createBackupSync();
    process.exit(0);
});
