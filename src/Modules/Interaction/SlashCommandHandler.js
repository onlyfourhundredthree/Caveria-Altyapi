const { InteractionType } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

const cooldowns = new Map();
const processedInteractions = new Set();

module.exports = async (interaction) => {
    const client = global.bot;
    if (interaction.user.bot) return;

    if (processedInteractions.has(interaction.id)) return;
    processedInteractions.add(interaction.id);

    setTimeout(() => processedInteractions.delete(interaction.id), 10000);

    if (interaction.isAutocomplete()) {
        const command = client.slashcommands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction);
        } catch (err) {
            console.error(`[Autocomplete Error] ${interaction.commandName}:`, err);
        }
        return;
    }

    if (interaction.type !== InteractionType.ApplicationCommand) return;

    const command = client.slashcommands.get(interaction.commandName);
    if (!command) {
        client.slashcommands.delete(interaction.commandName);
        return interaction.reply({ content: 'Bu komut kullanılamıyor.', ephemeral: true });
    }

    if (!interaction.inGuild() && interaction.isCommand()) {
        return interaction.reply({ content: 'Komutları kullanmak için bir sunucuda olmanız gerekir.', ephemeral: true });
    }

    let AllowedChannels = ConfigManager.get("Channels.Allowed_Commands");
    if (!Array.isArray(AllowedChannels)) AllowedChannels = [];
    const isAllowedChannel = AllowedChannels.includes(interaction.channel.id) || (interaction.channel.isThread() && AllowedChannels.includes(interaction.channel.parentId));
    const isTicketChannel = interaction.channel.parentId === ConfigManager.get("Channels.TicketCategory") || interaction.channel.name.startsWith("ticket-");
    const isTicketCommand = interaction.commandName === "ticket";

    if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("ManageChannels") && !isAllowedChannel && !interaction.channel.name.includes("ship") && !isTicketChannel && !isTicketCommand) {
        return interaction.reply({ content: `Bu komutu sadece ${AllowedChannels.map(x => `<#\${x}>`).join(", ")} kanallarında kullanabilirsiniz.`, fetchReply: true, ephemeral: false })
            .then(() => {
                setTimeout(() => {
                    interaction.deleteReply().catch(() => { });
                }, 5000);
            });
    }

    const now = Date.now();
    const cooldownAmount = (command.cooldown || 1) * 1000;

    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Map());
    }

    const timestamps = cooldowns.get(command.name);
    const userId = interaction.user.id;

    if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownAmount;
        if (now < expirationTime) return;
    }

    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), cooldownAmount);

    try {
        await command.execute(interaction, client);
    } catch (err) {
        console.error(`[Health Monitor] Command Error (${command.name}):`, err);

        // Kullanıcıya bilgi ver
        const errorMsg = "> ❌ Komut çalıştırılırken bir hata oluştu. Geliştiricilere bildirildi.";
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => { });
        } else {
            await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => { });
        }

        // Hata Log Kanalına Bildir
        try {
            const errorLogChannelId = ConfigManager.get("Channels.ErrorLog");
            if (errorLogChannelId) {
                const channel = client.channels.cache.get(errorLogChannelId);
                if (channel) {
                    const errorDetails = `**Komut:** \`/${command.name}\`\n**Kullanıcı:** <@${interaction.user.id}>\n**Kanal:** <#${interaction.channel.id}>\n\`\`\`js\n${err.stack || err.message}\n\`\`\``;
                    await channel.send({ content: errorDetails }).catch(() => {});
                }
            }
        } catch (logErr) {}
    }
};
