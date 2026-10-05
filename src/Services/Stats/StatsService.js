const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    AttachmentBuilder
} = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StatHistory = require("../../Core/Database/StatHistory");
const LevelUtils = require("./LevelUtils");
const TwitterUser = require("../../Core/Database/TwitterUser");
const Punitives = require("../../Core/Database/Punitives");
const StaffUser = require("../../Core/Database/StaffUser");
const StaffRating = require("../../Core/Database/StaffRating");
const Economy = require("../../Core/Database/Economy");
const { renderStatCanvas } = require('./StatCanvas');
const moment = require("moment-timezone");
require("moment-duration-format");
moment.locale("tr");

class StatsService {
    /**
     * İstatistik panelini oluşturur ve etkileşimi yönetir.
     * @param {Object} client - Discord Client objesi
     * @param {Object} ctx - Message veya Interaction objesi (yanıt vermek için)
     * @param {Object} targetUser - Hedef kullanıcının User objesi
     * @param {Object} member - Hedef kullanıcının GuildMember objesi
     * @param {Object} guild - Sunucu objesi
     * @param {String} authorId - Komutu kullanan kişinin ID'si (Collector filtresi için)
     */
    static async sendStatPanel(client, ctx, targetUser, member, guild, authorId) {
        if (!member) {
            const errorOptions = { content: "Kullanıcı bulunamadı.", flags: [MessageFlags.Ephemeral] };
            return ctx.reply ? await ctx.reply(errorOptions) : await ctx.channel.send(errorOptions);
        }

        let state = {
            timeframe: "weekly", 
            viewCategory: "general",
            userId: targetUser.id
        };

        const getFilter = (tf) => {
            const now = moment().tz("Europe/Istanbul");
            if (tf === "today") return now.format("YYYY-MM-DD");
            if (tf === "weekly") return now.startOf('isoWeek').format("YYYY-MM-DD");
            if (tf === "monthly") return now.subtract(30, 'days').format("YYYY-MM-DD");
            return null; 
        };

        const fetchAllData = async (tf) => {
            const filterDate = getFilter(tf);
            const query = { guildID: guild.id, userID: targetUser.id };
            const matchStage = filterDate ? { $match: { date: tf === "today" ? filterDate : { $gte: filterDate } } } : { $match: {} };

            const pipeline = [
                { $match: query },
                matchStage,
                {
                    $group: {
                        _id: "$userID",
                        msgTotal: { $sum: "$message.total" },
                        voiceTotal: { $sum: "$voice.total" },
                        streamTotal: { $sum: "$streamer.total" },
                        inviteTotal: { $sum: "$invite" },
                        inviteBonus: { $sum: "$inviteBonus" },
                        inviteFake: { $sum: "$inviteFake" },
                        inviteLeave: { $sum: "$inviteLeave" },
                        partnerTotal: { $sum: "$partner" },
                        punishmentTotal: { $sum: "$punishment" },
                        respectTotal: { $sum: "$respect" }
                    }
                }
            ];

            const channelStats = async (type) => {
                return await StatHistory.aggregate([
                    { $match: query },
                    matchStage,
                    { $project: { channels: { $objectToArray: `$${type}.channels` } } },
                    { $unwind: "$channels" },
                    { $group: { _id: "$channels.k", total: { $sum: "$channels.v" } } },
                    { $sort: { total: -1 } },
                    { $limit: 10 }
                ]);
            };

            const getRank = async (type, score) => {
                if (!score || score <= 0) return "N/A";
                const rankMatch = filterDate ? { date: tf === "today" ? filterDate : { $gte: filterDate } } : {};
                const res = await StatHistory.aggregate([
                    { $match: { guildID: guild.id, ...rankMatch } },
                    { $group: { _id: "$userID", total: { $sum: type.includes('.') ? `$${type}` : `$${type}.total` } } },
                    { $match: { total: { $gt: score } } },
                    { $count: "count" }
                ]);
                return (res[0]?.count || 0) + 1;
            };

            const [
                stats,
                topMsgChannels,
                topVoiceChannels,
                staffData,
                economyData,
                penalties,
                ratings,
                tUser,
                vampireProfile,
                staffPunitives
            ] = await Promise.all([
                StatHistory.aggregate(pipeline).then(r => r[0] || {}),
                channelStats("message"),
                channelStats("voice"),
                StaffUser.findOne({ guildID: guild.id, userID: targetUser.id }),
                Economy.findOne({ guildID: guild.id, userID: targetUser.id }),
                Punitives.find({ Member: targetUser.id, Hidden: { $ne: true } }).sort({ Date: -1, No: -1 }).limit(10),
                StaffRating.aggregate([
                    { $match: { guildID: guild.id, staffID: targetUser.id } },
                    { $group: { _id: "$staffID", avg: { $avg: "$rating" }, count: { $sum: 1 } } }
                ]).then(r => r[0] || { avg: 0, count: 0 }),
                TwitterUser.findOne({ guildID: guild.id, userID: targetUser.id }),
                require("../../Core/Database/VampireProfile").findOne({ id: targetUser.id }),
                Punitives.find({ Staff: targetUser.id }).select("Type")
            ]);

            let msgScore = stats.msgTotal || 0;
            let voiceScore = stats.voiceTotal || 0;
            let streamScore = stats.streamTotal || 0;

            // Live Veri Çekme
            if (member && member.voice && member.voice.channelId) {
                const VoiceJoined = require("../../Core/Database/Voice.JoinedAt");
                const StreamJoinedAt = require("../../Core/Database/StreamJoinedAt");
                const now = Date.now();

                const liveVoice = await VoiceJoined.findOne({ userID: targetUser.id });
                if (liveVoice && liveVoice.date) {
                    voiceScore += Math.max(0, now - liveVoice.date);
                }

                if (member.voice.streaming || member.voice.selfVideo) {
                    const liveStream = await StreamJoinedAt.findOne({ userID: targetUser.id });
                    if (liveStream && liveStream.date) {
                        streamScore += Math.max(0, now - liveStream.date);
                    }
                }
            }

            const [msgRank, voiceRank, streamRank] = await Promise.all([
                getRank("message", msgScore),
                getRank("voice", voiceScore),
                getRank("streamer", streamScore)
            ]);

            return {
                vampireProfile,
                stats: {
                    message: msgScore,
                    voice: voiceScore,
                    stream: streamScore,
                    invite: (stats.inviteTotal || 0) + (stats.inviteBonus || 0),
                    inviteReal: stats.inviteTotal || 0,
                    inviteBonus: stats.inviteBonus || 0,
                    inviteFake: stats.inviteFake || 0,
                    inviteLeave: stats.inviteLeave || 0,
                    partner: stats.partnerTotal || 0,
                    punishment: stats.punishmentTotal || 0,
                    respect: stats.respectTotal || 0
                },
                ranks: { message: msgRank, voice: voiceRank, stream: streamRank },
                channels: { message: topMsgChannels, voice: topVoiceChannels },
                staff: staffData,
                staffPunitives,
                economy: economyData,
                penalties,
                ratings,
                twitter: tUser,
                levels: {
                    message: LevelUtils.calculateMessageLevel(msgScore),
                    voice: LevelUtils.calculateVoiceLevel(voiceScore)
                }
            };
        };

        if (ctx.isCommand && ctx.isCommand()) {
            if (!ctx.deferred && !ctx.replied) await ctx.deferReply().catch(() => {});
        }

        const renderUI = async () => {
            let messagePayload;
            const data = await fetchAllData(state.timeframe);
            
            const [topBuf, levelBuf, sicilBuf] = await renderStatCanvas(targetUser, member, data, state.timeframe);
            const files = [
                new AttachmentBuilder(topBuf, { name: 'stats_top.png' }),
                new AttachmentBuilder(levelBuf, { name: 'stats_level.png' }),
                new AttachmentBuilder(sicilBuf, { name: 'stats_sicil.png' })
            ];

            const galleryItems = [
                { media: { url: 'attachment://stats_top.png' } },
                { media: { url: 'attachment://stats_level.png' } },
                { media: { url: 'attachment://stats_sicil.png' } }
            ];

            // Spotify Check
            const presence = member.presence;
            if (presence && state.viewCategory === "general") {
                const spotifyActivity = presence.activities.find(a => a.name === "Spotify");
                if (spotifyActivity) {
                    const Spotify = require("../../Utils/Spotify");
                    
                    const trackName = spotifyActivity.details || "Unknown Track";
                    const trackArtist = spotifyActivity.state || "Unknown Artist";
                    const trackAlbum = spotifyActivity.assets?.largeText || "Unknown Album";
                    const imageId = spotifyActivity.assets?.largeImage?.includes(":") ? spotifyActivity.assets.largeImage.split(":")[1] : spotifyActivity.assets?.largeImage;
                    const trackImage = imageId ? `https://i.scdn.co/image/${imageId}` : null;

                    const now = Date.now();
                    const startAbs = spotifyActivity.timestamps?.start ? new Date(spotifyActivity.timestamps.start).getTime() : now;
                    const endAbs = spotifyActivity.timestamps?.end ? new Date(spotifyActivity.timestamps.end).getTime() : now + 180000;

                    const currentDur = now - startAbs;
                    const totalDur = endAbs - startAbs;

                    const sc = new Spotify()
                        .setAuthor(trackArtist)
                        .setAlbum(trackAlbum)
                        .setTitle(trackName)
                        .setBlur(3)
                        .setOverlayOpacity(0.7)
                        .setTimestamp(currentDur, totalDur);
                    if (trackImage) sc.setImage(trackImage);
                    
                    try {
                        const spotifyBuffer = await sc.build();
                        files.push(new AttachmentBuilder(spotifyBuffer, { name: 'spotify.png' }));
                        galleryItems.push({ media: { url: 'attachment://spotify.png' } });
                    } catch(e) {
                        console.error("Spotify card failed:", e);
                    }
                }
            }

            const containerComponents = [];
            
            if (state.viewCategory === "general") {
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: 'attachment://stats_top.png' } }]
                });
                
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: 'attachment://stats_level.png' } }]
                });
                
                containerComponents.push({
                    type: 12,
                    items: [{ media: { url: 'attachment://stats_sicil.png' } }]
                });
                
                if (galleryItems.length > 3) {
                    containerComponents.push({
                        type: 12,
                        items: [{ media: { url: 'attachment://spotify.png' } }]
                    });
                }
            }
            
            // Yetkili Stats
            if (state.viewCategory === "staff") {
                try {
                    const { renderStaffStatCanvas } = require('./StaffStatCanvas');
                    const buffer = await renderStaffStatCanvas(data, targetUser);
                    files.push(new AttachmentBuilder(buffer, { name: 'staff_profile.png' }));
                    
                    containerComponents.push({
                        type: 12,
                        items: [{ media: { url: 'attachment://staff_profile.png' } }]
                    });
                } catch (e) {
                    console.error("Staff canvas failed:", e);
                    messagePayload = { content: "Yetkili verileri yüklenirken bir hata oluştu." };
                }
            }
            
            // Partner Stats
            if (state.viewCategory === "partner") {
                try {
                    const filterDate = getFilter(state.timeframe);
                    const q = { guildID: guild.id, userID: targetUser.id };
                    if (filterDate) {
                        q.date = state.timeframe === "today" ? filterDate : { $gte: filterDate };
                    }
                    // Fetch from StatHistory.partnerHistory
                    const historyDocs = await StatHistory.find(q)
                        .sort({ date: -1 })
                        .limit(30)
                        .lean();
                    let allPartners = [];
                    for (const doc of historyDocs) {
                        if (doc.partnerHistory && Array.isArray(doc.partnerHistory)) {
                            allPartners.push(...doc.partnerHistory);
                        }
                    }
                    allPartners.sort((a, b) => new Date(b.date) - new Date(a.date));
                    const recentPartners = allPartners.slice(0, 6).map(p => ({
                        guildName: p.guildName,
                        lastPartnerAt: p.date
                    }));
                    const partnerCount = data.stats.partner || 0;
                    
                    const { renderPartnerStatCanvas } = require('./PartnerStatCanvas');
                    const buffer = await renderPartnerStatCanvas({ partnerCount, recentPartners }, targetUser);
                    files.push(new AttachmentBuilder(buffer, { name: 'partner_profile.png' }));
                    
                    containerComponents.push({
                        type: 12,
                        items: [{ media: { url: 'attachment://partner_profile.png' } }]
                    });
                } catch (e) {
                    console.error("Partner canvas failed:", e);
                    messagePayload = { content: "Partner verileri yüklenirken bir hata oluştu." };
                }
            }

            // Vampir Köylü Stats
            if (state.viewCategory === "vampire") {
                if (data.vampireProfile && data.vampireProfile.gamesPlayed > 0) {
                    const vp = data.vampireProfile;
                    const winRate = Math.round((vp.wins / vp.gamesPlayed) * 100);
                    
                    let mostPlayedRole = "Yok";
                    let maxPlays = 0;
                    if (vp.rolesPlayed) {
                        for (const [role, count] of Object.entries(vp.rolesPlayed)) {
                            if (count > maxPlays) {
                                maxPlays = count;
                                mostPlayedRole = role;
                            }
                        }
                    }
                    const Roles = require('../../Commands/Prefix/Fun/Game/Roles');
                    const roleName = Roles[mostPlayedRole] ? Roles[mostPlayedRole].name : mostPlayedRole;
                    
                    const memberData = {
                        avatarUrl: member.displayAvatarURL ? member.displayAvatarURL({ extension: 'png', size: 256 }) : targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                        tag: member.displayName || targetUser.globalName || targetUser.username,
                        elo: vp.elo,
                        mvpCount: vp.mvpCount || 0,
                        winRate: winRate,
                        wins: vp.wins,
                        losses: vp.losses,
                        gamesPlayed: vp.gamesPlayed,
                        roleName: roleName,
                        maxPlays: maxPlays
                    };

                    const { renderVampireProfile } = require('../../Utils/VampireProfileCanvas');
                    try {
                        const buffer = await renderVampireProfile(memberData);
                        files.push(new AttachmentBuilder(buffer, { name: 'vampire_profile.png' }));
                        
                        containerComponents.push({
                            type: 12,
                            items: [{ media: { url: 'attachment://vampire_profile.png' } }]
                        });
                    } catch(e) {
                        console.error("Vampire canvas failed:", e);
                    }
                } else {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                    containerComponents.push({
                        type: 10,
                        content: `> ## 🧛 Vampir Köylü İstatistikleri\n> Henüz hiç Vampir Köylü oynamamışsınız. Bir maça katılın ve tarih yazın!`
                    });
                }
            }

            if (state.viewCategory === "monopoly") {
                const MonopolyProfile = require("../../Core/Database/MonopolyProfile");
                const mp = await MonopolyProfile.findOne({ userID: targetUser.id });

                if (mp) {
                    const winRate = mp.playedGames > 0 ? Math.round((mp.wins / mp.playedGames) * 100) : 0;
                    const badges = [];
                    if (mp.wins >= 10) badges.push("👑 **Emlak Kralı**");
                    if (mp.totalMoneyEarned >= 10000) badges.push("🏦 **Banka Milyoneri**");
                    if (mp.playedGames >= 25) badges.push("🎲 **Zar Üstadı**");
                    if (mp.propertiesBought >= 50) badges.push("🏠 **Emlak Zengini**");

                    const badgesText = badges.length > 0 ? badges.join(" • ") : "Henüz rozet yok";

                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                    containerComponents.push({
                        type: 10,
                        content: `> ## 🎲 Monopoly (Caveriapoly) İstatistikleri\n> -# **Kullanıcı:** ${targetUser.toString()}\n\n> 🏆 **Zafer Sayısı:** \`${mp.wins}\` (Kazanma Oranı: \`%${winRate}\`)\n> 🎲 **Oynanan Maç:** \`${mp.playedGames}\` | 🔴 **İflas:** \`${mp.bankruptcies}\`\n> 💵 **Kazanılan Servet:** \`$${mp.totalMoneyEarned.toLocaleString()}\`\n> 🏠 **Satın Alınan Mülk:** \`${mp.propertiesBought}\` Adet\n> 🎖️ **Rozetler:** ${badgesText}`
                    });
                } else {
                    containerComponents.push({ type: 14, divider: true, spacing: 1 });
                    containerComponents.push({
                        type: 10,
                        content: `> ## 🎲 Monopoly (Caveriapoly) İstatistikleri\n> Henüz hiç Monopoly oynamamışsınız. Kendi emlak imparatorluğunuzu kurmak için \`.monopoly\` yazın!`
                    });
                }
            }

            containerComponents.push({ type: 14, divider: true, spacing: 1 });
            containerComponents.push({
                type: 1,
                components: [{
                    type: 3,
                    custom_id: "tf_select",
                    placeholder: "Tarih aralığı seçiniz...",
                    options: [
                        { label: "Bugün", value: "today", description: "Bugünlük performansınız", default: state.timeframe === "today" },
                        { label: "Bu Hafta", value: "weekly", description: "Bu haftanın verileri", default: state.timeframe === "weekly" },
                        { label: "Son 30 Gün", value: "monthly", description: "Son 30 günün istatistikleri", default: state.timeframe === "monthly" },
                        { label: "Tüm Zamanlar", value: "all", description: "Tüm zamanların verileri", default: state.timeframe === "all" }
                    ]
                }]
            });
            
            containerComponents.push({ type: 14, divider: true, spacing: 1 });
            containerComponents.push({
                type: 1,
                components: [{
                    type: 3,
                    custom_id: "cat_select",
                                placeholder: "Gösterilecek Veri Türü...",
                                options: [
                                    { label: "Genel İstatistikler", value: "general", description: "Genel sunucu sohbet ve ses verileri", default: state.viewCategory === "general" },
                                    { label: "Partner Verileri", value: "partner", description: "Partner sorumlusu istatistikleri", default: state.viewCategory === "partner" },
                                    { label: "Yetkili Verileri", value: "staff", description: "Yetkililik geçmişi ve metrikleri", default: state.viewCategory === "staff" },
                                    { label: "Vampir Köylü", value: "vampire", description: "Vampir Köylü oyunu verileriniz", default: state.viewCategory === "vampire" },
                                    { label: "Monopoly (Caveriapoly)", value: "monopoly", description: "Monopoly emlak ve zafer verileriniz", default: state.viewCategory === "monopoly" }
                                ]
                }]
            });

            if (messagePayload) return messagePayload;

            return {
                flags: [MessageFlags.IsComponentsV2],
                files,
                components: [{
                    type: 17,
                    components: containerComponents
                }]
            };
        };

        let initialUI;
        try {
            initialUI = await renderUI();
        } catch (e) {
            console.error(e);
            return;
        }

        const payload = {
            ...initialUI
        };

        let msg;
        try {
            if (ctx.isCommand && ctx.isCommand()) {
                if (ctx.deferred || ctx.replied) msg = await ctx.editReply(payload);
                else msg = await ctx.reply({ ...payload, fetchReply: true });
            } else {
                msg = await ctx.reply(payload).catch(async () => await ctx.channel.send({ files: payload.files, components: payload.components }));
            }
        } catch (err) {
            console.error("Panel gönderilemedi:", err);
            return;
        }

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === authorId,
            time: 300000
        });

        collector.on("collect", async (i) => {
            await i.deferUpdate();

            if (i.customId === "tf_select") {
                state.timeframe = i.values[0];
            } else if (i.customId === "cat_select") {
                state.viewCategory = i.values[0];
            }

            const updatedUI = await renderUI();
            
            await i.editReply(updatedUI).catch(() => {});
        });

        collector.on("end", () => {
            if (ctx.isCommand && ctx.isCommand()) {
                ctx.editReply({ components: [] }).catch(() => {});
            } else {
                msg.edit({ components: [] }).catch(() => {});
            }
        });
    }
}

module.exports = StatsService;





