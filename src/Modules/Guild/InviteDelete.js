const client = global.bot;

module.exports = async (invite) => {
    if (!invite.guild) return;

    if (!client.inviteCache) client.inviteCache = new Map();
    const guildInvites = client.inviteCache.get(invite.guild.id);
    if (guildInvites) {
        guildInvites.delete(invite.code);
    }
};
