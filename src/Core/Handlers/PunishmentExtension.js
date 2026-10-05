const ms = require('ms');
const moment = require('moment');
require("moment-duration-format");
require("moment-timezone");
const { GuildMember, User, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Punitives = require("../Database/Punitives");
const ConfigManager = require("./ConfigManager");
const PunishmentManager = require("./PunishmentManager");
const EvidenceService = require("../../Services/Moderation/EvidenceService");

const PUNITIVE_TYPES = {
    1: "Kalkmaz Yasaklama",
    2: "Yasaklama",
    3: "Cezalandırılma",
    4: "Ses Susturulma",
    5: "Metin Susturulma",
    6: "Uyarılma",
    7: "Yetkili Uyarı",
    8: "Underworld",
    9: "Etkinlik Cezalı",
    10: "Sözlü Uyarı"
};

const LOG_CHANNELS = {
    "Kalkmaz Yasaklama": { name: "forceban-log", configKey: "ForcebanLog" },
    "Yasaklama":         { name: "ban-log",      configKey: "BanLog" },
    "Underworld":        { name: "underworld-log",configKey: "UnderworldLog" },
    "Cezalandırılma":   { name: "jail-log",      configKey: "JailLog" },
    "Etkinlik Cezalı":   { name: "etkinlik-cezali-log", configKey: "EventJailLog" },
    "Ses Susturulma":   { name: "mute-log",      configKey: "MuteLog" },
    "Metin Susturulma": { name: "mute-log",      configKey: "MuteLog" },
    "Uyarılma":         { name: "uyari-log",     configKey: "UyariLog" }
};

function resolveLogChannel(guild, type) {
    const entry = LOG_CHANNELS[type];
    const channelName = entry ? entry.name : "ceza-log";
    const configKey  = entry ? entry.configKey : null;

    const byName = guild.channels.cache.find(x => x.isTextBased() && x.name.includes(channelName));
    if (byName) return byName;

    if (configKey) {
        const cfgId = ConfigManager.get(`Channels.${configKey}`);
        if (cfgId) {
            const byId = guild.channels.cache.get(cfgId);
            if (byId && byId.isTextBased()) return byId;
        }
    }

    return null;
}

const USER_MESSAGES = {
    "Kalkmaz Yasaklama": "tamamiyle kalkmaz yasaklamaya tabi tutuldun.",
    "Yasaklama": "yasaklandın.",
    "Cezalandırılma": "cezalıya gönderildin.",
    "Etkinlik Cezalı": "Etkinlik Cezalı rolüne gönderildin.",
    "Ses Susturulma": "seste susturuldun.",
    "Metin Susturulma": "metin kanallarında susturuldun.",
    "Underworld": "Underworld'e gönderildin.",
    "Uyarılma": "uyarıldın."
};

const STAFF_USES = {
    "Kalkmaz Yasaklama": "Uses.Forceban",
    "Yasaklama": "Uses.Ban",
    "Cezalandırılma": "Uses.Jail",
    "Etkinlik Cezalı": "Uses.EventJails",
    "Ses Susturulma": "Uses.VoiceMutes",
    "Metin Susturulma": "Uses.Mutes",
    "Underworld": "Uses.Underworld",
    "Uyarılma": "Uses.Warns",
    "Yetkili Uyarı": "Uses.Warns",
    "Sözlü Uyarı": "Uses.SozluWarns"
};

async function logStaffUse(type, staffId, guildId) {
    const path = STAFF_USES[type];
    if (!path) return;

    const StatHistory = require("../Database/StatHistory");

    const today = moment().format("YYYY-MM-DD");
    await StatHistory.findOneAndUpdate(
        { guildID: guildId, userID: staffId, date: today },
        { $inc: { punishment: 1 } },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

module.exports = () => {
    GuildMember.prototype.addPunitives = User.prototype.addPunitives = async function (type, staff, reason = "Sebep belirtilmedi.", message, duration, tier, skipAuto = false) {
        const lastPunishment = await Punitives.findOne().sort({ No: -1 });
        let cezano = lastPunishment ? lastPunishment.No + 1 : 1;

        type = PUNITIVE_TYPES[type] || type;
        let durationMS = 0;
        if (duration) {
            durationMS = Number(ms(duration) || 0);
            if (Date.now() + durationMS > 8640000000000000) {
                durationMS = 8640000000000000 - Date.now();
            }
        }

        const ceza = new Punitives({
            No: cezano,
            Member: this.id,
            Staff: staff.id,
            Type: type,
            Reason: reason,
            Date: Date.now(),
            ...(duration && { Duration: Date.now() + durationMS }),
            LastPunishType: tier,
        });

        await ceza.save().catch(console.error);

        const logComponents = [
            {
                "type": 17,
                "components": [
                    {
                        "type": 9,
                        "accessory": {
                            "type": 11,
                            "media": { "url": this.user ? this.user.displayAvatarURL({ extension: 'png' }) : this.displayAvatarURL({ extension: 'png' }) },
                        },
                        "components": [
                            {
                                "type": 10,
                                "content": `## ${client.user.username} Ceza Sistemi\nCezalandırılan: ${this.toString()}\nYetkili: ${staff.toString()}`
                            }
                        ]
                    },
                    { "type": 14, "divider": true, "spacing": 1 },
                    {
                        "type": 10,
                        "content": `> **Tür:** \`${type}\`\n> **Numara:** \`#${cezano}\`\n> **Sebep:** \`${reason}\`\n> **Süre:** \`${duration ? moment.duration(ms(duration)).format('Y [Yıl,] M [Ay,] d [Gün,] h [Saat,] m [Dakika]') : "Kalıcı"}\`\n> **Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    }
                ]
            }
        ];

        if (message.guild) {
            const logCh = resolveLogChannel(message.guild, type);
            if (logCh) {
                let shouldLog = true;
                if (type === "Uyarılma" && ConfigManager.get("Logs.Toggles.WarnLogActive") === false) shouldLog = false;
                if ((type === "Ses Susturulma" || type === "Metin Susturulma") && ConfigManager.get("Logs.Toggles.MuteLogActive") === false) shouldLog = false;
                if (type === "Cezalandırılma" && ConfigManager.get("Logs.Toggles.JailLogActive") === false) shouldLog = false;
                if ((type === "Yasaklama" || type === "Kalkmaz Yasaklama") && ConfigManager.get("Logs.Toggles.BanLogActive") === false) shouldLog = false;

                if (shouldLog) {
                    logCh.send({
                        flags: [MessageFlags.IsComponentsV2],
                        components: logComponents,
                        allowedMentions: { parse: [] }
                    }).catch(() => {});
                }
            }
        }

        let triggerContent = "Komut";
        if (message.content) {
            triggerContent = message.content;
        } else if (message.commandName) {
            let argsStr = "";
            if (message.options && message.options.data) {
                argsStr = message.options.data.map(opt => `${opt.value}`).join(" ");
            }
            triggerContent = `/${message.commandName} ${argsStr}`.trim();
        }

        const durationInfoStr = duration ? `, \`Süre: ${duration}\`` : "";
        const responseText = `-# > ${staff.toString()}: ${triggerContent}\n${ConfigManager.get("Emojis.toji_onay") || "✨"} Başarıyla **${this.toString()}** isimli kullanıcıya **"${reason || "Belirtilmedi"}"** sebebiyle "**${type}**" işlemi uygulandı. (\`Ceza Numarası: #${cezano}\`${durationInfoStr})`;
        const userMsg = USER_MESSAGES[type] || `"${type}" türünde ceza-i işlem uygulandı.`;

        const evidenceRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`evidence_add_${cezano}`)
                .setLabel("Kanıt Ekle")
                .setEmoji("📸")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`evidence_skip_${cezano}`)
                .setLabel("Kanıt Yok")
                .setStyle(ButtonStyle.Secondary)
        );

        let sentMsg;
        if (!message.silent) {
            if (message.replied || message.deferred) {
                sentMsg = await message.followUp({ content: responseText, components: [evidenceRow], fetchReply: true });
            } else {
                sentMsg = await message.reply({ content: responseText, components: [evidenceRow], fetchReply: true }).catch(async err => {
                    if (message.channel) return await message.channel.send({ content: responseText, components: [evidenceRow] }).catch(() => {});
                });
            }
            if (sentMsg) {
                await Punitives.updateOne({ No: cezano }, { $set: { PromptChannelID: sentMsg.channel ? sentMsg.channel.id : message.channel.id, PromptMessageID: sentMsg.id } }).catch(() => {});
            }
        }

        let dmDurationText = duration ? `**Bitiş Tarihi:** <t:${Math.floor((Date.now() + (ms(duration) || 0)) / 1000)}:R> (<t:${Math.floor((Date.now() + (ms(duration) || 0)) / 1000)}:F>)` : "**Bitiş Tarihi:** Kalıcı";

        const dmV2 = [
            {
                type: 17,
                components: [
                    { type: 10, content: `> **🚫 Sunucumuzda Sana Bir İşlem Uygulandı**` },
                    { type: 14, divider: true },
                    { type: 10, content: `**Yetkili:** \`${staff.user.tag}\`\n**İşlem:** \`${type}\`\n**Sebep:** \`${reason}\`\n**Ceza No:** \`#${cezano}\`\n${dmDurationText}` },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `-# Eğer bu ceza hakkında bir itirazın varsa veya haksızlığa uğradığını düşünüyorsan, üst düzey yetkililerimize ulaşmaktan çekinme.` }
                ]
            }
        ];

        if (type !== "Yasaklama") {
            await this.send({
                components: dmV2,
                flags: [MessageFlags.IsComponentsV2]
            }).catch(() => { });
        }

        await logStaffUse(type, staff.id, message.guild.id);

        let result;
        switch (type) {
            case "Kalkmaz Yasaklama":
                await message.guild.members.ban(this.id, { reason: `#${ceza.No} (${ceza.Reason})` }).catch(() => { });
                break;

            case "Yasaklama":
                result = await message.guild.members.ban(this.id, { reason: `#${ceza.No} (${ceza.Reason})` }).catch(() => { });
                break;

            case "Cezalandırılma":
                let jailTarget = this;
                if (!jailTarget.roles && message.guild) jailTarget = await message.guild.members.fetch(this.id).catch(() => null) || this;
                if (jailTarget.voice) await jailTarget.voice.disconnect().catch(() => { });
                try {
                    let jailRoleId = ConfigManager.get("Roles.Jailed");
                    if (Array.isArray(jailRoleId)) jailRoleId = jailRoleId[0];
                    if (typeof jailRoleId === "string") jailRoleId = jailRoleId.trim();
                    const rolesToSet = [];
                    if (message.guild && jailRoleId && message.guild.roles.cache.has(jailRoleId)) rolesToSet.push(jailRoleId);

                    const premiumRoleId = message.guild?.roles.premiumSubscriberRole?.id;
                    if (jailTarget.roles && premiumRoleId && jailTarget.roles.cache.has(premiumRoleId)) rolesToSet.push(premiumRoleId);

                    if (jailTarget.roles && rolesToSet.length > 0) {
                        await jailTarget.roles.set(rolesToSet).catch(err => console.error(`[JAIL] Role set failed for ${this.id}:`, err));
                    }
                } catch (err) {}
                break;

            case "Ses Susturulma":
                if (this?.voice) await this.voice.setMute(true).catch(() => { });
                break;

            case "Metin Susturulma":
                let muteTarget = this;
                if (!muteTarget.roles && message.guild) muteTarget = await message.guild.members.fetch(this.id).catch(() => null) || this;
                let muteRoleId = ConfigManager.get("Roles.Muted");
                if (Array.isArray(muteRoleId)) muteRoleId = muteRoleId[0];
                if (typeof muteRoleId === "string") muteRoleId = muteRoleId.trim();
                
                if (muteTarget.roles && muteRoleId && message.guild.roles.cache.has(muteRoleId)) {
                    await muteTarget.roles.add(muteRoleId).catch(err => console.error(`[MUTE] Role add failed for ${this.id}:`, err));
                }
                break;

            case "Etkinlik Cezalı":
                let ejTarget = this;
                if (!ejTarget.roles && message.guild) ejTarget = await message.guild.members.fetch(this.id).catch(() => null) || this;
                let ejRoleId = ConfigManager.get("Roles.EventJail") || ConfigManager.get("Roles.EventCezali");
                if (Array.isArray(ejRoleId)) ejRoleId = ejRoleId[0];
                if (typeof ejRoleId === "string") ejRoleId = ejRoleId.trim();
                
                if (ejTarget.roles && ejRoleId && message.guild.roles.cache.has(ejRoleId)) {
                    await ejTarget.roles.add(ejRoleId).catch(err => console.error(`[EVENT_JAIL] Role add failed for ${this.id}:`, err));
                }
                break;
                let uwTarget = this;
                if (!uwTarget.roles && message.guild) uwTarget = await message.guild.members.fetch(this.id).catch(() => null) || this;
                if (uwTarget.voice) await uwTarget.voice.disconnect().catch(() => { });
                try {
                    let underworldRoleId = ConfigManager.get("Roles.Underworld");
                    if (Array.isArray(underworldRoleId)) underworldRoleId = underworldRoleId[0];
                    if (typeof underworldRoleId === "string") underworldRoleId = underworldRoleId.trim();

                    const rolesToSet = [];
                    if (message.guild && underworldRoleId && message.guild.roles.cache.has(underworldRoleId)) rolesToSet.push(underworldRoleId);

                    const premiumRoleId = message.guild?.roles.premiumSubscriberRole?.id;
                    if (uwTarget.roles && premiumRoleId && uwTarget.roles.cache.has(premiumRoleId)) rolesToSet.push(premiumRoleId);

                    if (uwTarget.roles && rolesToSet.length > 0) {
                        await uwTarget.roles.set(rolesToSet).catch(err => console.error(`[UNDERWORLD] Role set failed for ${this.id}:`, err));
                    }
                } catch (err) {
                    console.error(`[UNDERWORLD] Try-catch error for ${this.id}:`, err);
                }
                break;

            case "Yetkili Uyarı": {
                const totalWarns = await Punitives.countDocuments({
                    Member: this.id,
                    Type: "Yetkili Uyarı",
                    Active: true
                });

                const logChannel = message.guild.channels.cache.find(x => x.name === "📢﹒yetkili-uyarı");
                if (logChannel) {
                    await logChannel.send(
                        `${this.toString()} isimli yetkili, ${staff.toString()} tarafından **${reason}** sebebiyle uyarıldı.\n` +
                        `Toplam uyarı sayısı: **${totalWarns}** (Ceza Numarası: ${cezano})`
                    );
                }

                await logStaffUse(type, staff.id, message.guild.id);
                break;
            }

            default:
                break;
        }

        if (this.guild) await PunishmentManager.checkAutoPunishment(this, message, skipAuto);

        // EvidenceButton listeners are removed as it is now handled by EvidenceJob and EvidenceSubmitHandler.

        return result;
    };

    GuildMember.prototype.removePunitives = User.prototype.removePunitives = async function (cezaNo, staff, message, reason = "Kaldırıldı") {
        let query = cezaNo ? { No: Number(cezaNo), Member: this.id } : { Member: this.id, Active: true };
        const ceza = await Punitives.findOne(query).sort({ Date: -1 });
        if (!ceza) return null;

        await Punitives.updateOne(
            { _id: ceza._id },
            { $set: { Active: false, Hidden: true, Expried: Date.now(), Remover: staff.id, RemoveReason: reason, RemoveDate: Date.now() } }
        );

        const logComponents = [
            {
                "type": 17,
                "components": [
                    {
                        "type": 9,
                        "accessory": {
                            "type": 11,
                            "media": { "url": this.user ? this.user.displayAvatarURL({ extension: 'png' }) : this.displayAvatarURL({ extension: 'png' }) },
                        },
                        "components": [
                            {
                                "type": 10,
                                "content": `## ${client.user.username} Ceza Sistemi\nCezası Kaldırılan: ${this.toString()}\nKaldıran Yetkili: ${staff.toString()}`
                            }
                        ]
                    },
                    { "type": 14, "divider": true, "spacing": 1 },
                    {
                        "type": 10,
                        "content": `> **Tür:** \`${ceza.Type} (Kaldırıldı)\`\n> **Numara:** \`#${ceza.No}\`\n> **Sebep:** \`${ceza.Reason}\`\n> **Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    }
                ]
            }
        ];

        if (message.guild) {
            const logCh = resolveLogChannel(message.guild, ceza.Type);
            if (logCh) {
                logCh.send({
                    flags: [MessageFlags.IsComponentsV2],
                    components: logComponents,
                    allowedMentions: { parse: [] }
                }).catch(() => {});
            }
        }

        let triggerContent = "Komut";
        if (message.content) {
            triggerContent = message.content;
        } else if (message.commandName) {
            let argsStr = "";
            if (message.options && message.options.data) {
                argsStr = message.options.data.map(opt => `${opt.value}`).join(" ");
            }
            triggerContent = `/${message.commandName} ${argsStr}`.trim();
        }

        const responseText = `-# > ${staff.toString()}: ${triggerContent}\n${ConfigManager.get("Emojis.toji_onay") || "✨"} Başarıyla **${this.toString()}** isimli kullanıcının "**${ceza.Type}**" cezası kaldırıldı. (\`Ceza Numarası: #${ceza.No}\`)`;

        const evidenceRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`evidence_add_${ceza.No}`)
                .setLabel("Kanıt Ekle")
                .setEmoji("📸")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`evidence_skip_${ceza.No}`)
                .setLabel("Kanıt Yok")
                .setStyle(ButtonStyle.Secondary)
        );

        let sentMsg;
        if (!message.silent) {
            if (message.replied || message.deferred) {
                sentMsg = await message.followUp({ content: responseText, components: [evidenceRow], fetchReply: true }).catch(() => {});
            } else {
                sentMsg = await message.reply({ content: responseText, components: [evidenceRow], fetchReply: true }).catch(async err => {
                    if (message.channel) return await message.channel.send({ content: responseText, components: [evidenceRow] }).catch(() => {});
                });
            }
        }

        if (ceza.Type !== "Yasaklama" && ceza.Type !== "Kalkmaz Yasaklama") {
            await this.send({
                content: `Sunucumuzda \`${staff.user.tag}\` tarafından **${reason}** sebebi ile \`${ceza.Type}\` türündeki cezanız (<t:${Math.floor(Date.now() / 1000)}:R>) kaldırıldı. (**Ceza Numarası**: \`#${ceza.No}\`)`
            }).catch(() => { });
        }

        switch (ceza.Type) {
            case "Yasaklama":
            case "Kalkmaz Yasaklama":
                await message.guild.members.unban(this.id).catch(() => {});
                break;
            case "Cezalandırılma":
            case "Underworld":
                try {
                    let targetMember = (this.roles && this.guild) ? this : (message.guild ? await message.guild.members.fetch(this.id).catch(() => null) : null);
                    if (targetMember) {
                        const jailRoleId = ConfigManager.get("Roles.Jailed");
                        const uwRoleId = ConfigManager.get("Roles.Underworld");
                        if (jailRoleId) await targetMember.roles.remove(jailRoleId).catch(() => {});
                        if (uwRoleId) await targetMember.roles.remove(uwRoleId).catch(() => {});

                        const unjailRoles = ConfigManager.get("Roles.Unjail_Roles");
                        const memberRole = ConfigManager.get("Roles.Member");
                        const rolesToAdd = [];
                        if (unjailRoles) rolesToAdd.push(...(Array.isArray(unjailRoles) ? unjailRoles : [unjailRoles]));
                        if (memberRole) rolesToAdd.push(...(Array.isArray(memberRole) ? memberRole : [memberRole]));

                        const boosterRoleId = targetMember.guild?.roles?.premiumSubscriberRole?.id;
                        if (boosterRoleId && targetMember.roles.cache.has(boosterRoleId)) rolesToAdd.push(boosterRoleId);

                        const cleanRoles = Array.from(new Set(rolesToAdd.filter(r => typeof r === "string" && r.length > 5 && targetMember.guild.roles.cache.has(r))));
                        if (cleanRoles.length > 0) {
                            await targetMember.roles.add(cleanRoles).catch(err => console.error("[PunishmentExtension] Role add failed:", err));
                        }
                    }
                } catch(e) { console.error(e); }
                break;
        }

        // EvidenceButton listeners are removed as it is now handled by EvidenceJob and EvidenceSubmitHandler.

        return true;
    };
};
