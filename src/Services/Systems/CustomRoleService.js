const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const CustomRoleCommand = require("../../Core/Database/CustomRoleCommand");
const CustomCommandUsage = require("../../Core/Database/CustomCommandUsage");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class CustomRoleService {
    static async getDashboard(client, guild) {
        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "";

        const stats = await CustomRoleCommand.countDocuments({ guildID: guild.id });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("crc_create")
                .setLabel("Yeni Komut Oluştur")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("crc_list")
                .setLabel("Komutları Yönet")
                .setStyle(ButtonStyle.Primary)
        );

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## ${spark} Özel Rol Komutları\nSunucuda üyelerinize rol verecek (veya alacak) özel komutlar oluşturabilirsiniz.\n> **Aktif Komut Sayısı:** \`${stats}\`` },
                    { type: 14, divider: true, spacing: 1 },
                    row.toJSON()
                ]
            }]
        };
    }

    static async sendRoleInfo(interactionOrMessage) {
        const isSlash = typeof interactionOrMessage.isCommand === "function" && interactionOrMessage.isCommand();
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const user = isSlash ? interactionOrMessage.user : interactionOrMessage.author;
        
        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "";
        const dot = emojis.toji_dot || "";
        const info = emojis.toji_info || "";
        const iptal = emojis.toji_iptal || "";
        
        const customCommands = await CustomRoleCommand.find({ guildID: guild.id });
        if (!customCommands || customCommands.length === 0) {
            const panel = new V2PanelBuilder().addText(`> ${iptal} Bu sunucuda ayarlanmış herhangi bir özel komut bulunmuyor.`);
            return interactionOrMessage.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() }).catch(()=>{});
        }

        const accessibleCommands = [];
        
        for (const cmd of customCommands) {
            let userMaxLimit = -1;
            let hasMatchedRole = false;
            
            if (cmd.roleLimits && cmd.roleLimits.length > 0) {
                for (const rLimit of cmd.roleLimits) {
                    if (member.roles.cache.has(rLimit.roleID)) {
                        hasMatchedRole = true;
                        if (rLimit.limit === 0) {
                            userMaxLimit = Infinity;
                        } else if (userMaxLimit !== Infinity && rLimit.limit > userMaxLimit) {
                            userMaxLimit = rLimit.limit;
                        }
                    }
                }
            }

            if (!hasMatchedRole && cmd.allowedRoles && cmd.allowedRoles.length > 0) {
                const hasRole = cmd.allowedRoles.some(roleId => member.roles.cache.has(roleId));
                if (hasRole) {
                    userMaxLimit = Infinity;
                    hasMatchedRole = true;
                }
            }
            
            if (!hasMatchedRole && member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                userMaxLimit = Infinity;
            }

            if (userMaxLimit !== -1) {
                accessibleCommands.push({ cmd, userMaxLimit });
            }
        }

        if (accessibleCommands.length === 0) {
            const panel = new V2PanelBuilder().addText(`> ${iptal} Şu anda erişiminiz olan bir özel komut bulunmuyor.`);
            return interactionOrMessage.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() }).catch(()=>{});
        }

        const panel = new V2PanelBuilder()
            .addAccessory(user.displayAvatarURL({ dynamic: true }), `> ## ${spark} Özel Rol Komutları\n> Aşağıda, yetkilerinize tanımlanmış özel rol komutları ve kotalarınız yer almaktadır.`)
            .addDivider(1);

        for (const { cmd, userMaxLimit } of accessibleCommands) {
            let usageDoc = await CustomCommandUsage.findOne({ guildID: guild.id, commandName: cmd.commandName, managerID: member.id });
            const currentUsage = usageDoc ? usageDoc.givenTo.length : 0;
            const limitText = userMaxLimit === Infinity ? "Sınırsız" : `\`${currentUsage} / ${userMaxLimit}\``;
            
            let globalText = "";
            if (cmd.globalLimit > 0) {
                const allUsages = await CustomCommandUsage.find({ guildID: guild.id, commandName: cmd.commandName });
                const totalGiven = allUsages.reduce((acc, curr) => acc + curr.givenTo.length, 0);
                globalText = ` *(Sunucu Kotası: \`${totalGiven} / ${cmd.globalLimit}\`)*`;
            }

            const roleMentions = cmd.rolesToGive.map(id => `<@&${id}>`).join(", ");
            let targetUsers = "Hiç kimseye vermediniz.";
            if (usageDoc && usageDoc.givenTo.length > 0) {
                targetUsers = usageDoc.givenTo.map(id => `<@${id}>`).join(", ");
            }

            panel.addText(`### ${dot} \`.${cmd.commandName}\`\n**Vereceği Roller:** ${roleMentions}\n**Kişisel Kotanız:** ${limitText} ${globalText}\n**Rol Verdiğiniz Kişiler:** ${targetUsers}`);
        }

        panel.addDivider(1);
        panel.addText(`> ${info} Kota iadesi için verdiğiniz kişiden rolü aynı komutla geri almalısınız.`);

        return interactionOrMessage.reply({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() }).catch(()=>{});
    }
}

module.exports = CustomRoleService;
