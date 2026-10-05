const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const Punitives = require("../../Core/Database/Punitives");

class SicilTemizleService {
    static async execute(context, targetUserResolvable) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const executerMember = isInteraction ? context.member : context.member;
        const guild = context.guild;
        const client = context.client;

        if (!ConfigManager.isOwner(executerMember)) {
            if (!executerMember.permissions.has(PermissionsBitField.Flags.Administrator) && !ConfigManager.get("Roles.RealBan_Staff").some(toji => executerMember.roles.cache.has(toji))) {
                const errObj = { content: "Bu işlemi yapmaya yetkiniz yok.", ephemeral: true };
                if (isInteraction) return context.reply(errObj);
                return;
            }
        }

        if (isInteraction) {
            await context.deferReply({ ephemeral: true }).catch(() => {});
        }

        let member = null;
        let user = null;
        let targetId = null;

        if (typeof targetUserResolvable === 'string') {
            targetId = targetUserResolvable;
            member = guild.members.cache.get(targetId);
            user = client.users.cache.get(targetId) || await client.users.fetch(targetId).catch(() => null);
        } else if (targetUserResolvable && targetUserResolvable.id) {
            targetId = targetUserResolvable.id;
            member = guild.members.cache.get(targetId);
            user = targetUserResolvable;
        }

        if (!targetId || !/^\d{17,19}$/.test(targetId)) {
            const err = "Geçerli bir kullanıcı belirtmelisiniz.";
            if (isInteraction) return context.editReply(err);
            return context.reply(err).then(s => setTimeout(() => s.delete().catch(() => {}), 5000));
        }

        let activePunishmentsRemoved = 0;
        const rolesToRemove = [];

        if (member) {
            const activePunitives = await Punitives.find({ Member: member.id, Active: true }).lean();
            for (const punish of activePunitives) {
                if (punish.Type === "Cezalandırılma") {
                    if (ConfigManager.get("Roles.Jailed")) rolesToRemove.push(ConfigManager.get("Roles.Jailed"));
                    activePunishmentsRemoved++;
                } else if (punish.Type === "Metin Susturulma") {
                    if (ConfigManager.get("Roles.Muted")) rolesToRemove.push(ConfigManager.get("Roles.Muted"));
                    activePunishmentsRemoved++;
                } else if (punish.Type === "Ses Susturulma") {
                    if (member.voice.channel) await member.voice.setMute(false).catch(() => { });
                    activePunishmentsRemoved++;
                } else if (punish.Type === "Underworld") {
                    if (ConfigManager.get("Roles.Underworld")) rolesToRemove.push(ConfigManager.get("Roles.Underworld"));
                    activePunishmentsRemoved++;
                }
            }

            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove).catch(() => { });
                if (ConfigManager.get("Roles.Member") && (rolesToRemove.includes(ConfigManager.get("Roles.Jailed")) || rolesToRemove.includes(ConfigManager.get("Roles.Underworld")))) {
                    await member.roles.add(ConfigManager.get("Roles.Member")).catch(() => { });
                }
            }
        }

        const activeBans = await Punitives.find({ Member: targetId, Type: "Yasaklama", Active: true }).lean();
        if (activeBans.length > 0) {
            await guild.members.unban(targetId, "Sicil temizleme").catch(() => { });
            activePunishmentsRemoved += activeBans.length;
        }

        const res = await Punitives.updateMany({ Member: targetId }, { Hidden: true, Active: false });

        if (res.modifiedCount === 0 && activePunishmentsRemoved === 0) {
            const err = `Belirtilen üyenin (${user ? user.tag : targetId}) zaten temiz bir sicili ve aktif cezası yok!`;
            if (isInteraction) return context.editReply(err);
            return context.reply(err).then(s => setTimeout(() => s.delete().catch(() => {}), 5000));
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const successEmbed = new EmbedBuilder()
            .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() })
            .setColor("Green")
            .setDescription(`${user ? user.tag : `<@${targetId}>`} isimli üyenin verileri temizlendi!\n\n🔹 **Silinen Sicil Kaydı:** ${res.modifiedCount}\n🔷 **Kaldırılan Aktif Ceza:** ${activePunishmentsRemoved}`);

        if (isInteraction) return context.editReply({ embeds: [successEmbed] });
        return context.reply({ embeds: [successEmbed] });
    }
}

module.exports = SicilTemizleService;
