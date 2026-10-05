const { MessageFlags, parseEmoji } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
moment.locale("tr");

const StatHistory = require("../../Core/Database/StatHistory");
const StaffUser = require("../../Core/Database/StaffUser");
const Economy = require("../../Core/Database/Economy");
const LevelUtils = require("../Stats/LevelUtils");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class LeaderboardService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const guild = context.guild;

        if (isInteraction) {
            await context.deferReply().catch(() => {});
        }

        const toji_info = ConfigManager.get("Emojis.toji_info") || "📊";

        let state = {
            timeframe: "all",
            category: "topVoice",
            roleID: null,
            customDuration: null,
            customDate: null,
            customDays: 0,
            page: 0
        };

        const pageSize = 15;

        const buildLayout = async () => {
            const oneWeekAgo = moment().startOf('isoWeek').format("YYYY-MM-DD");
            const baseQuery = { guildID: guild.id };

            let filteredMemberIDs = null;
            if (state.roleID) {
                const role = guild.roles.cache.get(state.roleID);
                if (role) {
                    filteredMemberIDs = role.members.map(m => m.id);
                }
            }

            let displayTitle = "";
            let timeFilter = null;
            if (state.timeframe === "weekly") timeFilter = oneWeekAgo;
            if (state.timeframe === "custom") timeFilter = state.customDate;

            const formatRank = (index, memberID, value) => {
                let prefix = "";
                if (index === 0) prefix = "#";
                else if (index === 1) prefix = "##";
                else if (index === 2) prefix = "###";
                else prefix = "-#";

                const isUser = memberID === author.id ? " **(Siz)**" : "";
                return `${prefix} ${index + 1}. <@${memberID}> » \`${value}\`${isUser}`;
            };

            const getAggregatedData = async (type, filter) => {
                const query = { ...baseQuery };
                if (filteredMemberIDs) query.userID = { $in: filteredMemberIDs };
                if (filter) query.date = { $gte: filter };

                const channelsConfig = ConfigManager.get("Channels");
                const publicVoices = Array.isArray(channelsConfig?.PublicVoices) ? channelsConfig.PublicVoices : [];
                const chatChannel = channelsConfig?.Chat;

                if (type === "message.total" && chatChannel) {
                    return await StatHistory.aggregate([
                        { $match: query },
                        { $project: { userID: 1, count: { $ifNull: [`$message.channels.${chatChannel}`, 0] } } },
                        { $group: { _id: "$userID", total: { $sum: "$count" } } },
                        { $sort: { total: -1 } }
                    ]);
                }

                if (type === "voice.total" && publicVoices.length > 0) {
                    const uniquePublicVoices = [...new Set(publicVoices.map(v => String(v)))];
                    const voiceFields = uniquePublicVoices.map(id => ({ $ifNull: [`$voice.channels.${id}`, 0] }));
                    return await StatHistory.aggregate([
                        { $match: query },
                        { $project: { userID: 1, count: { $add: voiceFields.length > 0 ? voiceFields : [0] } } },
                        { $group: { _id: "$userID", total: { $sum: "$count" } } },
                        { $sort: { total: -1 } }
                    ]);
                }

                if (type === "streamer.total" && publicVoices.length > 0) {
                    const uniquePublicVoices = [...new Set(publicVoices.map(v => String(v)))];
                    const streamFields = uniquePublicVoices.map(id => ({ $ifNull: [`$streamer.channels.${id}`, 0] }));
                    return await StatHistory.aggregate([
                        { $match: query },
                        { $project: { userID: 1, count: { $add: streamFields.length > 0 ? streamFields : [0] } } },
                        { $group: { _id: "$userID", total: { $sum: "$count" } } },
                        { $sort: { total: -1 } }
                    ]);
                }

                if (type === "staffRating.total") {
                    const ratingQuery = { ...baseQuery };
                    if (filteredMemberIDs) ratingQuery.staffID = { $in: filteredMemberIDs };
                    if (filter) ratingQuery.date = { $gte: new Date(filter) };

                    const StaffRating = require("../../Commands/Prefix/Staff/StaffRating");
                    return await StaffRating.aggregate([
                        { $match: ratingQuery },
                        { $group: { _id: "$staffID", total: { $avg: "$rating" }, count: { $sum: 1 } } },
                        { $match: { count: { $gte: 1 } } }, 
                        { $sort: { total: -1 } }
                    ]);
                }

                let result = await StatHistory.aggregate([
                    { $match: query },
                    { $group: { _id: "$userID", total: { $sum: `$${type}` } } },
                    { $sort: { total: -1 } }
                ]);

                // LIVE VERİ ÇEKME - Anlık Seste / Yayında olanları ekleme
                if (type === "voice.total" || type === "streamer.total") {
                    const liveModel = type === "voice.total" ? require("../../Core/Database/Voice.JoinedAt") : require("../../Core/Database/StreamJoinedAt");
                    const liveSessions = await liveModel.find({});
                    const now = Date.now();

                    for (const session of liveSessions) {
                        const mem = guild.members.cache.get(session.userID);
                        if (mem && mem.voice.channelId) {
                            if (type === "streamer.total" && !mem.voice.streaming && !mem.voice.selfVideo) continue;
                            
                            const diff = Math.max(0, now - session.date);
                            const existing = result.find(x => x._id === session.userID);
                            if (existing) {
                                existing.total += diff;
                            } else {
                                if (!filteredMemberIDs || filteredMemberIDs.includes(session.userID)) {
                                    result.push({ _id: session.userID, total: diff });
                                }
                            }
                        }
                    }
                    result.sort((a, b) => b.total - a.total);
                }

                return result;
            };

            let fullData = [];
            let valueMapper = null;

            switch (state.category) {
                case "topVoice":
                    fullData = await getAggregatedData("voice.total", timeFilter);
                    valueMapper = (t) => moment.duration(t).format("H [saat], m [dk]");
                    displayTitle = "Ses Sıralaması";
                    break;
                case "topMessage":
                    fullData = await getAggregatedData("message.total", timeFilter);
                    valueMapper = (t) => `${t.toLocaleString()} mesaj`;
                    displayTitle = "Mesaj Sıralaması";
                    break;
                case "topStream":
                    fullData = await getAggregatedData("streamer.total", timeFilter);
                    valueMapper = (t) => moment.duration(t).format("H [saat], m [dk]");
                    displayTitle = "Yayın Sıralaması";
                    break;
                case "staffXP":
                    const sXPQuery = { ...baseQuery };
                    if (filteredMemberIDs) sXPQuery.userID = { $in: filteredMemberIDs };
                    const sortKey = state.timeframe === "weekly" ? "weeklyXP" : "totalXP";
                    const sXP = await StaffUser.find(sXPQuery).sort({ [sortKey]: -1 }).lean();
                    fullData = sXP.map(u => ({ _id: u.userID, total: u[sortKey] }));
                    valueMapper = (t) => `${t.toFixed(1)} XP`;
                    displayTitle = "Yetkili XP Sıralaması";
                    break;
                case "staffTasks":
                    fullData = await getAggregatedData("task", timeFilter);
                    valueMapper = (t) => `${t} görev`;
                    displayTitle = "Görev Sıralaması";
                    break;
                case "topInvite":
                    fullData = await getAggregatedData("invite", timeFilter);
                    valueMapper = (t) => `${t} davet`;
                    displayTitle = "Davet Sıralaması";
                    break;
                case "topPartner":
                    fullData = await getAggregatedData("partner", timeFilter);
                    valueMapper = (t) => `${t} partner`;
                    displayTitle = "Partner Sıralaması";
                    break;
                case "topRespect":
                    fullData = await getAggregatedData("respect", timeFilter);
                    valueMapper = (t) => `${t} saygınlık`;
                    displayTitle = "Saygınlık Sıralaması";
                    break;
                case "topStaff":
                    fullData = await getAggregatedData("punishment", timeFilter);
                    valueMapper = (t) => `${t} işlem`;
                    displayTitle = "Yetkili İşlem Sıralaması";
                    break;
                case "staffRating":
                    fullData = await getAggregatedData("staffRating.total", timeFilter);
                    valueMapper = (t) => `${t.toFixed(2)} ${ConfigManager.get("Emojis.toji_star") || "✨"}`;
                    displayTitle = "Yetkili Puan Sıralaması";
                    break;
                case "topCoin":
                    const coinData = await Economy.find({ guildID: guild.id }).sort({ coin: -1 }).lean();
                    fullData = coinData.map(u => ({ _id: u.userID, total: u.coin }));
                    valueMapper = (t) => `${t.toLocaleString()} coin`;
                    displayTitle = "Coin Sıralaması";
                    break;
                case "topVampire":
                    const VampireProfile = require("../../Core/Database/VampireProfile");
                    const vpData = await VampireProfile.find({}).sort({ elo: -1 }).lean();
                    fullData = vpData.map(u => ({ _id: u.id, total: u.elo }));
                    valueMapper = (t) => `${t.toLocaleString()} Elo`;
                    displayTitle = "Vampir Köylü Elo Sıralaması";
                    break;
                case "topMonopoly":
                    const MonopolyProfile = require("../../Core/Database/MonopolyProfile");
                    const mpData = await MonopolyProfile.find({}).sort({ wins: -1, totalMoneyEarned: -1 }).lean();
                    fullData = mpData.map(u => ({ _id: u.userID, total: u.wins }));
                    valueMapper = (t) => `${t} Zafer`;
                    displayTitle = "Monopoly Zafer Sıralaması";
                    break;
            }

            const filteredAndMappedData = fullData
                .filter(x => x.total > 0 && guild.members.cache.has(x._id) && !guild.members.cache.get(x._id).user.bot)
                .map((x, i) => ({ ...x, rank: i }));

            const totalItems = filteredAndMappedData.length;
            const totalPages = Math.ceil(totalItems / pageSize) || 1;
            if (state.page >= totalPages) state.page = Math.max(0, totalPages - 1);

            const start = state.page * pageSize;
            const end = start + pageSize;
            const currentPageData = filteredAndMappedData.slice(start, end);

            const list = currentPageData.map(x => formatRank(x.rank, x._id, valueMapper(x.total)));

            const getAuthorRankData = async (fullList) => {
                const rank = fullList.findIndex(x => x._id === author.id);
                if (rank === -1 || fullList[rank].total <= 0) return null;
                return { rank: rank, total: fullList[rank].total };
            };

            const authorData = await getAuthorRankData(filteredAndMappedData);
            const isAuthorInCurrentPage = currentPageData.some(x => x._id === author.id);

            const subTitle = state.timeframe === "all" ? "Genel" : state.timeframe === "weekly" ? "Haftalık" : (state.customDuration ? state.customDuration.toUpperCase() : "Özel");

            const containerItems = [
                {
                    type: 9,
                    components: [
                        { type: 10, content: `# ${guild.name} Sıralamaları\n${state.roleID ? `> **Aktif Filtre:** <@&${state.roleID}> rolü verileri gösteriliyor.` : `> Sunucu genelindeki tüm veriler listeleniyor.`}` }
                    ],
                    accessory: { type: 11, media: { url: guild.iconURL({ dynamic: true }) } }
                },
                { type: 14 },
                { type: 1, components: [{ type: 6, custom_id: "role_select", placeholder: "Sıralamayı Rol İle Filtrele", min_values: 0, max_values: 1 }] },
                {
                    type: 1,
                    components: [{
                        type: 3,
                        custom_id: "cat_select",
                        placeholder: "Bir Kategori Seçiniz",
                        options: [
                            { label: 'Ses Sıralaması', value: 'topVoice' },
                            { label: 'Mesaj Sıralaması', value: 'topMessage' },
                            { label: 'Yayın Sıralaması', value: 'topStream' },
                            { label: 'Yetkili XP Sıralaması', value: 'staffXP' },
                            { label: 'Görev Sıralaması', value: 'staffTasks' },
                            { label: 'Invite Sıralaması', value: 'topInvite' },
                            { label: 'Partner Sıralaması', value: 'topPartner' },
                            { label: 'Saygınlık Sıralaması', value: 'topRespect' },
                            { label: 'Yetkili İşlem Sıralaması', value: 'topStaff' },
                            { label: 'Yetkili Puan Sıralaması', value: 'staffRating' },
                            { label: 'Coin Sıralaması', value: 'topCoin' },
                            { label: 'Vampir Köylü Sıralaması', value: 'topVampire' },
                            { label: 'Monopoly Zafer Sıralaması', value: 'topMonopoly' }
                        ].map(opt => ({ ...opt, default: opt.value === state.category }))
                    }]
                },
                {
                    type: 1,
                    components: [
                        { type: 2, style: state.timeframe === "all" ? 3 : 2, label: "Genel", custom_id: "tf_all" },
                        { type: 2, style: state.timeframe === "weekly" ? 3 : 2, label: "Haftalık", custom_id: "tf_weekly" },
                        { type: 2, style: state.timeframe === "custom" ? 3 : 2, label: state.customDuration ? state.customDuration.toUpperCase() : "Özel Süre", custom_id: "tf_prompt_custom" }
                    ]
                },
                { type: 14 },
                { type: 10, content: `### ${toji_info} ${displayTitle} (${subTitle})` }
            ];

            if (list.length > 0) {
                containerItems.push({ type: 10, content: list.join("\n") });

                if (authorData && !isAuthorInCurrentPage) {
                    containerItems.push({ type: 10, content: formatRank(authorData.rank, author.id, valueMapper(authorData.total)) });
                }

                containerItems.push({ type: 14 });
                containerItems.push({ type: 10, content: `> Toplam **${totalItems}** kayıt arasından **${start + 1}-${Math.min(end, totalItems)}** arası gösteriliyor.\n> Sayfa: \` ${state.page + 1} / ${totalPages} \`` });
            } else {
                containerItems.push({ type: 10, content: `> Bu kategori ve zaman diliminde henüz veri girişi bulunmuyor.` });
            }

            if (totalPages > 1) {
                const prevEmojiRaw = ConfigManager.get("Emojis.toji_leftarrow") || "⬅️";
                const nextEmojiRaw = ConfigManager.get("Emojis.toji_rightarrow") || "➡️";
                
                const prevEmojiObj = prevEmojiRaw.startsWith("<") ? parseEmoji(prevEmojiRaw) : { name: prevEmojiRaw };
                const nextEmojiObj = nextEmojiRaw.startsWith("<") ? parseEmoji(nextEmojiRaw) : { name: nextEmojiRaw };

                containerItems.push({
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            emoji: prevEmojiObj,
                            custom_id: "prev_page",
                            disabled: state.page === 0
                        },
                        {
                            type: 2,
                            style: 2,
                            emoji: nextEmojiObj,
                            custom_id: "next_page",
                            disabled: state.page >= totalPages - 1
                        }
                    ]
                });
            }

            return {
                main: [{
                    type: 17, 
                    components: containerItems
                }],
                buttons: []
            };
        };

        const initialBuild = await buildLayout();
        
        let msg;
        if (isInteraction) {
            msg = await context.editReply({
                flags: [MessageFlags.IsComponentsV2],
                components: [...initialBuild.main, ...initialBuild.buttons],
                allowedMentions: { parse: [] }
            });
        } else {
            msg = await context.reply({
                flags: [MessageFlags.IsComponentsV2],
                components: [...initialBuild.main, ...initialBuild.buttons],
                allowedMentions: { parse: [] }
            });
        }

        const filter = (i) => i.user.id === author.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 600000 });

        collector.on("collect", async (i) => {
            if (i.customId !== "tf_prompt_custom") await i.deferUpdate().catch(() => { });

            if (i.isButton()) {
                if (i.customId === "tf_all") {
                    state.timeframe = "all";
                    state.page = 0;
                } else if (i.customId === "tf_weekly") {
                    state.timeframe = "weekly";
                    state.page = 0;
                } else if (i.customId === "prev_page") {
                    state.page--;
                } else if (i.customId === "next_page") {
                    state.page++;
                } else if (i.customId === "tf_prompt_custom") {
                    await i.showModal({
                        title: "Özel Zaman Dilimi",
                        custom_id: "modal_duration",
                        components: [{
                            type: 1,
                            components: [{
                                type: 4,
                                custom_id: "duration_input",
                                label: "Süre (Örn: 3d, 1w, 2m)",
                                style: 1,
                                placeholder: "3d",
                                min_length: 2,
                                max_length: 5,
                                required: true
                            }]
                        }]
                    });

                    const modalInteraction = await i.awaitModalSubmit({
                        filter: (mod) => mod.customId === "modal_duration" && mod.user.id === author.id,
                        time: 60000
                    }).catch(() => null);

                    if (modalInteraction) {
                        await modalInteraction.deferUpdate().catch(() => { });
                        const val = modalInteraction.fields.getTextInputValue("duration_input");
                        if (/^\d+[dmwy]$/.test(val)) {
                            const num = parseInt(val);
                            const unit = val.slice(-1);
                            const unitMap = { 'd': 'days', 'w': 'weeks', 'm': 'months', 'y': 'years' };
                            state.customDate = moment().subtract(num, unitMap[unit]).add(1, 'day').format("YYYY-MM-DD");
                            state.customDuration = val;
                            state.timeframe = "custom";
                            state.customDays = num;
                            state.page = 0;

                            const updatedBuild = await buildLayout();
                            await modalInteraction.editReply({ components: [...updatedBuild.main, ...updatedBuild.buttons], allowedMentions: { parse: [] } }).catch(() => { });
                        } else {
                            await modalInteraction.editReply({ content: "Geçersiz format!", ephemeral: true }).catch(() => { });
                        }
                    }
                    return;
                }
            }
            else if (i.isStringSelectMenu()) {
                state.category = i.values[0];
                state.page = 0;
            } else if (i.isRoleSelectMenu()) {
                state.roleID = i.values[0] || null;
                state.page = 0;
            }

            const updatedBuild = await buildLayout();
            if (isInteraction) {
                await i.editReply({ components: [...updatedBuild.main, ...updatedBuild.buttons], allowedMentions: { parse: [] } }).catch(() => { });
            } else {
                await msg.edit({ components: [...updatedBuild.main, ...updatedBuild.buttons], allowedMentions: { parse: [] } }).catch(() => { });
            }
        });

        collector.on("end", () => {
            if (isInteraction) {
                context.editReply({ components: [] }).catch(() => { });
            } else {
                msg.edit({ components: [] }).catch(() => { });
            }
        });
    }
}

module.exports = LeaderboardService;
