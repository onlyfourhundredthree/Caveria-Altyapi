const client = global.bot;

module.exports = async (invite) => {
    if (!invite.guild) return;

    if (!client.inviteCache) client.inviteCache = new Map();
    let guildInvites = client.inviteCache.get(invite.guild.id);
    if (!guildInvites) {
        guildInvites = new Map(); 
        client.inviteCache.set(invite.guild.id, guildInvites);
    }

    guildInvites.set(invite.code, invite.uses);
};
