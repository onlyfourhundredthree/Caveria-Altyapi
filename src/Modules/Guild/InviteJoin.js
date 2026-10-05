const client = global.bot;
const moment = require("moment-timezone");
const XPManager = require("../../Core/Handlers/XPManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { MessageFlags } = require("discord.js");

module.exports = async (member) => {
    if (member.user.bot) return;

    const guildInvites = await member.guild.invites.fetch().catch(() => null);
    if (!guildInvites) return;

    let usedInvite = null;
    let isVanity = false;
    const vanityData = await member.guild.fetchVanityData().catch(() => null);

    if (!client.inviteCache) client.inviteCache = new Map();
    const cachedInvites = client.inviteCache.get(member.guild.id);
    if (cachedInvites) {
        for (const [code, invite] of guildInvites) {
            const cachedUses = cachedInvites.get(code) || 0;
            if (invite.uses > cachedUses) {
                usedInvite = invite;
                break;
            }
        }

        if (!usedInvite && vanityData) {
            const cachedVanityUses = cachedInvites.get("VANITY") || 0;
            if (vanityData.uses > cachedVanityUses) {
                usedInvite = {
                    code: vanityData.code,
                    uses: vanityData.uses,
                    inviter: { id: "VANITY" }
                };
                isVanity = true;
            }
        }
    }

    const newInviteMap = new Map();
    guildInvites.forEach(inv => newInviteMap.set(inv.code, inv.uses));
    if (vanityData) newInviteMap.set("VANITY", vanityData.uses);
    client.inviteCache.set(member.guild.id, newInviteMap);

    if (usedInvite && usedInvite.inviter && usedInvite.inviter.id !== "VANITY") {
        const inviterID = usedInvite.inviter.id;
        const isFake = (Date.now() - member.user.createdTimestamp) < (1000 * 60 * 60 * 24 * 7);

        const StatHistory = require("../../Core/Database/StatHistory");
        const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");

        await StatHistory.findOneAndUpdate(
            { guildID: member.guild.id, userID: inviterID, date: today },
            {
                $inc: {
                    invite: isFake ? 0 : 1,
                    inviteFake: isFake ? 1 : 0
                },
                $push: {
                    invites: {
                        memberID: member.user.id,
                        date: Date.now(),
                        isFake: isFake
                    }
                }
            },
            { upsert: true, setDefaultsOnInsert: true }
        );

        if (!isFake) {
            const inviter = member.guild.members.cache.get(inviterID);
            if (inviter) {
                await XPManager.processPassive(member.guild, inviter, "INVITE");
                const TaskManager = require("../../Core/Handlers/TaskManager");
                await TaskManager.progressTask(member.guild, inviter, "INVITE");
                await TaskManager.progressMandatory(member.guild, inviter, "INVITE", 1);

                const Economy = require("../../Core/Database/Economy");
                const inviteCoinAmount = ConfigManager.get("Economy.InviteCoin") || 25;
                await Economy.findOneAndUpdate(
                    { guildID: member.guild.id, userID: inviterID },
                    { $inc: { coin: inviteCoinAmount } },
                    { upsert: true }
                );

                const activeGiveaways = client.giveawayManager ? client.giveawayManager.giveaways.filter(gw => !gw.ended && gw.extraData?.minInvites) : [];
                const GiveawayStats = require("../../Core/Database/GiveawayStats");
                for (const gw of activeGiveaways) {
                    await GiveawayStats.findOneAndUpdate(
                        { giveawayId: gw.messageId, userId: inviterID },
                        { $inc: { inviteCount: 1 } },
                        { upsert: true }
                    );
                }
            }
        }
    }

    const logChannel = member.guild.channels.cache.find(ch => ch.name === "invite-log" && ch.isTextBased());
    if (logChannel) {
        let v2Log = [];
        if (isVanity) {
            v2Log = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: member.user.displayAvatarURL() } },
                        components: [
                            { type: 10, content: `> ## Sunucuya Katıldı\n> -# ${member} sunucuya **Vanity URL** (Özel Davet) kullanarak katıldı.` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Kullanıcı:** ${member.user.tag} (\`${member.id}\`)\n**Davet URL:** ${vanityData.code}\n**Vanity Kullanım:** ${vanityData.uses}` }
                ]
            }];
        } else if (usedInvite && usedInvite.inviter && usedInvite.inviter.tag) {
            const inviterID = usedInvite.inviter.id;
            const StatHistory = require("../../Core/Database/StatHistory");
            const iData = await StatHistory.aggregate([
                { $match: { userID: inviterID, guildID: member.guild.id } },
                {
                    $group: {
                        _id: "$userID",
                        invite: { $sum: "$invite" },
                        bonus: { $sum: "$inviteBonus" },
                        fake: { $sum: "$inviteFake" },
                        leave: { $sum: "$inviteLeave" }
                    }
                }
            ]);
            const st = iData[0] || { invite: 0, bonus: 0, fake: 0, leave: 0 };
            const total = st.invite + st.bonus;
            const isFake = (Date.now() - member.user.createdTimestamp) < (1000 * 60 * 60 * 24 * 7);

            v2Log = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: member.user.displayAvatarURL() } },
                        components: [
                            { type: 10, content: `> ## Sunucuya Katıldı\n> -# ${member} sunucuya **${usedInvite.inviter.tag}** davetiyle katıldı.` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Kullanıcı:** ${member.user.tag} (\`${member.id}\`)\n**Davet Eden:** ${usedInvite.inviter} (\`${usedInvite.inviter.id}\`)\n**Davet Sayısı:** ${total} (Normal: ${st.invite}, Fake: ${st.fake}, Ayrılan: ${st.leave})\n**Hesap Durumu:** ${isFake ? "Şüpheli (Fake)" : "Güvenli"}` }
                ]
            }];
        } else {
            v2Log = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: member.user.displayAvatarURL() } },
                        components: [
                            { type: 10, content: `> ## Sunucuya Katıldı\n> -# ${member} sunucuya katıldı ancak davet bilgisi bulunamadı.` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Kullanıcı:** ${member.user.tag} (\`${member.id}\`)` }
                ]
            }];
        }
        if (v2Log.length > 0) logChannel.send({ components: v2Log, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
    }


};
