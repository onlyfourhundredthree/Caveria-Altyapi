const BoosterRole = require("../Database/Booster");
const Settings = require("../../../Settings.json");
const ConfigManager = require("./ConfigManager");

module.exports = async (client) => {
    setTimeout(() => runCheck(client), 15000);
    setInterval(() => {
        runCheck(client);
    }, 10 * 60 * 1000);
};

async function runCheck(client) {
    const guild = client.guilds.cache.get(Settings.Main.GuildID);
    if (!guild) return;

    const activeApps = await BoosterRole.find({ status: "Onaylandı" }).lean();
    if (activeApps && activeApps.length > 0) {
        const userIds = activeApps.map(app => app.userId);
        const fetchedMembers = await guild.members.fetch({ user: userIds }).catch(() => new Map());
        const processedUsers = new Set();

        for (const app of activeApps) {
            if (processedUsers.has(app.userId)) continue;

            try {
                const member = fetchedMembers.get(app.userId);
                let shouldDelete = false;
                let deleteReason = "";
                let notifyUser = false;

                if (!member) {
                    shouldDelete = true;
                    deleteReason = "Üye sunucudan ayrılmış.";

                    const role = guild.roles.cache.get(app.roleId);
                    if (role) await role.delete("Booster sunucudan ayrıldığı için silindi.").catch(() => null);
                }
                else if (!member.premiumSince && member.id !== "1078973188718993418") {
                    shouldDelete = true;
                    deleteReason = "Üye boostu çekmiş.";
                    notifyUser = true;

                    const role = guild.roles.cache.get(app.roleId);
                    if (role) {
                        await role.delete("Boost çekildiği için silindi.").catch(() => null);
                    }
                }
                else {
                    const role = guild.roles.cache.get(app.roleId);
                    if (!role) {
                        shouldDelete = true;
                        deleteReason = "Rol sunucuda bulunamadı.";
                        notifyUser = true;
                    }
                }

                if (shouldDelete) {
                    if (notifyUser && member) {
                        await member.send(`**Server Boost** durumunuz değiştiği için veritabanındaki kayıtlarınız silinmiştir.`).catch(() => null);
                    }

                    const result = await BoosterRole.deleteMany({ userId: app.userId });
                    processedUsers.add(app.userId);
                }

            } catch (err) {
                console.error(`[BoosterCheck Hata]`, err);
            }
        }
    }

    const specialRoles = ConfigManager.get("Boost.SpecialRoles") || [];
    if (specialRoles.length > 0) {
        const specialRoleIds = specialRoles.map(r => r.id);
        const membersWithSpecialRoles = guild.members.cache.filter(m =>
            !m.user.bot &&
            m.id !== "1078973188718993418" &&
            !m.premiumSince &&
            m.roles.cache.some(r => specialRoleIds.includes(r.id))
        );

        for (const [id, member] of membersWithSpecialRoles) {
            const rolesToRemove = member.roles.cache.filter(r => specialRoleIds.includes(r.id));
            await member.roles.remove(rolesToRemove, "Boost çekildiği için özel roller kaldırıldı (Periyodik Kontrol).").catch(() => null);
            await member.send(`**Server Boost** durumunuz değiştiği için sunucudaki özel renk rolleriniz kaldırılmıştır.`).catch(() => null);
        }
    }
}
