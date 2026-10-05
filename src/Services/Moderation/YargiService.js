const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { PermissionsBitField, MessageFlags } = require('discord.js');
const Punitives = require("../../Core/Database/Punitives");

class YargiService {
    static async executeYargi(context, targetUserResolvable, reasonStr) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const memberObj = isInteraction ? context.member : context.member;
        const client = context.client;
        const guild = context.guild;

        if (isInteraction) {
            await context.deferReply().catch(() => {});
        }

        let user;
        let member;
        if (typeof targetUserResolvable === 'string') {
            user = client.users.cache.get(targetUserResolvable) || await client.users.fetch(targetUserResolvable).catch(() => null);
            member = guild.members.cache.get(targetUserResolvable);
        } else {
            user = targetUserResolvable;
            member = guild.members.cache.get(user?.id);
        }

        const replyOrEdit = (content) => {
            if (isInteraction) return context.editReply(content);
            return context.reply(content).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        };

        if (!ConfigManager.isOwner(memberObj)) {
            if (
                !memberObj.permissions.has(PermissionsBitField.Flags.Administrator) &&
                !ConfigManager.get("Roles.RealBan_Staff").some(toji => memberObj.roles.cache.has(toji))
            ) {
                const errObj = { content: "Yetkiniz yetersiz.", ephemeral: true };
                if (isInteraction) return context.editReply(errObj);
                return;
            }

            if (!user) return replyOrEdit("Bir kullanıcı belirtmelisiniz.");
            if (user.bot) return replyOrEdit("Botlara işlem uygulayamazsınız.");
            if (member && memberObj.roles.highest.position <= member.roles.highest.position)
                return replyOrEdit("Bu kullanıcıya işlem uygulayamazsınız.");
        }

        if (!user && ConfigManager.isOwner(memberObj))
            return replyOrEdit("Bir kullanıcı belirtmelisiniz.");

        if (user.id === author.id)
            return replyOrEdit("Kendinize işlem uygulayamazsınız.");

        let Reason = reasonStr || "Bir sebep belirtilmemiş.";

        let targetId = user.id;
        let isGuildMember = guild.members.cache.has(targetId);
        let guildMember = isGuildMember ? guild.members.cache.get(targetId) : null;
        let target = guildMember || user;

        try {
            const isBanned = await guild.bans.fetch(targetId).catch(() => null);
            if (isBanned) {
                const res = await Punitives.findOne({ Member: targetId, Type: { $in: ["Underworld", "Yasaklama"] }, Active: true });
                if (res) {
                    if (target.removePunitives) await target.removePunitives(res.No, memberObj, context, "Kaldırıldı (.sg ile)");
                } else {
                    await guild.members.unban(targetId, `Yetkili: ${author.tag} tarafından kaldırıldı. (.sg ile)`);
                    replyOrEdit(`Kullanıcının veritabanında aktif cezası bulunamadı ancak Discord üzerindeki yasaklaması kaldırıldı.`);
                }
                return;
            }
        } catch (e) {}

        try {
            if (target.addPunitives) {
                await target.addPunitives(2, memberObj, Reason, context);
            } else {
                return replyOrEdit("Hedef kullanıcıya punitive eklenemiyor. (addPunitives metodu yok)");
            }
        } catch (err) {
            console.error(err);
            return replyOrEdit("Kullanıcıyı banlarken bir hata oluştu.");
        }
    }

    static async executeUnYargi(context, targetUserResolvable, reasonStr) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const memberObj = isInteraction ? context.member : context.member;
        const client = context.client;
        const guild = context.guild;

        if (isInteraction) {
            await context.deferReply().catch(() => {});
        }

        const replyOrEdit = (content) => {
            if (isInteraction) return context.editReply(content);
            return context.reply(content).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        };

        if (
            !memberObj.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !ConfigManager.get("Roles.RealBan_Staff").some(role => memberObj.roles.cache.has(role))
        ) {
            const errObj = { content: "Yetkiniz yetersiz.", ephemeral: true };
            if (isInteraction) return context.editReply(errObj);
            return;
        }

        let user;
        if (typeof targetUserResolvable === 'string') {
            user = client.users.cache.get(targetUserResolvable) || await client.users.fetch(targetUserResolvable).catch(() => null);
        } else {
            user = targetUserResolvable;
        }

        if (!user) return replyOrEdit("Geçerli bir kullanıcı belirtmelisiniz.");
        if (user.bot) return replyOrEdit("Botlara işlem uygulayamazsınız.");
        if (author.id === user.id) return replyOrEdit("Kendinize işlem uygulayamazsınız.");

        let Reason = reasonStr || "Bir sebep belirtilmemiş.";

        const activeBans = await Punitives.find({ Member: user.id, Type: "Yasaklama", Active: true }).sort({ No: -1 }).lean();
        const bans = await guild.bans.fetch().catch(() => new Map());
        const isBanned = bans.has(user.id);

        if (!isBanned && activeBans.length === 0) {
            return replyOrEdit("Belirtilen üyenin aktif bir yasaklaması bulunmuyor!");
        }

        if (activeBans.length > 0) {
            const latestBan = activeBans[0];
            if (latestBan.Staff !== author.id &&
                guild.members.cache.get(latestBan.Staff) &&
                !memberObj.permissions.has(PermissionsBitField.Flags.Administrator)) {
                
                const errorLayout = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `> ⛔ Bu ceza ${latestBan.Staff ? (guild.members.cache.get(latestBan.Staff) ? `${guild.members.cache.get(latestBan.Staff)} (\`${latestBan.Staff}\`)` : `${latestBan.Staff}`) : `${latestBan.Staff}`} tarafından verilmiş. **Bu cezayı açma yetkiniz yok!**\n> -# Bir cezayı sadece uygulayan yetkili veya admin kaldırabilir.`
                            }
                        ]
                    }
                ];

                const errObj = { flags: [MessageFlags.IsComponentsV2], components: errorLayout };
                if (isInteraction) return context.editReply(errObj);
                return context.channel.send(errObj).then(x => setTimeout(() => x.delete().catch(() => { }), 7500));
            }

            await Punitives.updateMany(
                { Member: user.id, Type: "Yasaklama", Active: true },
                { $set: { Active: false, Expried: Date.now(), Remover: memberObj.id } }
            );
        }

        await guild.members.unban(user.id, Reason).catch(() => { });

        const emojis = ConfigManager.get("Emojis") || {};
        const successEmoji = emojis.toji_onay || "🟢";

        const findChannel = guild.channels.cache.find(x => x.name === "ban-log");
        if (findChannel) {
            await findChannel.send({
                flags: [MessageFlags.IsComponentsV2],
                components: [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `> ${successEmoji} ${user.tag} üyesinin sunucudaki ${activeBans.length > 0 ? `\`#${activeBans.map(x => x.No).join(", #")}\` ceza numaralı yasaklamaları` : "yasaklaması"},\n> <t:${Math.floor(Date.now() / 1000)}:R> ${author} tarafından kaldırıldı.`
                            }
                        ]
                    }
                ]
            });
        }

        const sucMsg = `Başarıyla ${user.tag} üyesinin ${activeBans.length > 0 ? `(\`#${activeBans.map(x => x.No).join(", #")}\`) ceza numaralı` : "sunucudaki"} yasaklaması kaldırıldı!`;
        if (isInteraction) return context.editReply(sucMsg);
        return context.reply(sucMsg);
    }
}

module.exports = YargiService;
