const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Punitives = require("../../Core/Database/Punitives");
const ms = require("ms");

async function pardonUser(memberId, guild, staffId) {
    let affected = 0;
    
    const activePunishments = await Punitives.find({
        Member: memberId,
        Active: true,
        Type: { $in: ["Cezalandırılma", "Underworld"] }
    });

    if (activePunishments.length > 0) {
        for (const punishment of activePunishments) {
            punishment.Active = false;
            punishment.Expried = Date.now();
            punishment.Remover = staffId;
            await punishment.save();
            affected++;
        }
    }

    const member = guild.members.cache.get(memberId);
    if (member && member.manageable) {
        const rolesToSet = [];
        const memberRole = ConfigManager.get("Roles.Member");
        if (memberRole && guild.roles.cache.has(memberRole)) {
            rolesToSet.push(memberRole);
        }
        
        const premiumRole = guild.roles.premiumSubscriberRole?.id;
        if (premiumRole && member.roles.cache.has(premiumRole)) {
            rolesToSet.push(premiumRole);
        }

        await member.roles.set(rolesToSet).catch(() => {});
    }

    return affected;
}

async function sendLog(guild, staff, actionType, details) {
    const logChannel = guild.channels.cache.find(c => c.name === "af-log");
    if (!logChannel) return;

    const emojis = ConfigManager.get("Emojis") || {};
    const infoEmoji = emojis.toji_info || "";

    const v2Components = [
        {
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: staff.displayAvatarURL({ extension: 'png' }) }
                    },
                    components: [
                        {
                            type: 10,
                            content: `## ${infoEmoji} Af Sistemi Log\n**Yetkili:** <@${staff.id}>\n**İşlem Türü:** ${actionType}`
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: details
                }
            ]
        }
    ];

    await logChannel.send({ components: v2Components, flags: [1 << 15] }).catch(() => {});
}

module.exports = async (interaction) => {
    if (!ConfigManager.isOwner(interaction.member)) {
        if (interaction.customId && interaction.customId.startsWith("af_")) {
            return interaction.reply({ content: "Bu işlemi yapmaya yetkiniz yok.", ephemeral: true });
        }
        return;
    }

    const emojis = ConfigManager.get("Emojis") || {};
    const onayEmoji = emojis.toji_onay || "";
    const iptalEmoji = emojis.toji_iptal || "";

    if (interaction.isUserSelectMenu() && interaction.customId === "af_user_select") {
        await interaction.deferReply({ ephemeral: true });
        const userIds = interaction.values;
        let totalPardoned = 0;
        let pardonedUsers = [];

        for (const userId of userIds) {
            const count = await pardonUser(userId, interaction.guild, interaction.user.id);
            if (count > 0) {
                totalPardoned++;
                pardonedUsers.push(`<@${userId}>`);
            }
        }

        if (totalPardoned > 0) {
            await interaction.editReply(`${onayEmoji} Başarıyla ${totalPardoned} kullanıcının cezası affedildi.`);
            await sendLog(interaction.guild, interaction.user, "Kişisel Af (Seçili Kullanıcılar)", `**Affedilen Kullanıcılar:**\n${pardonedUsers.join(", ")}`);
        } else {
            await interaction.editReply(`${iptalEmoji} Seçilen kullanıcıların aktif bir Jail veya Underworld cezası bulunamadı.`);
        }
        return;
    }

    if (interaction.isButton() && interaction.customId === "af_no_data") {
        await interaction.deferReply({ ephemeral: true });

        const jailRole = ConfigManager.get("Roles.Jailed");
        const underworldRole = ConfigManager.get("Roles.Underworld");
        const memberRole = ConfigManager.get("Roles.Member");

        if (!jailRole && !underworldRole) {
            return interaction.editReply(`${iptalEmoji} Config ayarlarında Jail veya Underworld rolleri eksik.`);
        }

        await interaction.guild.members.fetch();

        const suspiciousMembers = interaction.guild.members.cache.filter(m => 
            (jailRole && m.roles.cache.has(jailRole)) || 
            (underworldRole && m.roles.cache.has(underworldRole))
        );

        if (suspiciousMembers.size === 0) {
            return interaction.editReply(`${onayEmoji} Sunucuda Jail veya Underworld rolüne sahip kimse yok.`);
        }

        const activePunishments = await Punitives.find({
            Active: true,
            Type: { $in: ["Cezalandırılma", "Underworld"] },
            Hidden: { $ne: true }
        });

        const punishedIds = new Set(activePunishments.map(p => p.Member));
        const membersToFix = [];

        for (const [id, member] of suspiciousMembers) {
            if (!punishedIds.has(id)) {
                membersToFix.push(member);
            }
        }

        if (membersToFix.length === 0) {
            return interaction.editReply(`${onayEmoji} Veritabanında cezası olmadan Jail/Underworld rolüne sahip kimse bulunamadı.`);
        }

        let successCount = 0;
        for (const member of membersToFix) {
            if (member.manageable) {
                const rolesToSet = [];
                if (memberRole && interaction.guild.roles.cache.has(memberRole)) {
                    rolesToSet.push(memberRole);
                }
                const premiumRole = interaction.guild.roles.premiumSubscriberRole?.id;
                if (premiumRole && member.roles.cache.has(premiumRole)) {
                    rolesToSet.push(premiumRole);
                }

                await member.roles.set(rolesToSet).catch(() => {});
                successCount++;
            }
        }

        await interaction.editReply(`${onayEmoji} İşlem tamamlandı. Veritabanında kaydı olmayan toplam **${successCount}** üyenin rolleri temizlendi.`);
        await sendLog(interaction.guild, interaction.user, "Bugda Kalanları Kurtarma", `**Kurtarılan Kişi Sayısı:** ${successCount}`);
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "af_bulk_select") {
        const option = interaction.values[0];

        if (option === "all_perm") {
            await interaction.deferReply({ ephemeral: true });
            const query = { Active: true, Type: { $in: ["Cezalandırılma", "Underworld"] }, Duration: { $exists: false }, Hidden: { $ne: true } };
            const punishments = await Punitives.find(query);
            
            if (punishments.length === 0) {
                return interaction.editReply(`${iptalEmoji} Kalıcı/süresiz cezası olan kimse bulunamadı.`);
            }

            const uniqueMembers = [...new Set(punishments.map(p => p.Member))];
            let successCount = 0;

            for (const memberId of uniqueMembers) {
                const count = await pardonUser(memberId, interaction.guild, interaction.user.id);
                if (count > 0) successCount++;
            }

            await interaction.editReply(`${onayEmoji} İşlem tamamlandı. Toplam **${successCount}** kişinin kalıcı cezası affedildi.`);
            await sendLog(interaction.guild, interaction.user, "Gelişmiş Toplu Af (Kalıcılar)", `**Affedilen Kişi Sayısı:** ${successCount}`);
            return;
        }

        await interaction.showModal({
            title: "Af İçin Süre Sınırı",
            custom_id: `af_bulk_modal_${option}`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: "time_input",
                            label: "Sınır Süreyi Girin",
                            style: 1,
                            placeholder: "Örn: 1h, 1d, 30m vb.",
                            required: true
                        }
                    ]
                }
            ]
        });
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("af_bulk_modal_")) {
        await interaction.deferReply({ ephemeral: true });
        
        const option = interaction.customId.replace("af_bulk_modal_", "");
        const timeVal = interaction.fields.getTextInputValue("time_input").toLowerCase();
        
        const msTime = ms(timeVal);
        if (!msTime) {
            return interaction.editReply(`${iptalEmoji} Geçersiz bir süre girdiniz.`);
        }

        let targetTypes = ["Cezalandırılma", "Underworld"];
        if (option.includes("jail")) targetTypes = ["Cezalandırılma"];
        else if (option.includes("underworld")) targetTypes = ["Underworld"];

        let query = { Active: true, Type: { $in: targetTypes }, Hidden: { $ne: true } };
        
        if (option.includes("_less")) {
            query.Duration = { $lte: Date.now() + msTime };
        } else if (option.includes("_more")) {
            query.Duration = { $gte: Date.now() + msTime };
        }

        const punishments = await Punitives.find(query);
        
        if (punishments.length === 0) {
            return interaction.editReply(`${iptalEmoji} Kriterlere uygun aktif bir ceza bulunamadı.`);
        }

        const uniqueMembers = [...new Set(punishments.map(p => p.Member))];
        let successCount = 0;

        for (const memberId of uniqueMembers) {
            const count = await pardonUser(memberId, interaction.guild, interaction.user.id);
            if (count > 0) successCount++;
        }

        await interaction.editReply(`${onayEmoji} İşlem tamamlandı. Belirtilen kriterdeki toplam **${successCount}** kişinin cezası affedildi.`);
        await sendLog(interaction.guild, interaction.user, "Gelişmiş Toplu Af", `**Filtre:** ${option}\n**Süre Sınırı:** ${timeVal}\n**Affedilen Kişi Sayısı:** ${successCount}`);
        return;
    }

    if (interaction.isButton() && interaction.customId === "af_mass_pardon") {
        await interaction.showModal({
            title: "TÜM CEZALARI KALDIR",
            custom_id: "af_mass_modal",
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: "confirm_input",
                            label: "Onaylıyor musunuz?",
                            style: 1,
                            placeholder: "ONAY yazınız",
                            required: true
                        }
                    ]
                }
            ]
        });
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "af_mass_modal") {
        await interaction.deferReply({ ephemeral: true });
        const confirmStr = interaction.fields.getTextInputValue("confirm_input");
        
        if (confirmStr !== "ONAY") {
            return interaction.editReply(`${iptalEmoji} İşlem iptal edildi. Onay kelimesi yanlış.`);
        }

        const punishments = await Punitives.find({
            Active: true,
            Type: { $in: ["Cezalandırılma", "Underworld"] },
            Hidden: { $ne: true }
        });

        if (punishments.length === 0) {
            return interaction.editReply(`${iptalEmoji} Sunucuda aktif ceza bulunamadı.`);
        }

        const uniqueMembers = [...new Set(punishments.map(p => p.Member))];
        let successCount = 0;

        for (const memberId of uniqueMembers) {
            const count = await pardonUser(memberId, interaction.guild, interaction.user.id);
            if (count > 0) successCount++;
        }

        await interaction.editReply(`${onayEmoji} **GENEL AF!** Toplam **${successCount}** kişinin cezası affedildi.`);
        await sendLog(interaction.guild, interaction.user, "GENEL AF (Tüm Cezalar)", `**Affedilen Kişi Sayısı:** ${successCount}`);
        return;
    }
};
