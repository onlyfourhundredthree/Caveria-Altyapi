const { AttachmentBuilder } = require("discord.js");
const RankCard = require("../../Utils/RankCard");
const LevelUtils = require("./LevelUtils");
const StatHistory = require("../../Core/Database/StatHistory");
const UserBanners = require("../../Core/Database/UserBanners");

class StatService {
    static async handleRank(ctx, targetMember) {
        let loadingMsg;
        const isSlash = ctx.commandName ? true : false;
        
        if (isSlash) {
            await ctx.deferReply();
            loadingMsg = ctx;
        } else {
            loadingMsg = await ctx.reply({ content: "Seviye kartın hazırlanıyor..." });
        }

        try {
            const stats = await StatHistory.aggregate([
                { $match: { guildID: ctx.guild.id, userID: targetMember.id } },
                { $group: { _id: "$userID", msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
            ]);

            const msgXP = stats[0] ? stats[0].msgTotal : 0;
            const voiceXP = stats[0] ? stats[0].voiceTotal : 0;

            const msgLevel = LevelUtils.calculateMessageLevel(msgXP);
            const voiceLevel = LevelUtils.calculateVoiceLevel(voiceXP);

            const nextMsgExp = LevelUtils.getMessageXP(msgLevel + 1);
            const nextVoiceExp = LevelUtils.getVoiceXP(voiceLevel + 1);
            const currentVoiceMinutes = Math.floor(voiceXP / 60000);

            const getRank = async (type, score) => {
                if (score <= 0) return 0;
                const pipeline = [
                    { $match: { guildID: ctx.guild.id } },
                    { $group: { _id: "$userID", total: { $sum: `$${type}.total` } } },
                    { $match: { total: { $gt: score } } },
                    { $count: "rank" }
                ];
                const res = await StatHistory.aggregate(pipeline);
                return (res[0]?.rank || 0) + 1;
            };

            const [msgRank, voiceRank] = await Promise.all([
                getRank("message", msgXP),
                getRank("voice", voiceXP)
            ]);

            const findRoleColor = (member) => {
                const coloredRole = member.roles.cache.filter(role => role.color !== 0).sort((a, b) => b.position - a.position).first();
                return coloredRole ? coloredRole.hexColor : "#005e8aff";
            };

            const finalColor = findRoleColor(targetMember);
            
            // .lean() performansı
            const bannerData = await UserBanners.findOne({ guildID: ctx.guild.id, userID: targetMember.id }).lean();
            const customBanner = bannerData ? bannerData.background : "https://i.pinimg.com/736x/26/b8/54/26b854e5484488f16b8d5b4fff8b3d9a.jpg";

            const rank = new RankCard()
                .setAvatar(targetMember.user.displayAvatarURL({ extension: 'png', forceStatic: true, size: 256 }))
                .setUsername(targetMember.user.username)
                .setRoleName(targetMember.roles.highest.name)
                .setStatus(targetMember.presence?.status || "offline")
                .setBorder(finalColor)
                .setChatData(msgLevel, msgXP, nextMsgExp, msgRank || 0, finalColor)
                .setVoiceData(voiceLevel, currentVoiceMinutes, nextVoiceExp, voiceRank || 0, finalColor)
                .setBackground("image", customBanner)
                .setOverlayOpacity(0.8);

            const buffer = await rank.build();
            const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });

            if (isSlash) {
                await ctx.editReply({ files: [attachment] });
            } else {
                await loadingMsg.edit({ content: null, files: [attachment] });
            }
        } catch (error) {
            console.error(error);
            const errTxt = (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Hata oluştu.";
            if (isSlash) await ctx.editReply({ content: errTxt });
            else await loadingMsg.edit({ content: errTxt });
        }
    }

    /**
     * @param {Object} ctx - Interaction or Message context
     * @param {Object} member - The target guild member
     */
    static async handleInvite(ctx, member) {
        const guild = ctx.guild;
        const user = member.user;

        const iData = await StatHistory.aggregate([
            { $match: { userID: member.id, guildID: guild.id } },
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

        // Components V2 Yapısı
        const v2Payload = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: {
                            type: 11,
                            media: { url: user.displayAvatarURL({ dynamic: true, extension: 'png' }) }
                        },
                        components: [
                            {
                                type: 10,
                                content: `> ## ✉️ Davet İstatistikleri\n> -# ${user} kullanıcısının güncel davet verileri.`
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> **Toplam Davet:** \`${total}\`\n> **Normal Davet:** \`${st.invite}\`\n> **Bonus Davet:** \`${st.bonus}\`\n> **Sahte / Fake:** \`${st.fake}\`\n> **Ayrılan:** \`${st.leave}\``
                    }
                ]
            }
        ];

        const isSlash = ctx.commandName ? true : false;
        const compV2Flag = 1 << 15;

        const payload = {
            components: v2Payload
        };

        payload.flags = [compV2Flag];

        if (isSlash) {
            if (ctx.deferred) return await ctx.editReply(payload);
            return await ctx.reply(payload);
        } else {
            return await ctx.reply(payload);
        }
    }

    /**
     * @param {Object} ctx - Interaction or Message context
     * @param {Object} member - Optional, target member. If null, fetch server stats.
     */
    static async handleGraphs(ctx, member) {
        const moment = require("moment");
        const StatHistory = require("../../Core/Database/StatHistory");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
        
        let title = "";
        let finalCounts = [];
        const days = [];
        const dateLabels = [];

        for (let i = 13; i >= 0; i--) {
            const d = moment().subtract(i, 'days');
            days.push(d.format("YYYY-MM-DD"));
            dateLabels.push(d.format("DD/MM"));
        }

        if (!member) {
            const stats = await StatHistory.aggregate([
                { $match: { guildID: ctx.guild.id, date: { $in: days } } },
                { $group: { _id: "$date", count: { $sum: "$invite" } } }
            ]);

            title = `${ctx.guild.name} sunucusunun günlük verileri`;
            finalCounts = days.map(d => stats.find(s => s._id === d)?.count || 0);
        } else {
            const stats = await StatHistory.aggregate([
                { $match: { guildID: ctx.guild.id, userID: member.id, date: { $in: days } } },
                { $group: { _id: "$date", count: { $sum: "$invite" } } }
            ]);

            title = `${member.user.username} kullanıcısının günlük verileri`;
            finalCounts = days.map(d => stats.find(s => s._id === d)?.count || 0);
        }

        const chartConfig = {
            type: 'line',
            data: { 
                labels: dateLabels, 
                datasets: [{ 
                    label: 'Davetler', 
                    data: finalCounts, 
                    borderColor: '#5865F2', 
                    backgroundColor: 'rgba(88, 101, 242, 0.2)', 
                    fill: true, 
                    tension: 0.4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#5865F2',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }] 
            },
            options: { 
                title: { display: false },
                legend: { display: false },
                scales: { 
                    xAxes: [{ 
                        gridLines: { display: false },
                        ticks: { fontColor: '#b9bbbe' }
                    }], 
                    yAxes: [{ 
                        gridLines: { color: '#3f4147', drawBorder: false },
                        ticks: { beginAtZero: true, stepSize: 1, fontColor: '#b9bbbe' }
                    }] 
                } 
            }
        };

        const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
        const chartUrl = `https://quickchart.io/chart?c=${encodedConfig}&width=800&height=400&bkg=transparent`;

        // Components V2 Yapısı
        const v2Payload = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `> ## 📊 İstatistik Grafiği\n> -# **${title}** (Son 14 Gün)\n> Davet verilerinizin son 14 günlük değişimi aşağıda gösterilmiştir.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 12,
                        items: [
                            {
                                media: { url: chartUrl }
                            }
                        ]
                    }
                ]
            }
        ];

        const isSlash = ctx.commandName ? true : false;
        const compV2Flag = 1 << 15;

        const payload = {
            components: v2Payload
        };

        payload.flags = [compV2Flag];

        if (isSlash) {
            if (ctx.deferred) return await ctx.editReply(payload);
            return await ctx.reply(payload);
        } else {
            return await ctx.reply(payload);
        }
    }
}

module.exports = StatService;
