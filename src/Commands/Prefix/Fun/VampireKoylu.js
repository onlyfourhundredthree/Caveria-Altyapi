const { MessageFlags } = require("discord.js");
const VampireGame = require("../../../Core/Database/VampireGame");
const Config = require("../../../Core/Config/DefaultConfig");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const SetupHelper = require("./Game/VampireSetupHelper");

module.exports = {
    conf: {
        usages: ["vampir-köylü", "vampirkoylu", "vk", "vampire-köylü", "vampire-lobby", "vampire-lobi", "vampire-panel", "vampire-lobby-panel", "vampire-lobi-panel"],
        description: "Vampir Köylü oyununu başlatır ve yönetir.",
        category: "Fun",
        usage: ".vampir-köylü"
    },

    run: async (client, message, args, embed) => {
        const GeneralService = require("../../../Services/Systems/GeneralService");
        
        const eventManageRole = ConfigManager.get("Roles.Responsibilities.EventManage") || [];
        const hasEventRole = Array.isArray(eventManageRole) ? eventManageRole.some(r => message.member.roles.cache.has(r)) : message.member.roles.cache.has(eventManageRole);
        if (!message.member.permissions.has("Administrator") && !hasEventRole) {
            return GeneralService.sendV2Message(message, {
                components: [
                    { type: 17, components: [{ type: 10, content: "Bu komutu sadece **Etkinlik Yöneticileri** kullanabilir." }] }
                ],
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
            }).catch(()=>{});
        }
        
        let game = await VampireGame.findOne({ guildID: message.guild.id, channelID: message.channel.id, isActive: true });
        
        if (!game) {
            const arg = args[0]?.toLowerCase();
            if (!message.member.voice.channel) {
                return GeneralService.sendV2Message(message, {
                    components: [
                        { type: 17, components: [{ type: 10, content: "Vampir Köylü oynamak için bir ses kanalında olmalısın!" }] }
                    ],
                    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                }).catch(()=>{});
            }
            const voiceID = message.member.voice.channel.id;

            game = new VampireGame({
                guildID: message.guild.id,
                channelID: message.channel.id,
                voiceChannelID: voiceID,
                hostID: message.author.id,
                phase: "SETUP",
                settings: {
                    playerCount: 0,
                    roles: SetupHelper.defaultRoles(),
                    nightDuration: 90, voteDuration: 90, discussionDuration: 60
                },
                players: [{ id: message.author.id, role: null, isAlive: true }]
            });
            await game.save();
        }

        const v2Payload = buildDashboardPayload(game);

        await GeneralService.sendV2Message(message, {
            components: v2Payload,
            flags: [MessageFlags.IsComponentsV2]
        });
    },

    };

// --- SETUP / LOBBY DASHBOARD ÜRETİCİ ---
function buildDashboardPayload(game) {
    const pCount = game.players.length;
    const s = game.settings;
    const sum = SetupHelper.setupSummary(s, pCount);
    const playerMentions = game.players.map(p => (p.isBot ? `🤖 AI (${p.id.split("_")[2]})` : `<@${p.id}>`)).join(", ");

    if (game.phase === "SETUP") {
        const Roles = require("./Game/Roles");
        
        // --- ROL SELECT MENU ---
        const roleOptions = [];
        for (const r of Object.values(Roles)) {
            if (!r.setup) continue;
            const cur = SetupHelper.roleCount(s, r.setup);
            roleOptions.push({
                label: `${r.name} (Şu an: ${cur})`,
                value: r.setup.key,
                emoji: r.emoji ? { name: r.emoji } : undefined
            });
        }

        return [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `> ## 🧛 Vampir Köylü: Kurulum\n> -# Kurucu: <@${game.hostID}>\n> -# Ayarları yapılandırıp Lobiyi Oluştur butonuna basın.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### 🎭 Roller\n> ${sum.roleTxt}\n> -# Toplam özel rol: **${sum.totalSpecial}** • Köylü sayısı otomatik hesaplanır.`
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "vk_setup_role_select",
                                placeholder: "🎭 Sayısını ayarlamak için en fazla 5 rol seçin...",
                                min_values: 1,
                                max_values: 5,
                                options: roleOptions
                            }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### ⏱️ Süreler\n> 🌙 Gece: **${s.nightDuration ?? 90}sn** • 🗣️ Tartışma: **${s.discussionDuration ?? 60}sn** • 🗳️ Oylama: **${s.voteDuration ?? 90}sn**`
                    },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 2, custom_id: "vk_modal_durations", label: "Süreleri Düzenle", emoji: { name: "⏱️" } }
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### ⚙️ Ayarlar\n> ${sum.optTxt}`
                    },
                    {
                        type: 1,
                        components: [
                            ...buildGeneralToggleButtons(s)
                        ]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> ### 👥 Oyuncular (${pCount})\n> ${playerMentions || "Henüz kimse yok."}`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            { type: 2, style: 3, custom_id: "vk_v2_finalize_setup", label: "Lobiyi Oluştur", emoji: { name: "✅" } },
                            { type: 2, style: s.testMode ? 3 : 2, custom_id: "vk_toggle_testmode", label: `Test: ${s.testMode ? "AÇIK" : "KAPALI"}`, emoji: { name: "🧪" } },
                            { type: 2, style: 4, custom_id: "vk_v2_cancel", label: "İptal Et", emoji: { name: "✖️" } }
                        ]
                    }
                ]
            }
        ];
    }

    // LOBBY
    const lobbyPayload = [
        {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `> ## 🧛 Vampir Köylü: Lobi${s.testMode ? " 🧪 TEST" : ""}\n> -# Kurucu: <@${game.hostID}>\n> -# **Oyuncular (${pCount}):**\n> ${playerMentions || "Yok"}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `> **🎭 Roller:** ${sum.roleTxt}\n> **⏱️ Süreler:** 🌙 ${s.nightDuration ?? 90}sn • 🗣️ ${s.discussionDuration ?? 60}sn • 🗳️ ${s.voteDuration ?? 90}sn`
                },
                { type: 14, divider: true, spacing: 1 }
            ]
        }
    ];

    if (s.testMode) {
        const Roles = require("./Game/Roles");
        const testRoleOptions = [];
        for (const [roleId, r] of Object.entries(Roles)) {
            if (!r.setup || r.isVirtual) continue;
            testRoleOptions.push({
                label: r.name,
                value: roleId,
                emoji: r.emoji ? { name: r.emoji } : undefined
            });
        }
        testRoleOptions.push({
            label: "Köylü",
            value: "KOYLU",
            emoji: { name: "🧑‍🌾" }
        });

        if (testRoleOptions.length > 0) {
            lobbyPayload[0].components.push({
                type: 1,
                components: [
                    {
                        type: 3,
                        custom_id: "vk_test_role_select",
                        placeholder: "🧪 Test Modu: Oynamak istediğin rolü seç...",
                        min_values: 1,
                        max_values: 1,
                        options: testRoleOptions.slice(0, 25)
                    }
                ]
            });
            lobbyPayload[0].components.push({ type: 14, divider: true, spacing: 1 });
        }
    }

    lobbyPayload[0].components.push({
        type: 1,
        components: [
            { type: 2, style: 1, custom_id: "vk_toggle_join", label: "Katıl / Ayrıl", emoji: { name: "👥" } },
            { type: 2, style: 3, custom_id: "vk_v2_start", label: "Oyunu Başlat", emoji: { name: "▶️" } },
            { type: 2, style: 2, custom_id: "vk_v2_add_ai_prompt", label: "Bot (AI) Ekle", emoji: { name: "🤖" } },
            { type: 2, style: 4, custom_id: "vk_v2_cancel", label: "İptal Et", emoji: { name: "✖️" } }
        ]
    });

    return lobbyPayload;
}

// --- GENEL AYAR TOGGLE BUTONLARI ---
function buildGeneralToggleButtons(s) {
    const btns = [];
    
    btns.push({
        type: 2,
        style: s.autoRoles ? 3 : 4,
        custom_id: "vk_gen_toggle_auto_roles",
        label: `Oto Dağıtım: ${s.autoRoles ? "AÇIK" : "KAPALI"}`,
        emoji: { name: "🤖" }
    });

    btns.push({
        type: 2,
        style: s.revealRoleOnDeath !== false ? 3 : 4,
        custom_id: "vk_gen_toggle_reveal",
        label: `Rol Göster: ${s.revealRoleOnDeath !== false ? "AÇIK" : "KAPALI"}`,
        emoji: { name: "👁️" }
    });
    
    btns.push({
        type: 2,
        style: s.doctorSelfProtect !== false ? 3 : 4,
        custom_id: "vk_gen_toggle_self",
        label: `Dr. Self: ${s.doctorSelfProtect !== false ? "AÇIK" : "KAPALI"}`,
        emoji: { name: "🚑" }
    });
    
    btns.push({
        type: 2,
        style: s.doctorInheritance ? 3 : 4,
        custom_id: "vk_gen_toggle_inheritance",
        label: `Dr. Miras: ${s.doctorInheritance ? "AÇIK" : "KAPALI"}`,
        emoji: { name: "🔄" }
    });
    
    let ttsModeLabel = "TTS Modu: Taraf";
    let ttsStyle = 3; // Green
    if (s.ttsRoleMode === 2) {
        ttsModeLabel = "TTS Modu: Tam Liste";
        ttsStyle = 1; // Blurple
    } else if (s.ttsRoleMode === 3) {
        ttsModeLabel = "TTS Modu: Kapalı";
        ttsStyle = 4; // Red
    }

    btns.push({
        type: 2,
        style: ttsStyle,
        custom_id: "vk_gen_toggle_tts",
        label: ttsModeLabel,
        emoji: { name: "🔊" }
    });

    return btns;
}

module.exports.buildDashboardPayload = buildDashboardPayload;