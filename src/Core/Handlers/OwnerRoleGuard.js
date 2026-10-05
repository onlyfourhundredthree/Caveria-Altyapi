const ConfigManager = require("./ConfigManager");
const Settings = require("../../../Settings.json");

module.exports.init = (client) => {
    const { GuildMemberRoleManager, Collection } = require('discord.js');
    
    if (!GuildMemberRoleManager.prototype._originalAdd) {
        GuildMemberRoleManager.prototype._originalAdd = GuildMemberRoleManager.prototype.add;
        GuildMemberRoleManager.prototype.add = async function(roleOrRoles, reason) {
            let rolesToProcess = [];
            if (Array.isArray(roleOrRoles)) {
                rolesToProcess = roleOrRoles;
            } else if (roleOrRoles instanceof Collection) {
                rolesToProcess = Array.from(roleOrRoles.keys());
            } else {
                rolesToProcess = [roleOrRoles];
            }

            const guardUsers = ConfigManager.get("Restrict.Users") || [];
            const isTargetUser = ConfigManager.isOwner(this.member) || guardUsers.includes(this.member.id);

            if (isTargetUser && !this.member.user.bot) {
                const restrictedRoles = ConfigManager.get("Restrict.Roles") || [];
                const filteredRoles = [];
                for (const r of rolesToProcess) {
                    const rId = typeof r === 'string' ? r : r.id;
                    if (!restrictedRoles.includes(rId)) {
                        filteredRoles.push(r);
                    }
                }
                
                if (filteredRoles.length === 0) return this.member;
                return this._originalAdd(filteredRoles, reason);
            }

            return this._originalAdd(roleOrRoles, reason);
        };
    }
    
    if (!GuildMemberRoleManager.prototype._originalSet) {
        GuildMemberRoleManager.prototype._originalSet = GuildMemberRoleManager.prototype.set;
        GuildMemberRoleManager.prototype.set = async function(roles, reason) {
            let rolesToProcess = [];
            if (Array.isArray(roles)) {
                rolesToProcess = roles;
            } else if (roles instanceof Collection) {
                rolesToProcess = Array.from(roles.keys());
            } else {
                rolesToProcess = [roles];
            }

            const guardUsers = ConfigManager.get("Restrict.Users") || [];
            const isTargetUser = ConfigManager.isOwner(this.member) || guardUsers.includes(this.member.id);

            if (isTargetUser && !this.member.user.bot) {
                const restrictedRoles = ConfigManager.get("Restrict.Roles") || [];
                const currentRestricted = restrictedRoles.filter(r => this.member.roles.cache.has(r));
                const filteredRoles = [];
                for (const r of rolesToProcess) {
                    const rId = typeof r === 'string' ? r : r.id;
                    if (!restrictedRoles.includes(rId)) {
                        filteredRoles.push(r);
                    } else if (currentRestricted.includes(rId)) {
                        // Eğer zaten varsa set ederken silinmemesi için tutalım
                        filteredRoles.push(r); 
                    }
                }
                
                return this._originalSet(filteredRoles, reason);
            }

            return this._originalSet(roles, reason);
        };
    }

    const checkRestrictedRoles = async () => {
        const guild = client.guilds.cache.get(Settings.Main.GuildID);
        if (!guild) return;

        const guardUsers = ConfigManager.get("Restrict.Users") || [];
        const targets = guild.members.cache.filter(m => (ConfigManager.isOwner(m) || guardUsers.includes(m.id)) && !m.user.bot);

        targets.forEach(async (member) => {
            const restrictedRoles = ConfigManager.get("Restrict.Roles") || [];
            const stolenRoles = restrictedRoles.filter(rID => member.roles.cache.has(rID));
            if (stolenRoles.length > 0) {
                await member.roles.remove(stolenRoles, "Sahipler bu level rollerini alamaz.").catch(() => { });
            }
        });
    };

    checkRestrictedRoles();
    setInterval(checkRestrictedRoles, 60000);
};

module.exports.guildMemberUpdate = async (oldMember, newMember) => {
    if (newMember.user.bot) return;

    const guardUsers = ConfigManager.get("Restrict.Users") || [];
    if (ConfigManager.isOwner(newMember) || guardUsers.includes(newMember.id)) {
        const restrictedRoles = ConfigManager.get("Restrict.Roles") || [];
        const stolenRoles = restrictedRoles.filter(r => newMember.roles.cache.has(r));
        if (stolenRoles.length > 0) {
            await newMember.roles.remove(stolenRoles, "Sahipler bu level rollerini alamaz.").catch(() => { });
        }
    }
};
