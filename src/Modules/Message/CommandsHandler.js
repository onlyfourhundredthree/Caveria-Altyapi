const { Client, EmbedBuilder, ChannelType, AuditLogEvent, PermissionsBitField, AttachmentBuilder, MessageFlags } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const client = global.bot;
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Settings = require("../../../Settings.json");

if (!client.commandCooldown) client.commandCooldown = new Map();
if (!client.globalCooldown) client.globalCooldown = new Map();

module.exports = async (message) => {
    if (message.author.bot || !message.guild) return;

    let prefixes = Settings.Main.Prefixs || [];
    let Prefix = prefixes.find((x) => message.content.toLowerCase().startsWith(x));


    if (!Prefix) return;

    const underworldRole = ConfigManager.get("Roles.Underworld");
    if (underworldRole && message.member.roles.cache.has(underworldRole)) {
        return;
    }

    let args = message.content.slice(Prefix.length).trim().split(/ +/g);
    let commandName = args.shift().toLowerCase();


    let cmd = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));

    if (!cmd) {
        const CustomRoleCommand = require("../../Core/Database/CustomRoleCommand");
        const customCmd = await CustomRoleCommand.findOne({ guildID: message.guild.id, commandName });

        if (customCmd) {
            const CustomCommandUsage = require("../../Core/Database/CustomCommandUsage");
            
            let userMaxLimit = -1;
            let hasMatchedRole = false;
            
            if (customCmd.roleLimits && customCmd.roleLimits.length > 0) {
                for (const rLimit of customCmd.roleLimits) {
                    if (message.member.roles.cache.has(rLimit.roleID)) {
                        hasMatchedRole = true;
                        if (rLimit.limit === 0) {
                            userMaxLimit = Infinity;
                        } else if (userMaxLimit !== Infinity && rLimit.limit > userMaxLimit) {
                            userMaxLimit = rLimit.limit;
                        }
                    }
                }
            }

            if (!hasMatchedRole && customCmd.allowedRoles && customCmd.allowedRoles.length > 0) {
                const hasRole = customCmd.allowedRoles.some(roleId => message.member.roles.cache.has(roleId));
                if (hasRole) {
                    userMaxLimit = Infinity;
                    hasMatchedRole = true;
                }
            }
            
            if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                userMaxLimit = Infinity;
            }

            if (userMaxLimit === -1) return;

            let targetId = args[0]?.replace(/[<@!>]/g, "");
            let target = message.mentions.members.first();

            if (!target && targetId) {
                target = await message.guild.members.fetch(targetId).catch(() => null);
            }

            if (!target) return message.reply("Lütfen bir üye belirtin veya geçerli bir ID girin.").catch(() => {});

            let usageDoc = await CustomCommandUsage.findOne({ guildID: message.guild.id, commandName, managerID: message.member.id });
            if (!usageDoc) {
                usageDoc = new CustomCommandUsage({ guildID: message.guild.id, commandName, managerID: message.member.id, givenTo: [] });
            }

            const isAdding = customCmd.rolesToGive.some(r => !target.roles.cache.has(r));
            const isRemoving = customCmd.rolesToGive.some(r => target.roles.cache.has(r));

            if (isAdding && !isRemoving) {
                if (userMaxLimit !== Infinity && usageDoc.givenTo.length >= userMaxLimit) {
                    return message.reply(`❌ Bu komut için kişisel rol verme kotanızı (**${userMaxLimit}**) doldurdunuz. \n*Mevcut verdikleriniz görmek için \`.rolbilgim\` yazabilirsiniz.*`).catch(()=>{});
                }
                
                if (customCmd.globalLimit > 0) {
                    const allUsages = await CustomCommandUsage.find({ guildID: message.guild.id, commandName });
                    const totalGiven = allUsages.reduce((acc, curr) => acc + curr.givenTo.length, 0);
                    if (totalGiven >= customCmd.globalLimit) {
                        return message.reply(`❌ Bu komut için sunucu genelindeki kota (**${customCmd.globalLimit}**) dolmuştur.`).catch(()=>{});
                    }
                }
            }

            const rolesAdded = [];
            const rolesRemoved = [];

            const botMember = message.guild.members.me;
            if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.reply("Botun 'Rolleri Yönet' yetkisi bulunmuyor!").catch(() => {});
            }

            for (const roleId of customCmd.rolesToGive) {
                const role = message.guild.roles.cache.get(roleId);
                if (!role) continue;

                if (role.position >= botMember.roles.highest.position) {
                    continue; // Skip roles the bot cannot manage
                }

                try {
                    if (target.roles.cache.has(roleId)) {
                        await target.roles.remove(roleId);
                        rolesRemoved.push(role.name);
                    } else {
                        await target.roles.add(roleId);
                        rolesAdded.push(role.name);
                    }
                } catch (err) {
                    console.error(`Rol işlemi sırasında hata (${role.name}):`, err);
                }
            }
            
            if (rolesAdded.length > 0) {
                if (!usageDoc.givenTo.includes(target.id)) {
                    usageDoc.givenTo.push(target.id);
                }
            } else if (rolesRemoved.length > 0 && rolesAdded.length === 0) {
                if (usageDoc.givenTo.includes(target.id)) {
                    usageDoc.givenTo = usageDoc.givenTo.filter(id => id !== target.id);
                }
            }
            
            await usageDoc.save();

            if (rolesAdded.length === 0 && rolesRemoved.length === 0) {
                return message.reply("Herhangi bir rol işlemi yapılamadı! (Roller bulunamadı veya botun yetkisi yetersiz)").catch(() => {});
            }

            let feedbackMsg = "";
            const staff = `${message.member} tarafından`;

            if (rolesAdded.length > 0 && rolesRemoved.length > 0) {
                feedbackMsg = `${target} isimli kullanıcının rolleri ${staff} güncellendi: \`${rolesAdded.join(", ")}\` verildi, \`${rolesRemoved.join(", ")}\` geri alındı.`;
            } else if (rolesAdded.length > 0) {
                feedbackMsg = `${target} isimli kullanıcıya ${staff} \`${rolesAdded.join(", ")}\` rolü verildi.`;
            } else if (rolesRemoved.length > 0) {
                feedbackMsg = `${target} isimli kullanıcıdan ${staff} \`${rolesRemoved.join(", ")}\` rolü geri alındı.`;
            }

            await message.reply({ content: feedbackMsg }).catch(() => {});

            const logChannel = message.guild.channels.cache.get(customCmd.logChannelID);
            if (logChannel) {
                const emojis = ConfigManager.get("Emojis") || {};
                const spark = emojis.toji_sparkles || "✦";
                
                const islemOzeti = feedbackMsg.includes("tarafından") ? feedbackMsg.split("tarafından")[1].trim() : feedbackMsg;

                const logPanel = new V2PanelBuilder()
                    .addAccessory(message.guild.iconURL({ dynamic: true }), `> ## ${spark} Özel Komut Kullanım Kaydı\n> ${target} kullanıcısının rolleri **${commandName}** komutu ile güncellendi.`)
                    .addDivider(1)
                    .addText(`**Komut:** \`.${commandName}\`\n**Yetkili:** ${message.member} (\`${message.author.id}\`)\n**Hedef Üye:** ${target} (\`${target.id}\`)\n**İşlem Özeti:** ${islemOzeti}`);

                logChannel.send({
                    flags: [MessageFlags.IsComponentsV2],
                    components: logPanel.toJSON()
                }).catch(() => {});
            }
            customCmd.useCount++;
            await customCmd.save();
            return;
        }
        return;
    }

    const Embed = new EmbedBuilder()
        .setAuthor({ name: message.member.displayName, iconURL: message.author.avatarURL({ dynamic: true }) })
        .setColor("LuminousVividPink")
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

    const LogChannel = client.channels.cache.find(x => x.name === "command-log");

    if (cmd.conf && cmd.conf.owner && !ConfigManager.isOwner(message.member)) {
        return;
    }

    let AllowedChannels = ConfigManager.get("Channels.Allowed_Commands");
    if (!Array.isArray(AllowedChannels)) AllowedChannels = [];
    const isAllowedChannel = AllowedChannels.includes(message.channel.id) || (message.channel.isThread() && AllowedChannels.includes(message.channel.parentId));
    const isTicketChannel = message.channel.parentId === ConfigManager.get("Channels.TicketCategory") || message.channel.name.startsWith("ticket-");
    const isTicketCommand = cmd.conf && (cmd.conf.name === "ticket" || (cmd.conf.aliases && cmd.conf.aliases.includes("ticket")));

    if (!ConfigManager.isOwner(message.member) && !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !isAllowedChannel && !message.channel.name.includes("ship") && !isTicketChannel && !isTicketCommand) {
        if (message.deletable) message.delete().catch(() => { });
        return message.reply({ content: `Bu komutu sadece ${AllowedChannels.map(x => `<#${x}>`).join(", ")} kanallarında kullanabilirsiniz.` })
            .then((e) => setTimeout(() => { e.delete().catch(() => { }); }, 5000)).catch(() => {});
    }

    let RealBanStaff = ConfigManager.get("Roles.RealBan_Staff");
    if (!Array.isArray(RealBanStaff)) RealBanStaff = [];
    const isExempt = ConfigManager.isOwner(message.member) || RealBanStaff.some(role => message.member.roles.cache.has(role));
    const commandCooldown = (cmd?.conf ? cmd.conf.cooldown : cmd?.cooldown) || 5000;
    const generalCooldown = 3000;

    if (!isExempt) {
        const userKey = message.author.id;
        const now = Date.now();

        const lastGlobal = client.globalCooldown.get(userKey) || 0;
        const hasSpecificCooldown = cmd?.conf ? cmd.conf.cooldown : cmd?.cooldown;
        if (!hasSpecificCooldown && now - lastGlobal < generalCooldown) {
            return message.reply({ content: `${message.member}, bir komutu tekrar kullanabilmek için **${((generalCooldown - (now - lastGlobal)) / 1000).toFixed(1)}** saniye beklemelisin.` })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 3000)).catch(() => {});
        }

        const commandKey = `${userKey}_${commandName}`;
        const lastCommand = client.commandCooldown.get(commandKey) || 0;
        if (now - lastCommand < commandCooldown) {
            return message.reply({ content: `${message.member}, bu komutu tekrar kullanabilmek için **${((commandCooldown - (now - lastCommand)) / 1000).toFixed(1)}** saniye beklemelisin.` })
                .then(msg => setTimeout(() => msg.delete().catch(() => { }), 3000)).catch(() => {});
        }

        client.globalCooldown.set(userKey, now);
        client.commandCooldown.set(commandKey, now);
    }
    if (cmd.run) {
        cmd.run(client, message, args, Embed, Prefix);
    } else if (cmd.execute) {
        cmd.execute(client, message, args, Embed, Prefix);
    }

    if (LogChannel) {
        const emojis = ConfigManager.get("Emojis") || {};
        const toji_create = emojis.toji_create || "✨";
        const MaravilhaEmbed = new EmbedBuilder()
            .setAuthor({ name: message.member.displayName, iconURL: message.author.avatarURL({ dynamic: true }) })
            .setColor("LuminousVividPink")
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp()
            .setDescription(`${toji_create} ${message.member} tarafından <t:${Math.floor(Date.now() / 1000)}:R> bir komut kullanıldı.\n\n\`\`\`-> Kullanılan Komut:\n- ${message.content}\n-> Kullanılan Kanal:\n- ${message.channel.name}\`\`\``);

        LogChannel.send({ embeds: [MaravilhaEmbed] });
    }
}
