const client = global.bot;

const ConfigManager = require("../../Core/Handlers/ConfigManager");
const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
const { EmbedBuilder, MessageFlags } = require("discord.js");


module.exports = async (member) => {
    if (member.user.bot) return;


    const StatHistory = require("../../Core/Database/StatHistory");
    const moment = require("moment-timezone");

    const inviterDoc = await StatHistory.findOne({
        guildID: member.guild.id,
        "invites.memberID": member.user.id
    });

    if (inviterDoc) {
        const inviteEntry = inviterDoc.invites.find(x => x.memberID === member.user.id);
        const isFake = inviteEntry ? inviteEntry.isFake : false;

        await StatHistory.updateOne(
            { _id: inviterDoc._id },
            { $pull: { invites: { memberID: member.user.id } } }
        );

        const today = moment().tz("Europe/Istanbul").format("YYYY-MM-DD");
        try {
            await StatHistory.findOneAndUpdate(
                { guildID: member.guild.id, userID: inviterDoc.userID, date: today },
                {
                    $inc: {
                        invite: isFake ? 0 : -1,
                        inviteFake: isFake ? -1 : 0,
                        inviteLeave: 1
                    }
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
        } catch (err) { console.error("StatHistory Update Error (Leave):", err); }
    }

    const logChannel = member.guild.channels.cache.find(ch => ch.name === "invite-log" && ch.isTextBased());
    if (logChannel) {
        if (inviterDoc) {
            const iData = await StatHistory.aggregate([
                { $match: { userID: inviterDoc.userID, guildID: member.guild.id } },
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

            const inviterUser = await client.users.fetch(inviterDoc.userID).catch(() => null);
            const inviterTag = inviterUser ? inviterUser.tag : "Bilinmiyor";
            const inviterMention = inviterUser ? inviterUser.toString() : `\`${inviterDoc.userID}\``;

            const v2Log = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: member.user.displayAvatarURL() } },
                        components: [
                            { type: 10, content: `> ## Sunucudan Ayrıldı\n> -# ${member.user.tag} sunucudan ayrıldı. Onu davet eden: **${inviterTag}**` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Ayrılan Kullanıcı:** ${member.user.tag} (\`${member.id}\`)\n**Davet Eden:** ${inviterMention}\n**Kalan Davet Sayısı:** ${total} (Normal: ${st.invite}, Fake: ${st.fake}, Ayrılan: ${st.leave})` }
                ]
            }];
            logChannel.send({ components: v2Log, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
        } else {
             const v2Log = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: member.user.displayAvatarURL() } },
                        components: [
                            { type: 10, content: `> ## Sunucudan Ayrıldı\n> -# ${member.user.tag} sunucudan ayrıldı ancak davet bilgisi bulunamadı.` }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    { type: 10, content: `> ### ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Detaylar**\n**Kullanıcı:** ${member.user.tag} (\`${member.id}\`)` }
                ]
            }];
            logChannel.send({ components: v2Log, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
        }
    }

    const claimLogId = ConfigManager.get("Channels.ClaimDropChannel");
    const claimLog = member.guild.channels.cache.get(claimLogId);
    if (claimLog) {
        try {
            const messages = await claimLog.messages.fetch({ limit: 50 });
            const claimMessage = messages.find(m => {
                const stringified = JSON.stringify(m.components || []);
                return stringified.includes(`"custom_id":"claim_member_${member.id}"`) || stringified.includes(`"customId":"claim_member_${member.id}"`);
            });
            if (claimMessage) await claimMessage.delete().catch(() => {});
        } catch (e) { console.error("Claim Message Deletion Error (Leave):", e); }
    }

    await InviteClaimManager.cancelClaimOnLeave(member.guild.id, member.id);

};
