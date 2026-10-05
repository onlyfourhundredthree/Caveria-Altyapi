const client = global.bot;
const Settings = require("../../../Settings.json");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { Collection, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const moment = require("moment");
require("moment-duration-format");
moment.locale("tr");

const alwaysJoined = new Collection()
const Punitives = require("../../Core/Database/Punitives");
const WelcomeUser = require("../../Core/Database/Welcome.User");

const welcomeLogic = async (member) => {
    if (member.guild.id != Settings.Main.GuildID) return;

    // Forceban kontrolü - Punitives'den
    let ForceBan = await Punitives.findOne({ Member: member.id, Type: "Kalkmaz Yasaklama", Active: true });
    if (ForceBan) {
        await member.ban({ reason: `(Forceban) - ${ForceBan.Reason || "Sebep Yok"}` }).catch(() => { });
        return;
    }

    // Jail kontrolü - Punitives'den
    let Jail = await Punitives.findOne({ Member: member.id, Type: "Cezalandırılma", Active: true });
    let Underworld = await Punitives.findOne({ Member: member.id, Type: "Underworld", Active: true });
    // Mute kontrolü - Punitives'den
    let Mute = await Punitives.findOne({ Member: member.id, Type: "Metin Susturulma", Active: true });

    let RolesToGive = [];

    const guildMember = member.guild.members.cache.get(member.id);
    if (!guildMember) return;

    let joinLeaveEvent = alwaysJoined.get(member.id) || 0;

    if (joinLeaveEvent >= 3) {
        alwaysJoined.delete(member.id)
        return await guildMember.ban({ reason: "Sürekli Çıkış/Giriş işlemi uygulamak." })
    } else {
        let old = alwaysJoined.get(member.id) || 0
        alwaysJoined.set(member.id, old + 1)
    }

    if (Jail || Underworld) {
        const newRoles = [
            ...(guildMember.roles.cache.has(member.guild.roles.premiumSubscriberRole?.id)
                ? [member.guild.roles.premiumSubscriberRole.id]
                : []
            ),
            Jail ? ConfigManager.get("Roles.Jailed") : ConfigManager.get("Roles.Underworld")
        ].filter(id => id && id.length > 5);

        if (newRoles.length > 0) await guildMember.roles.set(newRoles).catch(() => { });
        return;
    }

    if (ConfigManager.get("Roles.Muted") && Mute)
        RolesToGive.push(ConfigManager.get("Roles.Muted"));

    const memberRoleID = ConfigManager.get("Roles.Member");
    const tagRoleID = ConfigManager.get("Roles.Tag");
    
    if (memberRoleID && member.guild.roles.cache.has(memberRoleID)) {
        if (!member.roles.cache.has(memberRoleID)) {
            // Eğer member rolü ile tag rolü aynıysa, sadece tagı olanlara vermeliyiz! Aksi halde TagManager hemen geri çeker.
            if (memberRoleID === tagRoleID) {
                const targetClanId = Settings.Main.GuildID;
                const clanId = member.user.primaryGuild?.identityGuildId;
                if (clanId === targetClanId) {
                    RolesToGive.push(memberRoleID);
                }
            } else {
                RolesToGive.push(memberRoleID);
            }
        }
    }

    if (RolesToGive.length > 0) {
        await member.roles.add(RolesToGive).catch(err => console.error("Rol verme hatası:", err));
    }

    const chatChannelID = ConfigManager.get("Channels.Chat");
    const chatChannel = client.channels.cache.get(chatChannelID);
    if (chatChannel) {
        const welcomeText = `${member} Sunucumuza katıldı, hoş geldin! Hadi <@&1397597955942514759> hep beraber hoş geldin diyelim.

Sunucu hakkında bilgi almak istiyorsan aşağıdaki bağlantılardan ulaşabilirsin.

<id:guide> kısmından sunucu hakkında bilgi edinebilirsin.
<id:browse> bölümünden tüm kanallarımızı ve rollerimizi görüntüleyebilirsin.

Partnerlik için geldiysen <#1515672099434270860> kanalından yetkililere ulaşabilirsin.`;

        if (ConfigManager.get("WelcomeMessageStatus") !== false) {
            chatChannel.send({
            content: welcomeText
        }).catch(() => { });
        }
    }
};

module.exports = async (member) => {
    if (member.pending) return;
    const fetchedMember = await member.fetch().catch(() => member);
    if (fetchedMember.pending) return;
    await welcomeLogic(fetchedMember);
};

module.exports.welcomeLogic = welcomeLogic;
