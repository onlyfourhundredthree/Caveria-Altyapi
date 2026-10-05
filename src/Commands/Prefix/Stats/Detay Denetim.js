const {
    EmbedBuilder,
    PermissionsBitField,
    MessageFlags,
    ComponentType,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
moment.locale("tr");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const StatHistory = require("../../../Core/Database/StatHistory");

function formatStat(val) {
    return Number(val || 0).toLocaleString("tr-TR");
}

function formatVoice(val) {
    return moment.duration(val || 0).format("H [s], m [d]");
}

module.exports = {
    conf: {
        usages: ["detay-denetim", "rolstat", "detay-denetim-sistemi", "detay-denetim-rol"],
        description: "Belirtilen rolün üyelerinin detaylı istatistiklerini gösterir.",
        category: "Stats",
        usage: ".detay-denetim <@rol|rol_id>"
    },


    run: async (client, message, args) => {
        const statsStaffs = ConfigManager.get("Roles.StatsStaffs") || [];
        if (
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !statsStaffs.some(role => message.member.roles.cache.has(role)) &&
            !ConfigManager.isOwner(message.member)
        ) return;

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return message.reply("Bir rol belirtmelisiniz!");

        const emojis = ConfigManager.get("Emojis") || {};
        const { toji_user, toji_voice, toji_sign, toji_nokta, toji_sparkly, toji_bluestar } = emojis;
        const guildIcon = message.guild.iconURL({ dynamic: true, size: 512 });

        const members = role.members;
        if (members.size === 0) return message.reply("Bu rolde hiç üye bulunmuyor.");

        const initialComponents = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: guildIcon } },
                        components: [{
                            type: 10,
                            content: `> ## ${toji_sparkly || ""} ${role.name} Detaylı Kontrol Paneli\n> ${toji_user || "•"} **Üye Sayısı:** \`${members.size}\` üyeye ait gelişmiş istatistikler listelenmeye hazır.\n> -# Lütfen aşağıdan görmek istediğiniz detaylı filtreyi seçin.`
                        }]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: `detay_denetim_filter_prefix_${role.id}`,
                                placeholder: "Filtreleme kriteri seçin",
                                options: [
                                    { label: "Genel Özet", value: "general", description: "Ses ve metin kanallarındaki verileri kullanıcı bazlı olarak saniye saniye denetler." },
                                    { label: "Sadece Public Kanalları", value: "public", description: "Sadece belirlenmiş public ses odalarındaki süreler." },
                                    { label: "Sadece Chat Kanalı", value: "chat", description: "Ana sohbet kanalındaki mesaj sayısı ve performansı." },
                                    { label: "Yayın & Kamera", value: "stream", description: "Üyelerin yayın açma ve kamera kullanma süreleri." }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        const mainMsg = await message.channel.send({
            flags: [MessageFlags.IsComponentsV2],
            components: initialComponents
        });

        const collector = mainMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 120000
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "Bu işlemi sadece komutu kullanan kişi gerçekleştirebilir.", ephemeral: true });
            }

            await i.deferReply({ ephemeral: true });

            const filter = i.values[0];
            const oneWeekAgo = moment().subtract(1, "weeks").format("YYYY-MM-DD");
            const generalChatID = ConfigManager.get("Channels.Chat");
            const PubChannels = ConfigManager.get("Channels.PublicVoices") || [];

            const memberList = Array.from(members.values()).slice(0, 15);
            const results = [];

            results.push({
                type: 17,
                components: [{
                    type: 10,
                    content: `## ${toji_sparkly || ""} Filtre: ${filter.toUpperCase()}`
                }]
            });

            for (const member of memberList) {
                const userID = member.id;
                const sStats = await StatHistory.aggregate([
                    { $match: { userID, guildID: message.guild.id } },
                    {
                        $group: {
                            _id: "$userID",
                            msgTotal: { $sum: "$message.total" },
                            voiceTotal: { $sum: "$voice.total" },
                            partnerTotal: { $sum: "$partner" },
                            msgWeekly: { $sum: { $cond: [{ $gte: ["$date", oneWeekAgo] }, "$message.total", 0] } },
                            voiceWeekly: { $sum: { $cond: [{ $gte: ["$date", oneWeekAgo] }, "$voice.total", 0] } },
                            streamTotal: { $sum: "$streamer.total" },
                            voiceChannels: { $push: "$voice.channels" },
                            msgChannels: { $push: "$message.channels" }
                        }
                    }
                ]);

                const stats = sStats[0] || {
                    msgTotal: 0, voiceTotal: 0, partnerTotal: 0, streamTotal: 0,
                    msgWeekly: 0, voiceWeekly: 0, voiceChannels: [], msgChannels: []
                };

                let content = "";
                if (filter === "general") {
                    content = `> ${toji_bluestar || "•"} **Haftalık Mesaj:** \`${formatStat(stats.msgWeekly)}\`\n` +
                        `> ${toji_voice || "•"} **Haftalık Ses:** \`${formatVoice(stats.voiceWeekly)}\`\n` +
                        `> ${toji_sign || "•"} **Toplam Partner:** \`${formatStat(stats.partnerTotal)}\``;
                } else if (filter === "public") {
                    let pubTime = 0;
                    stats.voiceChannels.forEach(chanMap => {
                        if (!chanMap) return;
                        Object.entries(chanMap).forEach(([id, time]) => {
                            if (PubChannels.includes(id)) pubTime += time;
                        });
                    });
                    content = `> ${toji_voice || "•"} **Public Süresi:** \`${formatVoice(pubTime)}\`\n` +
                        `> ${toji_sign || "•"} **Haftalık/Toplam:** \`${formatVoice(stats.voiceWeekly)} / ${formatVoice(stats.voiceTotal)}\``;
                } else if (filter === "chat") {
                    let chatCount = 0;
                    stats.msgChannels.forEach(chanMap => {
                        if (!chanMap || !generalChatID) return;
                        if (chanMap[generalChatID]) chatCount += chanMap[generalChatID];
                    });
                    content = `> ${toji_bluestar || "•"} **Sohbet Kanalı Mesajı:** \`${formatStat(chatCount)}\`\n` +
                        `> ${toji_user || "•"} **Kanal:** <#${generalChatID || message.channelId}>`;
                } else if (filter === "stream") {
                    content = `> ${toji_voice || "•"} **Yayın & Kamera:** \`${formatVoice(stats.streamTotal)}\`\n` +
                        `> -# Bu veri kamera ve yayın açma sürelerinin toplamıdır.`;
                }

                results.push({
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: { type: 11, media: { url: member.user.displayAvatarURL({ dynamic: true }) } },
                            components: [{ type: 10, content: `### ${member.user.tag}\n${content}` }]
                        }
                    ]
                });
            }

            if (results.length <= 1) {
                return i.editReply({ content: "Bu filtre için gösterilecek veri bulunamadı." });
            }

            const chunks = [];
            for (let k = 0; k < results.length; k += 10) {
                chunks.push(results.slice(k, k + 10));
            }

            for (let k = 0; k < chunks.length; k++) {
                if (k === 0) {
                    await i.editReply({
                        flags: [MessageFlags.IsComponentsV2],
                        components: chunks[k]
                    });
                } else {
                    await i.followUp({
                        flags: [MessageFlags.IsComponentsV2],
                        components: chunks[k],
                        ephemeral: true
                    });
                }
            }
        });

        collector.on("end", () => {
            mainMsg.edit({ components: [] }).catch(() => { });
        });
    },
};
