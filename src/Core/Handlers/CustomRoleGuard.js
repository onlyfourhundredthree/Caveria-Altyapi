const { PermissionsBitField, AuditLogEvent } = require("discord.js");
const CustomRoleCommand = require("../Database/CustomRoleCommand");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

module.exports.guildMemberUpdate = async (oldMember, newMember) => {
    if (oldMember.roles.cache.size >= newMember.roles.cache.size) return;

    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    if (addedRoles.size === 0) return;

    const customCommands = await CustomRoleCommand.find({ guildID: newMember.guild.id });
    if (!customCommands || customCommands.length === 0) return;

    const guardedRoles = [];
    for (const cmd of customCommands) {
        for (const addedRole of addedRoles.values()) {
            if (cmd.rolesToGive.includes(addedRole.id) && !guardedRoles.some(r => r.id === addedRole.id)) {
                guardedRoles.push(addedRole);
            }
        }
    }

    if (guardedRoles.length === 0) return; 

    try {
        await new Promise(r => setTimeout(r, 1000));

        const fetchedLogs = await newMember.guild.fetchAuditLogs({
            limit: 5,
            type: AuditLogEvent.MemberRoleUpdate,
        });

        const now = Date.now();
        const roleUpdateLog = fetchedLogs.entries.find(log => log.target.id === newMember.id && (now - log.createdTimestamp < 15000));

        let executor = null;
        if (roleUpdateLog) {
            executor = roleUpdateLog.executor;
            if (executor.id === newMember.client.user.id) return;
        }

        for (const role of guardedRoles) {
            if (newMember.guild.members.me.roles.highest.position > role.position) {
                await newMember.roles.remove(role.id, "Özel Komut rolü manuel/sağ tık ile verilemez.").catch(() => {});
            }
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const iptalEmoji = emojis.toji_iptal || "❌";
        const noktaEmoji = emojis.toji_nokta || "-";

        const panel = new V2PanelBuilder();
        panel.addAccessory(
            newMember.guild.iconURL({ dynamic: true }) || newMember.client.user.displayAvatarURL(), 
            `## ${iptalEmoji} Manuel İşlem Engellendi\n${noktaEmoji} ${executor ? `<@${executor.id}>` : "Bilinmeyen bir yetkili"}, <@${newMember.id}> kullanıcısına sağ tık (manuel) ile **${guardedRoles.map(r => r.name).join(", ")}** rolünü vermeye çalıştı.\n> *Bu rol(ler) sadece özel komutlar (CustomRoleCommands) ile verilebildiği için otomatik olarak geri alındı.*`
        );

        const logChannelID = ConfigManager.get("Channels.GuardLog") || ConfigManager.get("Channels.BotLog") || ConfigManager.get("Channels.GeneralLog");
        if (logChannelID) {
            const channel = newMember.guild.channels.cache.get(logChannelID);
            if (channel) {
                channel.send({ components: panel.toJSON() }).catch(()=>{});
            }
        } else if (executor) {
            executor.send({ components: panel.toJSON() }).catch(()=>{});
        }

    } catch (err) {
        console.error("[CustomRoleGuard] Hata:", err);
    }
};
