const ConfigManager = require("../Handlers/ConfigManager");
module.exports = {
    "WelcomeMessageStatus": true,
    "Prefixs": [".", "!", "-"],
    "Channels": {
        "Allowed_Commands": [],
        "Chat": "",
        "TicketCategory": "",
        "TicketTranscript": "",
        "PartnerTR": "",
        "PartnerGlobal": "",
        "PartnerAppLogTR": "",
        "PartnerAppLogGlobal": "",
        "Tag": "",
        "LobbyChannel": "",
        "LobbyCategory": "",
        "DmForum": "",
        "DmControl": "",
        "Itiraf": "",
        "ItirafLog": "",
        "PublicVoices": [],
        "MessageLevelLog": "",
        "VoiceLevelLog": "",
        "KelimeTuretmece": "",
        "BotVoiceChannel": "",
        "PermanentRoomAppLog": "",
        "PermanentRoomOwners": "",
        "PermanentRoomLog": "",
        "PermanentRoomCategory": "",
        "TaskLog": "",
        "PromotionLog": "",
        "CompletionLog": "",
        "StaffRating": "",
        "ErrorLog": "",
        "ClaimLog": "",
        "ClaimDropChannel": "",
        "AFK": "",

        "MessageLog": "",
        "VoiceLog": "",
        "ChannelLog": "",
        "RoleLog": "",
        "MemberLog": "",
        "EmojiLog": "",
        "InviteLog": "",
        "ServerLog": "",
        "CommandLog": "",
        "NameLog": "",

        "ForcebanLog": "",
        "BanLog": "",
        "UnderworldLog": "",
        "JailLog": "",
        "EventJailLog": "",
        "MuteLog": "",
        "UyariLog": "",
        "EvidenceLog": "",
        "EvidenceTimeoutLog": "",
        "EvidenceAuditPool": "",

        "GuardLog": "",
        "GuardRoleLog": "",
        "GuardChannelLog": "",
        "GuardBanLog": "",
        "GuardEmojiLog": "",
        "GuardWebhookLog": "",
        "GuardServerLog": "",
        "GuardBotLog": ""
    },
    "Restrict": {
        "Users": [],
        "Roles": [
            "1396095766401122374", "139149012029243392", "1396095764266225745", "1396149009881763921",
            "1396095762898878556", "1396149007578955899", "1396095761506238554", "1396149005343396010",
            "1396095759849619538", "1396149002822619197", "1396095758515703870", "1396149000477868163",
            "1396095757702135818", "1396095756716347463", "1396148994530344961", "1396095755667771453",
            "1396148991883874494", "1396095754212212746", "1396148989048655982", "1396095752832422070",
            "1396148985802129458", "1396095751842693191", "1396149293638750278", "1416156512610685070"
        ]
    },
    "Roles": {
        "PunishmentControllers": [],
        "Warn_Staff": [],
        "Mute_Staff": [],
        "Jail_Staff": [],
        "EventJail_Staff": [],
        "Ban_Staff": [],
        "RealBan_Staff": [],
        "StatsStaffs": [],
        "RolVer_Staff": [],
        "Muted": "",
        "Jailed": "",
        "EventJail": "",
        "EventCezali": "",
        "Underworld": "",
        "Tag": "",
        "Member": "",
        "EnglishRole": "",
        "Responsibilities": {
            "Chat": ["1485733377746272578"],
            "ChatManager": [],
            "Voice": ["1485733609494020236"],
            "VoiceManager": [],
            "EventManage": ["1485703086159696184"],
            "EventManager": [],
            "Partner": [],
            "PartnerManager": [],
            "TicketStaff": [],
            "TicketManager": [],
            "Recruitment": [],
            "RecruitmentManager": [],
            "TaskStaff": ["1489748009477607565"],
            "PermanentRoomStaff": [],
            "StaffTeamRole": "1414015793817059489",
            "RecruitmentLevels": [
                { "label": "Seidosha", "value": "1396095722075459704" },
                { "label": "Hoideshi", "value": "1396095720867627099" }
            ]
        },
        "ArthurMorgan": "",
        "VoiceRanks": [],
        "MessageRanks": []
    },
    "Welcome": {
        "Enabled": true,
        "Message": [
            {
                "type": 17,
                "accent_color": 6999363,
                "spoiler": false,
                "components": [
                    {
                        "type": 10,
                        "content": "Hoş geldin {member}! Sunucumuza katıldığın için mutluyuz."
                    },
                    {
                        "type": 12,
                        "items": [
                            {
                                "media": {
                                    "url": "https://i.hizliresim.com/1ggxqcf.jpeg"
                                }
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "divider": true,
                        "spacing": 1
                    }
                ]
            }
        ],
        "ButtonStatus": true,
        "Messages": [
            "{member} partiye katıldı.",
            "{member} burada."
        ]
    },

    "WeeklyReward": {
        "VoiceWinners": 5,
        "VoiceRole": "1400486390135001162",
        "MessageWinners": 5,
        "MessageRole": "1400486392756310117",
        "StreamerWinners": 5,
        "StreamerRole": "",
        "LogChannel": "1480107335635566732",
        "MinVoiceTime": 3600000, 
        "MinMessageCount": 100,
        "MinStreamTime": 1800000 
    },
    "ChatGuard": {
        "MediaCooldown": 45000,
        "EmojiLimit": 6,
        "MentionLimit": 5,
        "SpoilerLimit": 5,
        "MaxSingleLine": 400,
        "InviteBlock": true
    },
    "Boost": {
        "Message": "🎉 {member} sunucumuza boost bastı! Teşekkürler! Sunucumuz şu an **{boostCount}** boosta ulaştı. 🚀",
        "LogChannel": "",
        "NameLog": "",
        "SpecialRoles": []
    },
    "Partner": {
        "Message": "⠀⠀⠀⠀⠀⠀⠀⠀⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n⋆. 𐙚 ̊ Partnerlik yaptığın için teşekkür ederiz ₊˚⊹ ᰔ\n✮⋆˙ Toplam partner sayın: **{topStat}**  \n✮⋆˙ Haftalık partner sayın: **{weeklyStat}**  \n✮⋆˙ Bu haftaki sıralaman: **{weeklyRank}**",
        "MessageGlobal": "⠀⠀⠀⠀⠀⠀⠀⠀⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n⋆. 𐙚 ̊ Thank you for partnering with us! ₊˚⊹ ᰔ\n✮⋆˙ Your total partners: **{topStat}**  \n✮⋆˙ Your weekly partners: **{weeklyStat}**  \n✮⋆˙ Your rank this week: **#{weeklyRank}**",
        "Image": "https://i.ibb.co/hxCqpq7L/x-dxddx.png",
        "AdvertisementText": "# ` LothDown !!` \n══════════════ || @everyone ~ @here ||\n-# Yeni insanlarla tanışmana, keyifli ve samimi sohbetlere dahil olmana ve kaliteli vakit geçirmene ev sahipliği yapacak sıcacık bir sunucuyuz!^^ \n**Üstelik yeni açıldık!!**\n\n## ༯ Bize katılırsan yararlanabileceğin çok şey var!  ݁݁\n^^\n\n◞\" Dozunu kaçırmadığın sürece gönlünce ve rahatça konuşabileceğin **akıcı** bir sunucuyuz!!\n𓏻\n◞\" Kurallara boğmayan, sadece gerekli yerlerde seni kısıtlayan **samimi** bir sisteme sahibiz!!\n𓏻\n◞\" **Adaletli** ve **çok yönlü** bir yapıya sahibiz!!\n𓏻\n◞\" **Etkinlik ve çekilişler** düzenlemekteyiz!!\n𓏻\n◞\" Boosterlarımıza **ilgi çekici** ayrıcalıklar sunmaktayız!!\n𓏻\n◞\" Hepsinden önemlisi **üyelerimiz bizim için oldukça değerli ve kıymetlidir**!!!\n\n══════════════\n*Açılışa özel etkinliklerimizi ve çekilişlerimizi kaçırma!! İlk üyelerimizden biri olabilirsin!*\n-# Seni de hemen şimdi aramızda görmek istiyoruz!!!!!!!\nhttps://discord.gg/YcbbBU9p6J\nhttps://cdn.discordapp.com/attachments/1213757888808357987/1456818057044431014/06C7D07C-0F34-4DD9-AFFE-FF27CFB0FEAA.gif?"
    },
    "Level": {
        "MessageLog": "Tebrikler {user}! Mesaj seviyen yükseldi: **{oldlevel}** ➔ **{newlevel}** 🎉",
        "VoiceLog": "Tebrikler {user}! Ses seviyen yükseldi: **{oldlevel}** ➔ **{newlevel}** 🎤",
        "RoleGuard": false
    },
    "Logs": {
        "Toggles": {
            "WarnLogActive": true,
            "MuteLogActive": true,
            "JailLogActive": true,
            "BanLogActive": true
        }
    },
    "Forcebans": [],
    "AutoStaff": {
        "Enabled": false,
        "Requirements": {
            "MessageCount": 500,
            "VoiceTime": 7200000,
            "ActivityPeriod": 7
        },
        "Cooldowns": {
            "Invite": 14
        },
        "Channels": {
            "Log": ""
        },
        "Message": "# Merhaba {member},\n\n> Sunucumuzda son zamanlarda gösterdiğin **aktiflik ve ilgi** dikkatimizden kaçmadı.\n> Sohbet ve ses kanallarındaki katkıların doğrultusunda,\n> seni **yetkili ekibimiz** arasında görmekten memnuniyet duyarız.\n>\n> Yetkili olmak **tamamen isteğe bağlıdır.**\n> İlgileniyorsan başvurunu\n> ** {applicationChannel} ** kanalından iletebilirsin.\n>\n> Chat / Ses / Etkinlik / Partner alanlarında yetkilendirme yapılmaktadır.\n>\n> İlgin için teşekkür eder, iyi günler dileriz. \n\n-# Bu mesaj otomatik sistem tarafından, aktiflik kriterlerine göre gönderilmiştir. İlgini çekmiyorsa dikkate almayabilirsin.",
        "CheckInterval": 60
    },
    "StaffControl": {
        "Enabled": true,
        "LogChannel": "",
        "ExcuseLog": "",
        "WarningRole": "",
        "Requirements": {
            "Chat": 50,
            "Voice": 3600000, 
            "Partner": 2,
            "Bump": 0
        },
        "Thresholds": {
            "Warning": 1, 
            "Lock": 2     
        },
        "Periods": {
            "Chat": "DAILY",
            "Voice": "DAILY",
            "Partner": "DAILY",
            "Bump": "DAILY"
        }
    },
    "TagBan": {
        "Enabled": false,
        "BannedGuildIDs": [],
        "BannedGuildNames": {},
        "Action": "rol", 
        "BannedTagRole": "",
        "LogChannel": "",
        "DmMessage": "⚠️ **{guild}** sunucusunda yasaklı bir sunucunun tagını ({tag}) taşıdığınız tespit edildi. Bu nedenle {action} işlemi uygulandı."
    },
    "Emojis": {
        "toji_leftarrow": "⬅️",
        "toji_rightarrow": "➡️",
        "toji_star": "✨",
        "toji_create": "",
        "toji_onay": "",
        "toji_iptal": "",
        "toji_info": "",
        "toji_hello": "",
        "toji_nokta": "",
        "toji_time": "",
        "toji_message": "",
        "bar_full_start": "",
        "bar_full_mid": "",
        "bar_full_end": "",
        "bar_empty_start": "",
        "bar_empty_mid": "",
        "bar_empty_end": "",
        "confetti": "",
        "toji_user": "",
        "toji_bluestar": "",
        "toji_calendar": "",
        "toji_gengar": "",
        "toji_chat": "",
        "toji_voice": "",
        "toji_staff": "",
        "toji_sign": "",
        "toji_cloud": "",
        "toji_partner": "",
        "toji_ticket": "✨",
        "toji_invite": "",
        "toji_sparkly": "",
        "toji_sparkles": "✨",
        "toji_hubsparkles": "✨",
        "toji_crucifix": "✨",
        "pr_edit": "",
        "pr_community": "",
        "pr_locked": "",
        "pr_unlocked": "",
        "pr_camerayes": "",
        "pr_camerano": "",
        "pr_adminguardon": "",
        "pr_adminguardoff": "",
        "riot_lol": "<:toji_lol:1498101529675304970>",
        "riot_valo": "<:toji_valo:1498101564680835213>",
        "riot_unranked": "<:toji_unranked:1498103061288190022>",
        "riot_lol_iron": "<:toji_iron:1498102100826132540>",
        "riot_lol_bronze": "<:toji_bronze:1498102094031228948>",
        "riot_lol_silver": "<:toji_silver:1498102096820703284>",
        "riot_lol_gold": "<:toji_gold:1498102092525469836>",
        "riot_lol_platinum": "<:toji_platinum:1498103375785365624>",
        "riot_lol_emerald": "<:toji_emerald:1498102095620866222>",
        "riot_lol_diamond": "<:toji_diamond:1498102091317772319>",
        "riot_lol_master": "<:toji_master:1498102102554050630>",
        "riot_lol_grandmaster": "<:toji_grandmaster:1498102105616023722>",
        "riot_lol_challenger": "<:toji_challenger:1498102104152215582>",
        "riot_valo_iron": "<:toji_iron1:1498102179523858483>",
        "riot_valo_bronze": "<:toji_bronze1:1498102180853317683>",
        "riot_valo_silver": "<:toji_silver1:1498102188357189702>",
        "riot_valo_gold": "<:toji_gold1:1498102185504931882>",
        "riot_valo_platinum": "<:toji_platinum1:1498102184351633590>",
        "riot_valo_diamond": "<:toji_diamond1:1498102183181156483>",
        "riot_valo_ascendant": "<:toji_ascendant:1498102182086709328>",
        "riot_valo_immortal": "<:toji_immortal:1498102178118631564>",
        "riot_valo_radiant": "<:toji_radiant:1498102187144773802>",
        "riot_trash": "<:toji_trash:1498103922651562216>",
        "riot_clipboard": "✨",
        "lobby_lol_top": "<:toji_top:1498134826581233765>",
        "lobby_lol_jungle": "<:toji_jungle:1498134822348914748>",
        "lobby_lol_mid": "<:toji_mid:1498134823741558805>",
        "lobby_lol_adc": "<:toji_adc:1498134827868754040>",
        "lobby_lol_support": "<:toji_sup:1498134824949518469>",
        "lobby_valo_duelist": "<:toji_duelist:1498135219029414010>",
        "lobby_valo_sentinel": "<:toji_sentinel:1498135220296089781>",
        "lobby_valo_initiator": "<:toji_initiator:1498135217708339313>",
        "lobby_valo_controller": "<:toji_controller:1498135221521092769>",
        "lobby_timer": "<:toji_lobbytimer:1498135529332412588>",
        "lobby_crown": "<:toji_lobbycrown:1498135654025003219>"
    },
    "privateRooms": {
        "createChannelId": "",
        "categoryId": "",
        "emptyDeleteTimeout": 60000,
        "maxProfilesPerUser": 3,
        "antiSpamCooldown": 5000,
        "defaultUserLimit": 5,
        "loggingChannelId": ""
    },
    "PermanentRoomSettings": {
        "MinMembers": 4,
        "MinWeeklyVoice": 60,
        "TeamRoleEnabled": false,
        "DefaultTeamRoleColor": "#FF0000"
    },
    "Economy": {
        "CurrencyName": "403 Coin",
        "CurrencyEmoji": "<:403_coin:1485445385446101103>",
        "MessageCoin": 0.1,
        "VoiceCoinPerHour": 0.1,
        "InviteCoin": 25,
        "LevelCoin": 100,
        "QuestionEnabled": true,
        "QuestionChannel": "",
        "QuestionInterval": 1800000, 
        "QuestionReward": 5.0,
        "MarketItems": [
            { "id": "allah_1", "name": "test", "price": 100 }
        ]
    },
    "Tweet": {
        "Channel": "",
        "Webhook": ""
    },
    "PunishmentReasons": [
        { "label": "Kışkırtma, Troll ve Küfür", "value": "kiskirtma", "type": 5, "date1": "10m", "date2": "30m", "date3": "1h" },
        { "label": "Siyaset ve Tartışma", "value": "siyaset", "type": 5, "date1": "15m", "date2": "45m", "date3": "2h" },
        { "label": "Spam ve Flood", "value": "spam", "type": 5, "date1": "5m", "date2": "15m", "date3": "30m" },
        { "label": "Rahatsız Edici Ses / Troll", "value": "ses-troll", "type": 4, "date1": "15m", "date2": "1h", "date3": "3h" },
        { "label": "Ses Kanalında Siyaset", "value": "ses-siyaset", "type": 4, "date1": "30m", "date2": "2h", "date3": "5h" },
        { "label": "Ağır Küfür / Hakaret", "value": "jail-kufur", "type": 3, "date1": "1d", "date2": "3d", "date3": "7d" },
        { "label": "Sunucu Düzenini Bozma / Troll", "value": "jail-troll", "type": 3, "date1": "12h", "date2": "1d", "date3": "3d" }
    ],
    "BestStaff": {
        "Channel": "",
        "RewardRole": "",
        "Hour": "20:00",
        "RewardXP": 0,
        "Multiplier": 1.0,
        "RewardCoin": 0,
        "CurrentWinnerID": ""
    }
};
