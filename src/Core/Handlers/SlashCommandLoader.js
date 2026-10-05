const fs = require("fs");
const { Collection } = require("discord.js");
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const Settings = require("../../../Settings.json");

module.exports = (client) => {
    client.slashcommands = new Collection();
    const slashcommands = [];

    if (fs.existsSync('./src/Commands/Slash/')) {
        fs.readdirSync('./src/Commands/Slash/').forEach(category => {
            const commands = fs.readdirSync(`./src/Commands/Slash/${category}/`).filter(cmd => cmd.endsWith('.js'));
            for (const command of commands) {
                try {
                    const Command = require(`../../Commands/Slash/${category}/${command}`);
                    if (!Command || !Command.data || !Command.data.name) continue;

                    if (client.slashcommands.has(Command.data.name)) {
                        console.warn(`[SlashCommandLoader] UYARI: '${Command.data.name}' isminde birden fazla slash komutu var! '${command}' dosyası atlanıyor.`);
                        continue;
                    }
                    
                    client.slashcommands.set(Command.data.name, Command);
                    slashcommands.push(Command.data.toJSON());
                } catch (err) {
                    console.error(`[SlashCommandLoader] '${command}' dosyası yüklenemedi:`, err.message);
                }
            }
        });

        client.once('ready', async () => {
            const rest = new REST({ version: '10' }).setToken(client.token);
            try {
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, Settings.Main.GuildID),
                    { body: slashcommands },
                );
                console.log("[SlashCommandLoader] Başarıyla slash komutları (/) yüklendi.");
            } catch (e) {
                console.error("[SlashCommandLoader] Hata:", e);
            }
        });
    }
};
