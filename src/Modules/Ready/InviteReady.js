const client = global.bot;
const { Collection } = require("discord.js");

module.exports = async () => {
    client.inviteCache = new Collection();

    setTimeout(() => {
        client.guilds.cache.forEach(async guild => {
            try {
                const invites = await guild.invites.fetch();
                const inviteMap = new Collection();
                invites.forEach(inv => inviteMap.set(inv.code, inv.uses));
                client.inviteCache.set(guild.id, inviteMap);
            } catch (err) {
                console.error(`[InviteTracker] Failed to fetch invites for ${guild.name}:`, err);
            }
        });
    }, 5000);
};
