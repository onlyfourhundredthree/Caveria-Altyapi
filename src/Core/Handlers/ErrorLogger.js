const { MessageFlags } = require("discord.js");
const ConfigManager = require("./ConfigManager");

module.exports = (client) => {
    const LOG_CHANNEL_ID = '1507131977331904512';

    const originalError = console.error;
    console.error = async (...args) => {
        originalError(...args);

        const message = args.map(a => {
            if (a instanceof Error) return a.stack || a.message;
            if (typeof a === 'object') {
                try { return JSON.stringify(a, null, 2); } catch { return String(a); }
            }
            return String(a);
        }).join('\n');

        if (message.includes("deprecated") || message.includes("DeprecationWarning") || message.includes("fetchReply")) {
            return; // Sadece konsolda kalsın, discord'a atmasın
        }

        if (!client || !client.isReady()) return;

        const channel = client.channels.cache.get(LOG_CHANNEL_ID) || client.channels.cache.get(ConfigManager.get("Channels.ErrorLog"));
        if (channel) {
            const chunks = message.match(/[\s\S]{1,1800}/g) || [message];
            for (const chunk of chunks) {
                const components = [
                    {
                        "type": 17,
                        "accent_color": 0xFF3B30,
                        "components": [
                            {
                                "type": 9,
                                "accessory": {
                                    "type": 11,
                                    "media": { "url": client.user.displayAvatarURL({ extension: 'png' }) },
                                },
                                "components": [
                                    {
                                        "type": 10,
                                        "content": "## Bot Hata Bildirimi\n> **Zaman:** <t:" + Math.floor(Date.now() / 1000) + ":F>" + (() => {
                                            const it = global.interactionStore?.getStore();
                                            return it ? "\n> **Etkileşim:** `" + (it.commandName || it.customId || 'Belirlenemedi') + "`\n> **Kullanıcı:** <@" + it.user.id + "> (`" + it.user.tag + "`)\n> **Kanal:** <#" + it.channelId + ">" : "";
                                        })()
                                    }
                                ]
                            },
                            { "type": 14, "divider": true, "spacing": 1 },
                            {
                                "type": 10,
                                "content": "```js\n" + chunk + "\n```"
                            }
                        ]
                    }
                ];

                channel.send({
                    flags: [MessageFlags.IsComponentsV2],
                    components
                }).catch(() => { });
            }
        }
    };

    process.on("uncaughtException", err => {
        const errorMsg = err.stack.replace(new RegExp(__dirname + '/', "g"), "./");
        console.error("Beklenmedik yakalanamayan hata: ", errorMsg);
    });

    process.on("unhandledRejection", err => {
        console.error("Promise hatası: ", err);
    });
};
