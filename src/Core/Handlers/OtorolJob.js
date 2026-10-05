const ConfigManager = require("./ConfigManager");


module.exports = (client) => {
    const checkNoRoles = async () => {
        const guildID = ConfigManager.get("Main.GuildID");
        const guild = client.guilds.cache.get(guildID);
        if (!guild) return;

        const memberRoleID = ConfigManager.get("Roles.Member");
        if (!memberRoleID || !guild.roles.cache.has(memberRoleID)) return;

        try {

            const membersWithNoRoles = guild.members.cache.filter(m => !m.user.bot && m.roles.cache.size <= 1);

            if (membersWithNoRoles.size > 0) {
                for (const [id, member] of membersWithNoRoles) {
                    await member.roles.add(memberRoleID, "Hiç bir rolü bulunmadığı için otomatik üye rolü eklendi.").catch(() => { });
                }
            }
        } catch (err) {
        }
    };

    setInterval(checkNoRoles, 5 * 60 * 1000);

    setTimeout(checkNoRoles, 30000);
};
