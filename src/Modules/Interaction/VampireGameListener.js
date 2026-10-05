const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require("discord.js");
const VampireGame = require("../../Core/Database/VampireGame");
const client = global.bot;

module.exports = async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("vk_")) return;
    
    // Allow specific DM interactions
    const isAllowedDM = interaction.customId.startsWith("vk_act_") || 
                        interaction.customId.includes("vk_note") || 
                        interaction.customId === "vk_mayor_heir_select";
                        
    if (!interaction.guild && !isAllowedDM) return;

    try {
        // --- V2 DASHBOARD SETUP & LOBBY ACTIONS ---
        if (interaction.customId === "vk_v2_setup") {
            const existingGame = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true });
            if (existingGame) return replySafe(interaction, "Bu kanalda zaten aktif bir oyun var.");

            if (!interaction.member.voice.channel) return replySafe(interaction, "Vampir Köylü oynamak için bir ses kanalında olmalısın!");
            const voiceID = interaction.member.voice.channel.id;

            const SetupHelper = require("../../Commands/Prefix/Fun/Game/VampireSetupHelper");
            const newGame = new VampireGame({
                guildID: interaction.guild.id,
                channelID: interaction.channel.id,
                voiceChannelID: voiceID,
                hostID: interaction.user.id,
                phase: "SETUP",
                settings: {
                    playerCount: 0,
                    roles: SetupHelper.defaultRoles(),
                    nightDuration: 90, voteDuration: 90, discussionDuration: 60
                },
                players: [{ id: interaction.user.id, role: null, isAlive: true }]
            });
            await newGame.save();
            await updateLobbyEmbed(interaction, newGame);
            return interaction.deferUpdate().catch(e => console.error(e));
        }

        if (interaction.customId === "vk_v2_cancel") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true });
            if (!game) return interaction.reply({ content: "Aktif bir oyun bulunamadı.", flags: [MessageFlags.Ephemeral] });
            if (game.hostID !== interaction.user.id) return interaction.reply({ content: "Sadece oyunu kuran kişi iptal edebilir.", flags: [MessageFlags.Ephemeral] });
            
            await interaction.deferUpdate().catch(e => console.error(e));
            
            // Restore nicknames if any were changed
            for (const p of game.players) {
                if (p.isBot || !p.fakeName || p.originalName === undefined) continue;
                const member = await interaction.guild.members.fetch(p.id).catch(() => null);
                if (member) {
                    if (member.manageable) await member.setNickname(p.originalName).catch(e => console.error(e));
                }
            }

            await VampireGame.updateMany({ guildID: interaction.guild.id, channelID: interaction.channel.id }, { isActive: false, phase: "ENDED" });
            
            // Ses kanalından çık
            const VoiceManager = require('../../Utils/VampireVoiceManager');
            VoiceManager.disconnect(interaction.guild.id);
            
            if (interaction.message) await interaction.message.delete().catch(e => console.error(e));
            return replySafe(interaction, "Oyun iptal edildi.");
        }

        if (interaction.customId === "vk_v2_finalize_setup") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return interaction.reply({ content: "Kurulum aşamasında oyun bulunamadı.", flags: [MessageFlags.Ephemeral] });
            if (game.hostID !== interaction.user.id) return interaction.reply({ content: "Sadece oyunu kuran kişi lobiyi oluşturabilir.", flags: [MessageFlags.Ephemeral] });

            game.phase = "LOBBY";
            await game.save();
            await updateLobbyEmbed(interaction, game);
            
            // TTS: Lobi oluştu
            const VoiceManager = require('../../Utils/VampireVoiceManager');
            const voiceChannel = interaction.guild.channels.cache.get(game.voiceChannelID);
            if (voiceChannel) {
                VoiceManager.speak(voiceChannel, "Vampir Köylü lobisi oluşturuldu. Oyuncuların katılması bekleniyor.");
            }

            return interaction.deferUpdate().catch(e => console.error(e));
        }

        if (interaction.customId === "vk_v2_add_ai_prompt") {
            if (!interaction.member.permissions.has("Administrator")) return interaction.reply({ content: "Bu komutu sadece yöneticiler test amaçlı kullanabilir.", flags: [MessageFlags.Ephemeral] });
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
            
            const modal = new ModalBuilder()
                .setCustomId("vk_v2_add_ai_modal")
                .setTitle("Bot (AI) Ekle");

            const countInput = new TextInputBuilder()
                .setCustomId("ai_count")
                .setLabel("Kaç adet bot eklensin?")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(2)
                .setPlaceholder("Örn: 5")
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(countInput));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === "vk_v2_add_ai_modal") {
            const countStr = interaction.fields.getTextInputValue("ai_count");
            const count = parseInt(countStr);
            if (isNaN(count) || count < 1 || count > 20) return replySafe(interaction, "Lütfen 1 ile 20 arasında geçerli bir sayı girin.");

            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: { $in: ["LOBBY", "SETUP"] } });
            if (!game) return replySafe(interaction, "Aktif bir lobi bulunamadı.");

            for(let i = 0; i < count; i++) {
                game.players.push({ 
                    id: `ai_${Date.now()}_${Math.floor(Math.random() * 1000)}`, 
                    role: null, isAlive: true, isBot: true 
                });
            }
            await game.save();
            await updateLobbyEmbed(interaction, game);
            return replySafe(interaction, `Lobiye **${count}** adet yapay zeka (AI) eklendi!`);
        }

        if (interaction.customId === "vk_toggle_testmode") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Test Modu sadece Kurulum (Setup) ekranındayken değiştirilebilir.");
            if (game.hostID !== interaction.user.id && !interaction.member.permissions.has("Administrator")) return replySafe(interaction, "Sadece kurucu bu ayarı değiştirebilir.");
            
            game.settings.testMode = !game.settings.testMode;
            if (!game.settings.testMode) {
                for (const p of game.players) p.role = "RANDOM";
                game.markModified("players");
            }
            game.markModified("settings");
            await game.save();
            await updateLobbyEmbed(interaction, game);
            return replySafe(interaction, `🧪 Test Modu: **${game.settings.testMode ? "AÇIK" : "KAPALI"}**${game.settings.testMode ? "\nLobideki oyuncular rollerini seçebilir!" : ""}`);
        }

        // Test modu rol seçimi
        if (interaction.customId === "vk_test_role_select" && interaction.isStringSelectMenu()) {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "LOBBY" });
            if (!game) return replySafe(interaction, "Aktif bir lobi bulunamadı. Oyun başlamış olabilir.");

            const selectedRole = interaction.values[0];
            const player = game.players.find(p => p.id === interaction.user.id);
            if (!player) return replySafe(interaction, "Bu lobiye katılmamışsın. Lütfen önce Katıl butonuna tıkla.");

            const RolesLib = require("../../Commands/Prefix/Fun/Game/Roles");
            const roleInfo = RolesLib[selectedRole];

            player.role = selectedRole;
            game.markModified("players");
            await game.save();

            return interaction.reply({ content: `✅ Test Modu: Rolün **${roleInfo?.name || selectedRole}** ${roleInfo?.emoji || ""} olarak başarıyla ayarlandı! Oyun başladığında bu rolle oynayacaksın.`, flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === "vk_v2_start") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "LOBBY" });
            if (!game) return interaction.reply({ content: "Başlatılacak bir lobi yok.", flags: [MessageFlags.Ephemeral] });
            if (game.hostID !== interaction.user.id && !interaction.member.permissions.has("Administrator")) return interaction.reply({ content: "Oyunu sadece kurucu başlatabilir.", flags: [MessageFlags.Ephemeral] });
            
            await interaction.deferUpdate().catch(e => console.error(e));

            const SetupHelper = require("../../Commands/Prefix/Fun/Game/VampireSetupHelper");
            const playerCount = game.players.length;

            if (game.settings.autoRoles) {
                if (!game.settings.roles) game.settings.roles = {};
                const sRoles = game.settings.roles;
                const roleKeys = ['vampire', 'doctor', 'seer', 'hunter', 'aura', 'detective', 'scout', 'trapper', 'bomber', 'serial_killer', 'alfa_kurt', 'jester', 'arsonist', 'executioner', 'fool', 'medium', 'shaman', 'sorcerer', 'vampire_lord'];
                for (const key of roleKeys) sRoles[key] = 0;
                
                if (playerCount <= 6) {
                    sRoles.vampire = 1; 
                    sRoles.doctor = 1; sRoles.seer = 1;
                } else if (playerCount <= 8) {
                    sRoles.vampire = 1; sRoles.sorcerer = 1;
                    sRoles.doctor = 1; sRoles.seer = 1;
                } else if (playerCount <= 10) {
                    sRoles.vampire = 1; sRoles.shaman = 1;
                    sRoles.doctor = 1; sRoles.seer = 1; sRoles.aura = 1;
                    sRoles.jester = 1;
                } else if (playerCount <= 13) {
                    sRoles.vampire = 2; sRoles.shaman = 1;
                    sRoles.doctor = 1; sRoles.seer = 1; sRoles.aura = 1; sRoles.hunter = 1;
                    sRoles.serial_killer = 1;
                } else if (playerCount <= 16) {
                    sRoles.vampire = 2; sRoles.vampire_lord = 1; sRoles.shaman = 1;
                    sRoles.doctor = 1; sRoles.seer = 1; sRoles.aura = 1; sRoles.hunter = 1; sRoles.detective = 1;
                    sRoles.serial_killer = 1; sRoles.jester = 1;
                } else {
                    sRoles.vampire = 3; sRoles.vampire_lord = 1; sRoles.shaman = 1; sRoles.sorcerer = 1;
                    sRoles.doctor = 1; sRoles.seer = 1; sRoles.aura = 1; sRoles.hunter = 1; sRoles.detective = 1; sRoles.scout = 1;
                    sRoles.serial_killer = 1; sRoles.arsonist = 1;
                }
                game.markModified("settings");
                await game.save();
            }
            const s = game.settings.roles;
            // Dinamik: Roles.js içinde setup tanımı olan tüm roller
            let totalSpecialRoles = 0;
            const roleQueue = [];
            for (const [roleId, r] of Object.entries(SetupHelper.Roles)) {
                if (!r.setup) continue;
                const count = s[r.setup.key] ?? r.setup.default ?? 0;
                if (r.setup.mode === "count") {
                    totalSpecialRoles += count;
                    for (let i = 0; i < count; i++) roleQueue.push(roleId);
                } else if (r.setup.mode === "toggle") {
                    if (count > 0) { totalSpecialRoles += 1; roleQueue.push(roleId); }
                }
            }

            if (totalSpecialRoles > playerCount) return replySafe(interaction, `Yetersiz oyuncu sayısı! Özel roller (${totalSpecialRoles}) oyuncu sayısından (${playerCount}) fazla.`);

            // DM Check
            const failedDMs = [];
            const failedDMsIDs = new Set();
            const playerIds = game.players.filter(p => !p.isBot).map(p => p.id);
            const fetchedMembers = await interaction.guild.members.fetch({ user: playerIds }).catch(() => new Map());

            for (const p of game.players) {
                if (p.isBot) continue;
                const member = fetchedMembers.get(p.id);
                if (!member) { failedDMs.push(`<@${p.id}> (Sunucuda Yok)`); failedDMsIDs.add(p.id); continue; }
                
                let dmSuccess = false;
                try {
                    await member.send("🧛 **Vampir-Köylü**: Oyun hazırlanıyor...");
                    dmSuccess = true;
                } catch (err) {
                    if (err.code === 50007) {
                        try {
                            const dmCh = await member.user.createDM();
                            await dmCh.send("🧛 **Vampir-Köylü**: Oyun hazırlanıyor...");
                            dmSuccess = true;
                        } catch (e) {
                            dmSuccess = false;
                        }
                    } else {
                        // Rate limit or network hiccup, retry once
                        try {
                            await new Promise(r => setTimeout(r, 250));
                            await member.send("🧛 **Vampir-Köylü**: Oyun hazırlanıyor...");
                            dmSuccess = true;
                        } catch (e2) {
                            dmSuccess = e2.code !== 50007; // Do not fail player if error is not 50007
                        }
                    }
                }

                if (!dmSuccess) {
                    failedDMs.push(member.toString());
                    failedDMsIDs.add(p.id);
                }
            }

            if (failedDMs.length > 0) {
                interaction.channel.send(`⚠️ **UYARI:** Aşağıdaki oyuncuların DM kutusu kapalı olduğu için oyun içi mesajları göremeyecekler! Bu yüzden onlara otomatik olarak **Köylü** rolü atandı:\n${failedDMs.join(", ")}\n\nOyun başlatılıyor...`).catch(() => {});
            }

            // Assign "KOYLU" immediately to failed DM players so they bypass distribution
            if (!game.settings.testMode) {
                for (let i = 0; i < game.players.length; i++) {
                    if (failedDMsIDs.has(game.players[i].id)) {
                        game.players[i].role = "KOYLU";
                    }
                }
            }

            let fixedRoles = roleQueue.filter(r => !SetupHelper.Roles[r].isVirtual);
            let virtualRoles = roleQueue.filter(r => SetupHelper.Roles[r].isVirtual);

            const preAssigned = game.players.filter(p => p.role && p.role !== "RANDOM").map(p => p.role);

            const availableGood = Object.keys(SetupHelper.Roles).filter(k => SetupHelper.Roles[k].side === "GOOD" && !SetupHelper.Roles[k].isVirtual && k !== "KOYLU");
            const availableBad = Object.keys(SetupHelper.Roles).filter(k => SetupHelper.Roles[k].side === "BAD" && !SetupHelper.Roles[k].isVirtual && k !== "CIRAK_KURT");
            const availableNeutral = Object.keys(SetupHelper.Roles).filter(k => SetupHelper.Roles[k].side === "NEUTRAL" && !SetupHelper.Roles[k].isVirtual);
            const availableAny = [...availableGood, ...availableBad, ...availableNeutral];

            let usedSpecialRoles = new Set();
            for (const r of [...fixedRoles, ...preAssigned]) {
                if (r !== "KOYLU" && r !== "VAMPIR") usedSpecialRoles.add(r);
            }

            const resolvedRoles = [];
            for (const vr of virtualRoles) {
                let pool = [];
                if (vr === "R_GOOD") pool = availableGood.filter(r => !usedSpecialRoles.has(r));
                else if (vr === "R_BAD") pool = availableBad.filter(r => !usedSpecialRoles.has(r));
                else if (vr === "R_NEUTRAL") pool = availableNeutral.filter(r => !usedSpecialRoles.has(r));
                else if (vr === "R_ANY") pool = availableAny.filter(r => !usedSpecialRoles.has(r));

                if (pool.length > 0) {
                    const chosen = pool[Math.floor(Math.random() * pool.length)];
                    resolvedRoles.push(chosen);
                    usedSpecialRoles.add(chosen);
                } else {
                    if (vr === "R_BAD") resolvedRoles.push("VAMPIR");
                    else resolvedRoles.push("KOYLU");
                }
            }

            let rolesToDistribute = [...fixedRoles, ...resolvedRoles];
            const villagerCount = Math.max(0, playerCount - rolesToDistribute.length);
            for (let i = 0; i < villagerCount; i++) rolesToDistribute.push("KOYLU");

            for (const pr of preAssigned) {
                const rIndex = rolesToDistribute.indexOf(pr);
                if (rIndex > -1) {
                    rolesToDistribute.splice(rIndex, 1);
                }
            }

            rolesToDistribute = rolesToDistribute.sort(() => Math.random() - 0.5);

            const nameList = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Veli", "Hasan", "Hüseyin", "Zeynep", "Elif", "Mustafa", "Cemal", "Kemal", "Aslı", "Can", "Mert", "Burak", "Eda", "Seda", "Selim", "Sinan", "Okan", "Ozan", "Cenk", "Berk", "Alp", "Kaan", "Defne", "Cemre", "Efe", "Ege", "Kuzey", "Güney", "Doğu", "Batı", "Demir", "Çelik"].sort(() => Math.random() - 0.5);

            const RolesLib = require("../../Commands/Prefix/Fun/Game/Roles");
            const vampires = [];
            for (let i = 0; i < game.players.length; i++) {
                if (!game.players[i].role || game.players[i].role === "RANDOM") {
                    game.players[i].role = rolesToDistribute.shift() || "KOYLU";
                }
                
                let cleanName = null;
                const member = fetchedMembers.get(game.players[i].id);
                if (member) {
                    const rawName = member.nickname || member.user.displayName || member.user.username;
                    // Şekilli harfleri normale çevir
                    let normalized = rawName.normalize("NFKC");
                    
                    // Sadece harf, rakam ve boşlukları bırak
                    let stripped = normalized.replace(/[^\w\sçğıöşüÇĞIİÖŞÜ]/gi, '').trim();
                    
                    // Sadece rakamlardan oluşuyorsa (örneğin "242424") geçersiz say
                    if (/^\d+$/.test(stripped.replace(/\s+/g, ''))) {
                        stripped = "";
                    }
                    
                    if (stripped.length >= 3) {
                        cleanName = stripped.substring(0, 20);
                    }
                }
                
                game.players[i].fakeName = cleanName || ("Köylü " + (nameList.pop() || `X${i}`));
                
                if (["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(game.players[i].role)) vampires.push(game.players[i].id);
            }

            // CELLAT Hedef Ataması
            const goodPlayers = game.players.filter(p => RolesLib[p.role]?.side === "GOOD");
            for (let i = 0; i < game.players.length; i++) {
                if (game.players[i].role === "CELLAT") {
                    if (goodPlayers.length > 0) {
                        const target = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
                        game.players[i].cellatTarget = target.id;
                    } else {
                        const others = game.players.filter(p => p.id !== game.players[i].id);
                        if (others.length > 0) {
                            const target = others[Math.floor(Math.random() * others.length)];
                            game.players[i].cellatTarget = target.id;
                        }
                    }
                }
            }

            game.phase = "MAYOR_ELECTION";
            game.dayCount = 1;
            await game.save();

            if (game.voiceChannelID) {
                const voiceChannel = interaction.guild.channels.cache.get(game.voiceChannelID);
                if (voiceChannel) {
                    for (const [, member] of voiceChannel.members) {
                        if (member.user.bot) continue;
                        const isPlayer = game.players.some(p => p.id === member.id);
                        if (isPlayer) {
                            if (member.voice.serverMute) await member.voice.setMute(false).catch(e => console.error(e));
                        } else {
                            if (!member.voice.serverMute) await member.voice.setMute(true).catch(e => console.error(e));
                        }
                    }
                }
            }

            const fetchedMembersForDMs = await interaction.guild.members.fetch({ user: playerIds }).catch(() => new Map());
            for (const p of game.players) {
                if (p.isBot) continue;
                const member = fetchedMembersForDMs.get(p.id);
                if (member) {
                    const Roles = require("../../Commands/Prefix/Fun/Game/Roles");
                    
                    // Save original name and change nickname
                    p.originalName = member.nickname || null;
                    if (member.manageable) await member.setNickname(p.fakeName).catch(e => console.error(e));
                    
                    // DELI: Assign a fake role and show that instead
                    if (p.role === "DELI") {
                        const fakeRoleOptions = ["GOZCU", "DOKTOR", "AURA", "DEDEKTIF"];
                        const chosenFake = fakeRoleOptions[Math.floor(Math.random() * fakeRoleOptions.length)];
                        p.fakeRole = chosenFake;
                        const fakeInfo = Roles[chosenFake] || { name: chosenFake, description: "Bilinmeyen rol." };
                        
                        const v2Payload = [
                            {
                                type: 17,
                                components: [
                                    { type: 10, content: `> **🎭 Rolün: ${fakeInfo.name} ${fakeInfo.emoji || ""}**` },
                                    { type: 14, divider: true },
                                    { type: 10, content: `**Oyundaki Adın:** ${p.fakeName}\n\n${fakeInfo.description}` }
                                ]
                            }
                        ];
                        const { MessageFlags } = require("discord.js");
                        await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
                        continue;
                    }
                    
                    const roleInfo = Roles[p.role] || { name: p.role, description: "Bilinmeyen rol." };
                    
                    let desc = `**Oyundaki Adın:** ${p.fakeName}\n\n`;
                    if (["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(p.role)) {
                        desc += `**Takım Arkadaşların (Kötüler):** ${vampires.filter(v => v !== p.id).map(v => (v.startsWith("ai_") ? `🤖 AI (${v.split("_")[2]})` : `<@${v}>`)).join(", ") || "Yok"}\n\n${roleInfo.description}`;
                    } else if (p.role === "CELLAT" && p.cellatTarget) {
                        const targetPlayer = game.players.find(t => t.id === p.cellatTarget);
                        const targetName = targetPlayer ? targetPlayer.fakeName : "Bilinmeyen";
                        desc += `**🪓 HEDEFİN:** ${targetName} (<@${p.cellatTarget}>)\nBu kişiyi gündüz oylamasında astırmaya çalış!\n\n${roleInfo.description}`;
                    } else {
                        desc += roleInfo.description;
                    }

                    const v2Payload = [
                        {
                            type: 17,
                            components: [
                                { type: 10, content: `> **🎭 Rolün: ${roleInfo.name} ${roleInfo.emoji || ""}**` },
                                { type: 14, divider: true },
                                { type: 10, content: desc }
                            ]
                        }
                    ];

                    const { MessageFlags } = require("discord.js");
                    await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
                }
            }
            
            // Save fakeRole assignments
            await game.save();

            if (interaction.message) await interaction.message.delete().catch(e => console.error(e));
            sendV2(interaction.channel, `> 🌑 **Oyun Başladı!**\nRolleriniz DM üzerinden gönderildi. Şimdi **Muhtar Seçimi** yapılacak!`);

            // TTS: Oyun Başladı & Muhtar Seçimi
            if (game.voiceChannelID) {
                const voiceChannel = interaction.client.channels.cache.get(game.voiceChannelID);
                if (voiceChannel) {
                    const VoiceManager = require('../../Utils/VampireVoiceManager');
                    
                    const ttsMode = game.settings.ttsRoleMode || 1;
                    let ttsText = `Vampir Köylü oyunu başlatıldı! `;

                    if (ttsMode === 1) {
                        // Taraf modu (Örn: 8 İyi, 2 Kötü, 1 Tarafsız)
                        const RolesLib = require("../../Commands/Prefix/Fun/Game/Roles");
                        let goodCount = 0, badCount = 0, neutralCount = 0;
                        game.players.forEach(p => {
                            const r = p.role === "RANDOM" ? "KOYLU" : p.role;
                            const side = RolesLib[r] ? RolesLib[r].side : "GOOD";
                            if (side === "GOOD") goodCount++;
                            else if (side === "BAD") badCount++;
                            else neutralCount++;
                        });
                        
                        let sideTexts = [];
                        if (goodCount > 0) sideTexts.push(`${goodCount} İyi`);
                        if (badCount > 0) sideTexts.push(`${badCount} Kötü`);
                        if (neutralCount > 0) sideTexts.push(`${neutralCount} Tarafsız`);
                        
                        ttsText += `Kasabamızda ${sideTexts.join(", ")} rol var. `;
                    } else if (ttsMode === 2) {
                        // Tam Liste Modu (Örn: 1 Doktor, 2 Köylü)
                        const roleCounts = {};
                        game.players.forEach(p => {
                            const r = p.role === "RANDOM" ? "KOYLU" : p.role;
                            roleCounts[r] = (roleCounts[r] || 0) + 1;
                        });
                        
                        const RolesLib = require("../../Commands/Prefix/Fun/Game/Roles");
                        const roleTexts = Object.entries(roleCounts).map(([rKey, count]) => {
                            const rName = RolesLib[rKey] ? RolesLib[rKey].name : rKey;
                            return `${count} ${rName}`;
                        }).join(", ");
                        
                        ttsText += `Kasabamızda şu roller var: ${roleTexts}. `;
                    } else {
                        // Kapalı Mod (Söyleme)
                        ttsText += ``;
                    }
                    
                    ttsText += `Herkese rolleri özel mesaj olarak gönderildi. İlk işimiz muhtar seçmek. Muhtarın oyları 2 puan sayılır. Lütfen muhtar adayınızı oylayın.`;
                    
                    VoiceManager.speak(voiceChannel, ttsText, "start.wav");
                }
            }
            
            // Oyun Başlangıç Mesajı Güncellemesi
            const { EmbedBuilder } = require("discord.js");
            const startEmbed = new EmbedBuilder()
                .setTitle("🌑 Oyun Başladı!")
                .setDescription("Rolleriniz DM üzerinden gönderildi. Şimdi Muhtar Seçimi yapılacak!\n*(Sesli asistanın kuralları anlatması bekleniyor, lütfen kısa bir süre bekleyin...)*")
                .setColor("#2b2d31")
                .setImage("attachment://vampire_banner.gif");
            
            await interaction.message.edit({ embeds: [startEmbed], components: [] }).catch(e => console.error(e));

            // TTS'in konuşmasını bitirmesi için 25 saniye bekle
            setTimeout(() => {
                require("../../Commands/Prefix/Fun/Game/VampireDayHandler").startMayorElection(client, game);
            }, 25000);
            
            return;
        }

        if (interaction.customId === "vk_v2_settings") {
            return replySafe(interaction, "Ayarları değiştirmek için kurulum ekranındaki butonları kullanın.");
        }

        // --- NEW: ROLE SELECT MENU (Opens Modal) ---
        if (interaction.customId === "vk_setup_role_select") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Aktif kurulum ekranı bulunamadı.");
            if (game.hostID !== interaction.user.id) return replySafe(interaction, "Sadece kurucu ayar yapabilir.");

            const selectedKeys = interaction.values.slice(0, 5); // up to 5
            const Roles = require("../../Commands/Prefix/Fun/Game/Roles");
            const SetupHelper = require("../../Commands/Prefix/Fun/Game/VampireSetupHelper");
            
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
            const modal = new ModalBuilder()
                .setCustomId("vk_role_modal_MULTI")
                .setTitle("🎭 Rol Ayarları (Toplu)");

            for (const roleKey of selectedKeys) {
                const roleDef = Object.values(Roles).find(r => r.setup && r.setup.key === roleKey);
                if (!roleDef) continue;
                
                const currentCount = SetupHelper.roleCount(game.settings, roleDef.setup);
                
                const countInput = new TextInputBuilder()
                    .setCustomId(`role_count_${roleKey}`)
                    .setLabel(roleDef.setup.mode === "toggle" ? `${roleDef.name} (Aç:1, Kapat:0)` : `${roleDef.name} (Min:${roleDef.setup.min ?? 0}, Max:${roleDef.setup.max ?? 10})`)
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("0 = Kapalı")
                    .setValue(String(currentCount))
                    .setRequired(true)
                    .setMaxLength(2);
                    
                modal.addComponents(new ActionRowBuilder().addComponents(countInput));
            }

            return await interaction.showModal(modal);
        }

        // --- NEW: ROLE MODAL SUBMIT ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith("vk_role_modal_")) {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Aktif kurulum ekranı bulunamadı.");

            const Roles = require("../../Commands/Prefix/Fun/Game/Roles");
            if (!game.settings.roles) game.settings.roles = {};

            interaction.fields.components.forEach(actionRow => {
                const textInput = actionRow.components[0];
                const customId = textInput.customId; // role_count_VAMPIR
                if (customId.startsWith("role_count_")) {
                    const roleKey = customId.replace("role_count_", "");
                    const roleDef = Object.values(Roles).find(r => r.setup && r.setup.key === roleKey);
                    if (roleDef) {
                        let val = parseInt(textInput.value, 10);
                        if (isNaN(val)) val = roleDef.setup.default || 0;
                        
                        if (roleDef.setup.mode === "toggle") {
                            val = val > 0 ? 1 : 0;
                        } else {
                            const min = roleDef.setup.min ?? 0;
                            const max = roleDef.setup.max ?? 10;
                            val = Math.min(max, Math.max(min, val));
                        }

                        game.settings.roles[roleKey] = val;
                    }
                }
            });

            game.markModified("settings");
            await game.save();

            await updateLobbyEmbed(interaction, game);
            return interaction.deferUpdate().catch(e => console.error(e));
        }

        // --- NEW: DURATION MODAL BUTTON ---
        if (interaction.customId === "vk_modal_durations") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Aktif kurulum ekranı bulunamadı.");
            if (game.hostID !== interaction.user.id) return replySafe(interaction, "Sadece kurucu ayar yapabilir.");

            const { ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
            const modal = new ModalBuilder()
                .setCustomId("vk_durations_modal")
                .setTitle("⏱️ Süre Ayarları");

            const nightInput = new TextInputBuilder()
                .setCustomId("night_dur")
                .setLabel("🌙 Gece Süresi (saniye)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Örn: 90")
                .setValue(String(game.settings.nightDuration ?? 90))
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(3);

            const diskInput = new TextInputBuilder()
                .setCustomId("disk_dur")
                .setLabel("🗣️ Tartışma Süresi (saniye)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Örn: 60")
                .setValue(String(game.settings.discussionDuration ?? 60))
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(3);

            const voteInput = new TextInputBuilder()
                .setCustomId("vote_dur")
                .setLabel("🗳️ Oylama Süresi (saniye)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Örn: 90")
                .setValue(String(game.settings.voteDuration ?? 90))
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(3);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nightInput),
                new ActionRowBuilder().addComponents(diskInput),
                new ActionRowBuilder().addComponents(voteInput)
            );
            return await interaction.showModal(modal);
        }

        // --- NEW: DURATION MODAL SUBMIT ---
        if (interaction.isModalSubmit() && interaction.customId === "vk_durations_modal") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Aktif kurulum ekranı bulunamadı.");

            const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
            const nightVal = parseInt(interaction.fields.getTextInputValue("night_dur")) || 90;
            const diskVal = parseInt(interaction.fields.getTextInputValue("disk_dur")) || 60;
            const voteVal = parseInt(interaction.fields.getTextInputValue("vote_dur")) || 90;

            game.settings.nightDuration = clamp(nightVal, 15, 600);
            game.settings.discussionDuration = clamp(diskVal, 15, 600);
            game.settings.voteDuration = clamp(voteVal, 15, 600);
            game.markModified("settings");
            await game.save();

            await updateLobbyEmbed(interaction, game);
            return interaction.deferUpdate().catch(e => console.error(e));
        }

        // --- NEW: GENERAL TOGGLE BUTTONS ---
        if (interaction.customId.startsWith("vk_gen_toggle_")) {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Aktif kurulum ekranı bulunamadı.");
            if (game.hostID !== interaction.user.id) return replySafe(interaction, "Sadece kurucu ayar yapabilir.");

            const key = interaction.customId.replace("vk_gen_toggle_", "");
            const SetupHelper = require("../../Commands/Prefix/Fun/Game/VampireSetupHelper");
            SetupHelper.applySetting(game, `toggle_${key}`);
            await game.save();

            await updateLobbyEmbed(interaction, game);
            return interaction.deferUpdate().catch(e => console.error(e));
        }

        // --- LOBBY: TOGGLE JOIN ---
        if (interaction.customId === "vk_toggle_join") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "LOBBY" });
            if (!game) return replySafe(interaction, "Aktif bir lobi bulunamadı.");

            if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== game.voiceChannelID)
                return replySafe(interaction, "Oyuna katılmak için oyunun kurulduğu ses kanalında olmalısın!");

            const inGame = game.players.some(p => p.id === interaction.user.id);

            if (inGame) {
                if (game.hostID === interaction.user.id) return replySafe(interaction, "Oyun kurucusu ayrılamaz. İptal etmek için İptal butonunu kullanın.");
                
                const updatedGame = await VampireGame.findOneAndUpdate(
                    { _id: game._id, "players.id": interaction.user.id },
                    { $pull: { players: { id: interaction.user.id } } },
                    { new: true }
                );
                await updateLobbyEmbed(interaction, updatedGame);
                return interaction.deferUpdate().catch(e => console.error(e));
            } else {
                const updatedGame = await VampireGame.findOneAndUpdate(
                    { _id: game._id, "players.id": { $ne: interaction.user.id } },
                    { $push: { players: { id: interaction.user.id, role: null, isAlive: true } } },
                    { new: true }
                );
                await updateLobbyEmbed(interaction, updatedGame);
                return interaction.deferUpdate().catch(e => console.error(e));
            }
        }

        if (interaction.customId === "vk_refresh") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true });
            if (!game) return replySafe(interaction, "Oyun bulunamadı.");
            updateLobbyEmbed(interaction, game);
            return interaction.deferUpdate().catch(() => { });
        }


        // --- SETTINGS (Legacy select menus - backward compat) ---
        if (interaction.customId === "vk_settings_select" || interaction.customId === "vk_settings_roles" || interaction.customId === "vk_settings_durations" || interaction.customId === "vk_settings_general") {
            const game = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true, phase: "SETUP" });
            if (!game) return replySafe(interaction, "Aktif kurulum ekranı bulunamadı.");
            if (game.hostID !== interaction.user.id) return replySafe(interaction, "Sadece kurucu ayar yapabilir.");

            const val = interaction.values[0];
            const SetupHelper = require("../../Commands/Prefix/Fun/Game/VampireSetupHelper");
            SetupHelper.applySetting(game, val);
            await game.save();

            await updateLobbyEmbed(interaction, game);
            return interaction.deferUpdate().catch(() => { });
        }

        // --- VAMPIRE NOTE MODAL ---
        if (interaction.customId === "vk_note_btn") {
            const { ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
            const modal = new ModalBuilder()
                .setCustomId("vk_note_modal")
                .setTitle("Vampir Notu");

            const noteInput = new TextInputBuilder()
                .setCustomId("note_text")
                .setLabel("Sabah paylaşılacak notu yazın")
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(200)
                .setPlaceholder("Örn: Kasabanın sonu yakın...")
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
            return await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId === "vk_note_modal") {
            const note = interaction.fields.getTextInputValue("note_text");
            const game = await VampireGame.findOneAndUpdate(
                { "players.id": interaction.user.id, isActive: true, phase: "NIGHT" },
                { $set: { vampireNote: note } },
                { new: true }
            );

            if (!game) return replySafe(interaction, "Oyun bulunamadı veya gece turu bitti.");
            return replySafe(interaction, "Notunuz kaydedildi. Sabah olunca paylaşılacak.");
        }

        // --- NIGHT ACTIONS (DM) ---
        if (interaction.customId.startsWith("vk_act_")) {
            try {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
            } catch (e) { return; }

            const game = await VampireGame.findOne({ "players.id": interaction.user.id, isActive: true, phase: "NIGHT" });
            if (!game) return replySafe(interaction, "Şu an aktif bir gece turunda değilsiniz veya zaman doldu.");

            const player = game.players.find(p => p.id === interaction.user.id);
            if (!player || !player.isAlive) return replySafe(interaction, "Ölüler işlem yapamaz.");

            const actionTypeRaw = interaction.customId.replace("vk_act_", "");
            let actionType = actionTypeRaw;
            
            if (actionTypeRaw === "alfa_kill" || actionTypeRaw === "alfa_convert") {
                actionType = "alfa";
            }
            
            // Seri Katil için targetID bir array olabilir (values), diğerleri için ilk elemandır.
            const targetIDs = interaction.values;
            const targetID = targetIDs[0]; // Çoğu rol için tek hedef

            // Rol kontrolü
            const isDeli = player.role === "DELI";
            if (actionType === "kill" && player.role !== "VAMPIR") return replySafe(interaction, "Sen vampir değilsin!");
            if (actionType === "protect" && player.role !== "DOKTOR" && !isDeli) return replySafe(interaction, "Sen doktor değilsin!");
            if (actionType === "see" && player.role !== "GOZCU" && !isDeli) return replySafe(interaction, "Sen gözcü değilsin!");
            if (actionType === "shoot" && player.role !== "AVCI" && !isDeli) return replySafe(interaction, "Sen avcı değilsin!");
            if (actionType === "aura" && player.role !== "AURA" && !isDeli) return replySafe(interaction, "Sen aura değilsin!");
            if (actionType === "bomb" && player.role !== "BOMBACI") return replySafe(interaction, "Sen bombacı değilsin!");
            if (actionType === "serial" && player.role !== "SERI_KATIL") return replySafe(interaction, "Sen seri katil değilsin!");
            if (actionType === "alfa" && player.role !== "ALFA_KURT") return replySafe(interaction, "Sen alfa kurt değilsin!");
            if (actionType === "detective" && player.role !== "DEDEKTIF" && !isDeli) return replySafe(interaction, "Sen dedektif değilsin!");
            if (actionType === "scout" && player.role !== "IZCI" && !isDeli) return replySafe(interaction, "Sen izci değilsin!");
            if (actionType === "trap" && player.role !== "TUZAKCI") return replySafe(interaction, "Sen tuzakçı değilsin!");
            if (actionType === "investigate" && player.role !== "DELI") return replySafe(interaction, "Araştırma yapamazsın!");
            if (actionType === "silence" && player.role !== "CIRAK_KURT") return replySafe(interaction, "Sen çırak kurt değilsin!");
            if (actionType === "revive" && player.role !== "MEDYUM") return replySafe(interaction, "Sen medyum değilsin!");
            if (actionType === "arsonist" && player.role !== "KUNDAKCI") return replySafe(interaction, "Sen kundakçı değilsin!");
            if (actionType === "saman" && player.role !== "SAMAN") return replySafe(interaction, "Sen şaman değilsin!");
            if (actionType === "buyucu" && player.role !== "BUYUCU") return replySafe(interaction, "Sen büyücü değilsin!");
            if (actionType === "lord" && player.role !== "VAMPIR_LORDU") return replySafe(interaction, "Sen vampir lordu değilsin!");

            const pIndex = game.players.findIndex(p => p.id === interaction.user.id);

            // Aksiyonu kaydetme mantığı rol bazlı farklılaşabilir
            if (actionType === "serial") {
                if (targetID !== "skip") {
                    for (const tid of targetIDs) {
                        const targetPlayer = game.players.find(p => p.id === tid);
                        if (!targetPlayer || !targetPlayer.isAlive) return replySafe(interaction, "Seçtiğin hedeflerden biri ölü.");
                    }
                }
                game.players[pIndex].actions = { type: "SERIAL_KILL", targets: targetIDs };
                const format = targetID === "skip" ? "Pas" : targetIDs.length + " kişi";
                await replySafe(interaction, `Seçim alındı: ${format} üzerinde işlem yapılacak.`);
            } else if (actionType === "alfa") {
                let aType = "SKIP";
                let aTarget = "skip";
                if (targetID !== "skip") {
                    const parts = targetID.split("_"); // kill_123 veya convert_123
                    if (parts[0] === "kill") {
                        aType = "KILL";
                        aTarget = parts.slice(1).join("_");
                    } else if (parts[0] === "convert") {
                        aType = "CONVERT";
                        aTarget = parts.slice(1).join("_");
                    }
                    const targetPlayer = game.players.find(p => p.id === aTarget);
                    if (!targetPlayer || !targetPlayer.isAlive) return replySafe(interaction, "Hedef diri bir oyuncu olmalı.");
                }
                game.players[pIndex].actions = { type: aType, target: aTarget };
                const format = targetID === "skip" ? "Pas" : (aTarget.startsWith("ai_") ? `🤖 AI (${aTarget.split("_")[2]})` : `<@${aTarget}>`);
                await replySafe(interaction, `Seçim alındı: ${format} üzerinde işlem yapılacak (${aType}).`);
            } else if (actionType === "arsonist") {
                let aType = "SKIP";
                let aTarget = "skip";
                if (targetID === "ignite") {
                    aType = "IGNITE";
                } else if (targetID !== "skip") {
                    const parts = targetID.split("_"); // douse_123
                    if (parts[0] === "douse") {
                        aType = "DOUSE";
                        aTarget = parts.slice(1).join("_");
                    }
                    const targetPlayer = game.players.find(p => p.id === aTarget);
                    if (!targetPlayer || !targetPlayer.isAlive) return replySafe(interaction, "Hedef diri bir oyuncu olmalı.");
                }
                game.players[pIndex].actions = { type: aType, target: aTarget };
                const format = targetID === "skip" ? "Pas" : (aType === "IGNITE" ? "Ateşle (Herkesi Yak)" : (aTarget.startsWith("ai_") ? `🤖 AI (${aTarget.split("_")[2]})` : `<@${aTarget}>`));
                await replySafe(interaction, `Seçim alındı: ${format} üzerinde işlem yapılacak.`);
            } else {
                // Standart 1 hedefli roller
                if (targetID !== "skip") {
                    const targetPlayer = game.players.find(p => p.id === targetID);
                    if (actionType === "revive") {
                        if (!targetPlayer || targetPlayer.isAlive) return replySafe(interaction, "Hedef ölü bir oyuncu olmalı.");
                    } else {
                        if (!targetPlayer || !targetPlayer.isAlive) return replySafe(interaction, "Hedef diri bir oyuncu olmalı.");
                    }
                }

                // Doktor kendini korusun mu? (toggle)
                if (actionType === "protect" && targetID === player.id && !game.settings.doctorSelfProtect)
                    return replySafe(interaction, "Kendini koruyamazsın (Ayar kapalı).");

                // Doktor: aynı kişiyi art arda koruyamaz (lastProtectedTarget)
                if (actionType === "protect" && targetID !== "skip") {
                    if (player.lastProtectedTarget === targetID)
                        return replySafe(interaction, "Bu oyuncuyu dün gece korudun. Üst üste koruyamazsın.");
                }

                let finalActionType = actionType.toUpperCase();
                if (actionType === "detective") finalActionType = "DETECT";
                if (actionType === "investigate") finalActionType = "INVESTIGATE";
                if (actionType === "saman") finalActionType = "FRAME";
                if (actionType === "buyucu") finalActionType = "BLOCK";
                if (actionType === "lord") finalActionType = "KILL";
                if (isDeli) finalActionType = "INVESTIGATE";

                game.players[pIndex].actions = { type: finalActionType, target: targetID };
                const targetFormat = targetID === "skip" ? "Pas" : (targetID.startsWith("ai_") ? `🤖 AI (${targetID.split("_")[2]})` : `<@${targetID}>`);
                await replySafe(interaction, `Seçim alındı: ${targetFormat} üzerinde işlem yapılacak.`);
            }

            // ATOMIC UPDATE to avoid VersionError when multiple players act concurrently
            await VampireGame.updateOne(
                { _id: game._id, "players.id": interaction.user.id },
                { $set: { "players.$.actions": game.players[pIndex].actions } }
            );

            // Fetch the freshly updated game state for logic that requires all players' actions
            const freshGame = await VampireGame.findById(game._id);

            // VAMPIRE COORDINATION
            if (actionType === "kill" && player.role === "VAMPIR" && targetID !== "skip") {
                notifyOtherVampires(freshGame, interaction.user.id, targetID);
            }

            checkNightEnd(client, freshGame);
        }

        // --- MAYOR ELECTION VOTING ---
        if (interaction.customId === "vk_mayor_vote_menu" && interaction.isStringSelectMenu()) {
            try {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
            } catch (e) { return; }

            const targetID = interaction.values[0];

            const game = await VampireGame.findOneAndUpdate(
                {
                    guildID: interaction.guild.id,
                    channelID: interaction.channel.id,
                    isActive: true,
                    phase: "MAYOR_ELECTION",
                    "players": {
                        $elemMatch: {
                            id: interaction.user.id,
                            isAlive: true
                        }
                    }
                },
                { $set: { "players.$.votedFor": targetID } },
                { new: true }
            );

            if (!game) return replySafe(interaction, "Oylama süresi dolmuş veya ölüsün.");
            
            const targetFormat = targetID.startsWith("ai_") ? `🤖 AI (${targetID.split("_")[2]})` : `<@${targetID}>`;
            await interaction.editReply({ components: [{ type: 17, components: [{ type: 10, content: `🎩 Muhtar adayı olarak **${targetFormat}** kişisine oy verdin!` }] }], flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));

            // --- LIVE VOTE UPDATE (MAYOR) ---
            if (game.votingMessageID) {
                const channel = client.channels.cache.get(game.channelID);
                if (channel) {
                    const msg = await channel.messages.fetch(game.votingMessageID).catch(() => null);
                    if (msg && msg.components && msg.components.length > 0) {
                        const alivePlayers = game.players.filter(p => p.isAlive);
                        const votes = {};
                        let totalVotes = 0;

                        for (const p of alivePlayers) {
                            if (p.votedFor) {
                                const weight = (p.role === "KOY_MUHTARI") ? 2 : 1;
                                votes[p.votedFor] = (votes[p.votedFor] || 0) + weight;
                                totalVotes++;
                            }
                        }

                        const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
                        const statusText = sortedVotes.map(([target, count]) => {
                            const name = target.startsWith("ai_") ? `🤖 AI (${target.split("_")[2]})` : `<@${target}>`;
                            return `${name}: **${count}** oy`;
                        }).join("\n") || "Henüz oy kullanılmadı.";

                        const originalContainer = msg.components[0]?.toJSON ? msg.components[0].toJSON() : msg.components[0];
                        const inner = originalContainer.components || [];

                        let newInner = [];
                        let statusAdded = false;
                        for (const c of inner) {
                            if (c.type === 10 && c.content && c.content.includes("Canlı Muhtar Oylaması")) {
                                newInner.push({ type: 10, content: `🎩 **Canlı Muhtar Oylaması Durumu**\n${statusText}\n\nOy Kullanan: ${totalVotes}/${alivePlayers.length}` });
                                statusAdded = true;
                            } else {
                                newInner.push(c);
                            }
                        }
                        if (!statusAdded) {
                            newInner.push({ type: 14, divider: true });
                            newInner.push({ type: 10, content: `🎩 **Canlı Muhtar Oylaması Durumu**\n${statusText}\n\nOy Kullanan: ${totalVotes}/${alivePlayers.length}` });
                        }

                        const newPayload = [{ type: 17, components: newInner, accent_color: originalContainer.accent_color }];
                        await msg.edit({ components: newPayload, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
                    }
                }
            }

            // Check if everyone voted
            const alivePlayers = game.players.filter(p => p.isAlive);
            const votedCount = alivePlayers.filter(p => p.votedFor).length;

            if (votedCount >= alivePlayers.length) {
                const DayHandler = require("../../Commands/Prefix/Fun/Game/VampireDayHandler");
                DayHandler.processMayorElection(client, game);
            }

            return;
        }

        // --- MAYOR HEIR SELECTION ---
        if (interaction.customId === "vk_mayor_heir_select" && interaction.isStringSelectMenu()) {
            try {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
            } catch (e) { return; }

            const targetID = interaction.values[0];

            const game = await VampireGame.findOne({ phase: "MAYOR_INHERITANCE" });
            if (!game) return replySafe(interaction, "Varis seçme süresi dolmuş veya oyun bulunamadı.");

            // Check if the user is actually the dead mayor
            if (game.mayorID !== interaction.user.id) {
                return replySafe(interaction, "Sen eski muhtar değilsin!");
            }

            // Verify the target is alive
            const targetPlayer = game.players.find(p => p.id === targetID);
            if (!targetPlayer || !targetPlayer.isAlive) {
                return replySafe(interaction, "Seçtiğin kişi hayatta değil!");
            }

            game.mayorID = targetID;
            await game.save();

            const targetFormat = targetID.startsWith("ai_") ? `🤖 AI (${targetID.split("_")[2]})` : `<@${targetID}>`;
            await interaction.editReply({ components: [{ type: 17, components: [{ type: 10, content: `🎩 Varisin olarak **${targetFormat}** kişisini seçtin! Ruhu şad olsun...` }] }], flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));

            // Announce in channel
            const channel = client.channels.cache.get(game.channelID);
            if (channel) {
                sendV2(channel, `> 🎩 Eski Muhtar ölmeden önce **${targetFormat}** kişisini varis bıraktı! Yeni muhtar o.`);
            }

            // TTS Announcement
            if (game.voiceChannelID) {
                const voiceChannel = client.channels.cache.get(game.voiceChannelID);
                if (voiceChannel) {
                    const cleanName = (targetPlayer.fakeName || "Bir oyuncu").replace(/[^\w\sçğıöşüÇĞIİÖŞÜ]/g, '');
                    const VoiceManager = require('../../Utils/VampireVoiceManager');
                    VoiceManager.speak(voiceChannel, `Eski muhtar son nefesinde yeni muhtar olarak ${cleanName} kişisini seçti! Artık kasabayı o yönetecek.`);
                }
            }

            // Resume game
            require("../../Commands/Prefix/Fun/Game/VampireDayHandler").resumeAfterInheritance(client, game);
            return;
        }

        // --- DAY VOTING ---
        if (interaction.customId === "vk_vote_menu" && interaction.isStringSelectMenu()) {
            try {
                if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
            } catch (e) { return; }

            const targetID = interaction.values[0];

            // Atomic Vote Update (Allowed to change vote)
            const game = await VampireGame.findOneAndUpdate(
                {
                    guildID: interaction.guild.id,
                    channelID: interaction.channel.id,
                    isActive: true,
                    phase: "VOTING",
                    "players": {
                        $elemMatch: {
                            id: interaction.user.id,
                            isAlive: true,
                            // removed check for votedFor: null to allow changing
                        }
                    }
                },
                {
                    $set: { "players.$.votedFor": targetID }
                },
                { new: true }
            );

            if (!game) {
                // Return descriptive error
                const checkGame = await VampireGame.findOne({ guildID: interaction.guild.id, channelID: interaction.channel.id, isActive: true });
                if (!checkGame) return replySafe(interaction, "Oyun bulunamadı.");
                if (checkGame.phase !== "VOTING") return replySafe(interaction, "Oylama aktif değil.");

                const p = checkGame.players.find(x => x.id === interaction.user.id);
                if (!p) return replySafe(interaction, "Oyuncu bulunamadı.");
                if (!p.isAlive) return replySafe(interaction, "Ölüler oy veremez.");
                if (p.votedFor && p.votedFor === targetID) return replySafe(interaction, "Zaten bu kişiye oy verdiniz.");

                return replySafe(interaction, "İşlem gerçekleştirilemedi. Lütfen tekrar deneyin.");
            }

            await replySafe(interaction, `Oyunuzu kullandınız: ${targetID === "skip" ? "Pas" : `<@${targetID}>`}`);

            // --- LIVE VOTE UPDATE (V2) ---
            if (game.votingMessageID) {
                const channel = client.channels.cache.get(game.channelID);
                if (channel) {
                    const msg = await channel.messages.fetch(game.votingMessageID).catch(() => null);
                    if (msg && msg.components && msg.components.length > 0) {
                        const alivePlayers = game.players.filter(p => p.isAlive);
                        const votes = {};
                        let totalVotes = 0;

                        for (const p of alivePlayers) {
                            if (p.votedFor) {
                                const weight = (p.id === game.mayorID || p.role === "KOY_MUHTARI") ? 2 : 1;
                                votes[p.votedFor] = (votes[p.votedFor] || 0) + weight;
                                totalVotes++; // count as 1 person voting
                            }
                        }

                        const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1]);
                        const statusText = sortedVotes.map(([target, count]) => {
                            const name = target === "skip" ? "Pas" : (target.startsWith("ai_") ? `🤖 AI (${target.split("_")[2]})` : `<@${target}>`);
                            return `${name}: **${count}** oy`;
                        }).join("\n") || "Henüz oy kullanılmadı.";

                        // Orijinal V2 container'ını al, text display'ı güncelle/ekle, select menüyü koru
                        const originalContainer = msg.components[0]?.toJSON ? msg.components[0].toJSON() : msg.components[0];
                        const inner = originalContainer.components || [];

                        // Mevcut "durum" text display'ını bul ya da en sona ekle
                        let newInner = [];
                        let statusAdded = false;
                        for (const c of inner) {
                            if (c.type === 10 && c.content && c.content.includes("Canlı Oylama")) {
                                newInner.push({ type: 10, content: `📊 **Canlı Oylama Durumu**\n${statusText}\n\nOy Kullanan: ${totalVotes}/${alivePlayers.length}` });
                                statusAdded = true;
                            } else {
                                newInner.push(c);
                            }
                        }
                        if (!statusAdded) {
                            newInner.push({ type: 14, divider: true });
                            newInner.push({ type: 10, content: `📊 **Canlı Oylama Durumu**\n${statusText}\n\nOy Kullanan: ${totalVotes}/${alivePlayers.length}` });
                        }

                        const newPayload = [{ type: 17, components: newInner, accent_color: originalContainer.accent_color }];
                        await msg.edit({ components: newPayload, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
                    }
                }
            }

            // Check counts
            const alivePlayers = game.players.filter(p => p.isAlive);
            const votedCount = alivePlayers.filter(p => p.votedFor).length;

            if (votedCount >= alivePlayers.length) {
                const DayHandler = require("../../Commands/Prefix/Fun/Game/VampireDayHandler");
                DayHandler.processVoting(client, game);
            }
        }
    } catch (err) {
        console.error("Vampire Listener Error:", err);
    }
};

async function replySafe(interaction, content) {
    const v2Payload = [
        {
            type: 17,
            components: [
                { type: 10, content: content }
            ]
        }
    ];

    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
    } else {
        return interaction.reply({ components: v2Payload, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] }).catch(() => { });
    }
}

// V2: Kanal mesajını Components V2 formatında gönder
async function sendV2(channel, ...parts) {
    if (!channel) return null;
    const components = [];
    for (let i = 0; i < parts.length; i++) {
        if (i > 0) components.push({ type: 14, divider: true, spacing: 1 });
        components.push({ type: 10, content: parts[i] });
    }
    return channel.send({
        components: [{ type: 17, components }],
        flags: [MessageFlags.IsComponentsV2]
    }).catch(() => null);
}

async function updateLobbyEmbed(interaction, game) {
    const buildDashboardPayload = require("../../Commands/Prefix/Fun/VampireKoylu").buildDashboardPayload;
    const v2Payload = buildDashboardPayload(game);

    if (interaction.message) {
        try {
            await client.rest.patch(`/channels/${interaction.channel.id}/messages/${interaction.message.id}`, {
                body: { components: v2Payload }
            });
        } catch(e) { console.error("updateLobbyEmbed V2 Error:", e); }
    }
}

async function notifyOtherVampires(game, actorID, targetID) {
    const otherVampires = game.players.filter(p => p.role === "VAMPIR" && p.id !== actorID && p.isAlive);
    for (const v of otherVampires) {
        if (game.guildID) {
            const guild = client.guilds.cache.get(game.guildID);
            if (guild) {
                const vMember = guild.members.cache.get(v.id) || await guild.members.fetch(v.id).catch(() => { });
                if (vMember) vMember.send(`**Vampir Takımı**: <@${actorID}>, <@${targetID}> kişisini hedefledi!`).catch(() => { });
            }
        }
    }
}

async function checkNightEnd(client, game) {
    // Tüm diri rol-sahipleri action göndermiş mi? AI'lar otomatik simüle edilir.
    const alivePlayers = game.players.filter(p => p.isAlive);
    let allDone = true;

    for (const p of alivePlayers) {
        if (p.role === "KOYLU" || p.role === "SOYTARI") continue; // gece eylemi yok
        // Gözcü her gece eylem yapar (cooldown yok)
        // Avcı her gece hedef alır

        // AI botlar için otomatik simülasyon
        if (p.isBot && (!p.actions || !p.actions.type)) {
            simulateAiNightAction(game, p);
        }

        if (!p.actions || !p.actions.type) {
            allDone = false;
            break;
        }
    }

    if (allDone) {
        // Gecenin başlangıcından en az 20 saniye geçmesini bekle (TTS + SFX'in bitmesi için)
        const nightStartedAt = game.phaseEndTime - ((game.settings.nightDuration || 90) * 1000);
        const elapsed = Date.now() - nightStartedAt;
        const minNightMs = 20000; // Minimum 20 saniye

        const waitMs = Math.max(0, minNightMs - elapsed);
        
        setTimeout(async () => {
            // TTS kuyruğunun bitmesini de bekle
            const VoiceManager = require('../../Utils/VampireVoiceManager');
            await VoiceManager.waitUntilIdle(game.guildID, 30000);
            
            const DayHandler = require("../../Commands/Prefix/Fun/Game/VampireDayHandler");
            DayHandler.startDay(client, game);
        }, waitMs);
    }
}

// AI botları için gece eylemi simülasyonu
function simulateAiNightAction(game, player) {
    const aliveOthers = game.players.filter(p => p.isAlive && p.id !== player.id);
    if (aliveOthers.length === 0) {
        player.actions = { type: "SKIP", target: "skip" };
        return;
    }
    const randomTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];

    if (player.role === "VAMPIR") {
        // Vampir: masumlardan birini hedefle
        const goodTargets = aliveOthers.filter(p => p.role !== "VAMPIR");
        const t = goodTargets.length > 0 ? goodTargets[Math.floor(Math.random() * goodTargets.length)] : randomTarget;
        player.actions = { type: "KILL", target: t.id };
    } else if (player.role === "DOKTOR") {
        // Doktor: random diri birini koru (kendini de korsa allowed)
        const candidates = game.settings.doctorSelfProtect ? aliveOthers : aliveOthers.filter(p => p.id !== player.id);
        const unprot = candidates.filter(p => !(player.protectedTargets || []).includes(p.id));
        const pool = unprot.length > 0 ? unprot : candidates;
        if (pool.length > 0) {
            const t = pool[Math.floor(Math.random() * pool.length)];
            player.actions = { type: "PROTECT", target: t.id };
        } else {
            player.actions = { type: "SKIP", target: "skip" };
        }
    } else if (player.role === "GOZCU") {
        // Gözcü: birini izle
        player.actions = { type: "SEE", target: randomTarget.id };
    } else if (player.role === "AVCI") {
        // Avcı: %50 ihtimalle hedef al, %50 skip (kendini riske atmasın)
        if (Math.random() < 0.5) {
            player.actions = { type: "SHOOT", target: randomTarget.id };
        } else {
            player.actions = { type: "SKIP", target: "skip" };
        }
    } else {
        player.actions = { type: "SKIP", target: "skip" };
    }
}

async function continueGameAfterRoles(interaction, game, client) {
    const RolesLib = require("../../Commands/Prefix/Fun/Game/Roles");
    const { MessageFlags, EmbedBuilder } = require("discord.js");
    
    const nameList = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Veli", "Hasan", "Hüseyin", "Zeynep", "Elif", "Mustafa", "Cemal", "Kemal", "Aslı", "Can", "Mert", "Burak", "Eda", "Seda", "Selim", "Sinan", "Okan", "Ozan", "Cenk", "Berk", "Alp", "Kaan", "Defne", "Cemre", "Efe", "Ege", "Kuzey", "Güney", "Doğu", "Batı", "Demir", "Çelik"].sort(() => Math.random() - 0.5);

    const playerIds = game.players.filter(p => !p.isBot).map(p => p.id);
    const fetchedMembersForDMs = await interaction.guild.members.fetch({ user: playerIds }).catch(() => new Map());

    const vampires = [];
    for (let i = 0; i < game.players.length; i++) {
        let cleanName = null;
        const member = fetchedMembersForDMs.get(game.players[i].id);
        if (member) {
            const rawName = member.nickname || member.user.displayName || member.user.username;
            let normalized = rawName.normalize("NFKC");
            let stripped = normalized.replace(/[^\w\sçğıöşüÇĞIİÖŞÜ]/gi, '').trim();
            if (/^\d+$/.test(stripped.replace(/\s+/g, ''))) stripped = "";
            if (stripped.length >= 3) cleanName = stripped.substring(0, 20);
        }
        
        game.players[i].fakeName = cleanName || ("Köylü " + (nameList.pop() || `X${i}`));
        
        if (["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(game.players[i].role)) vampires.push(game.players[i].id);
    }

    // CELLAT Hedef Ataması
    const goodPlayers = game.players.filter(p => RolesLib[p.role]?.side === "GOOD");
    for (let i = 0; i < game.players.length; i++) {
        if (game.players[i].role === "CELLAT") {
            if (goodPlayers.length > 0) {
                const target = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
                game.players[i].cellatTarget = target.id;
            } else {
                const others = game.players.filter(p => p.id !== game.players[i].id);
                if (others.length > 0) {
                    const target = others[Math.floor(Math.random() * others.length)];
                    game.players[i].cellatTarget = target.id;
                }
            }
        }
    }

    game.phase = "MAYOR_ELECTION";
    game.dayCount = 1;
    await game.save();

    if (game.voiceChannelID) {
        const voiceChannel = interaction.guild.channels.cache.get(game.voiceChannelID);
        if (voiceChannel) {
            for (const [, member] of voiceChannel.members) {
                if (member.user.bot) continue;
                const isPlayer = game.players.some(p => p.id === member.id);
                if (isPlayer) {
                    if (member.voice.serverMute) await member.voice.setMute(false).catch(e => console.error(e));
                } else {
                    if (!member.voice.serverMute) await member.voice.setMute(true).catch(e => console.error(e));
                }
            }
        }
    }

    for (const p of game.players) {
        if (p.isBot) continue;
        const member = fetchedMembersForDMs.get(p.id);
        if (member) {
            p.originalName = member.nickname || null;
            if (member.manageable) await member.setNickname(p.fakeName).catch(e => console.error(e));
            
            if (p.role === "DELI") {
                const fakeRoleOptions = ["GOZCU", "DOKTOR", "AURA", "DEDEKTIF"];
                const chosenFake = fakeRoleOptions[Math.floor(Math.random() * fakeRoleOptions.length)];
                p.fakeRole = chosenFake;
                const fakeInfo = RolesLib[chosenFake] || { name: chosenFake, description: "Bilinmeyen rol." };
                
                const v2Payload = [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: `> **🎭 Rolün: ${fakeInfo.name} ${fakeInfo.emoji || ""}**` },
                            { type: 14, divider: true },
                            { type: 10, content: `**Oyundaki Adın:** ${p.fakeName}\n\n${fakeInfo.description}` }
                        ]
                    }
                ];
                await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
                continue;
            }
            
            const roleInfo = RolesLib[p.role] || { name: p.role, description: "Bilinmeyen rol." };
            
            let desc = `**Oyundaki Adın:** ${p.fakeName}\n\n`;
            if (["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(p.role)) {
                desc += `**Takım Arkadaşların (Kötüler):** ${vampires.filter(v => v !== p.id).map(v => (v.startsWith("ai_") ? `🤖 AI (${v.split("_")[2]})` : `<@${v}>`)).join(", ") || "Yok"}\n\n${roleInfo.description}`;
            } else if (p.role === "CELLAT" && p.cellatTarget) {
                const targetPlayer = game.players.find(t => t.id === p.cellatTarget);
                const targetName = targetPlayer ? targetPlayer.fakeName : "Bilinmeyen";
                desc += `**🪓 HEDEFİN:** ${targetName} (<@${p.cellatTarget}>)\nBu kişiyi gündüz oylamasında astırmaya çalış!\n\n${roleInfo.description}`;
            } else {
                desc += roleInfo.description;
            }

            const v2Payload = [
                {
                    type: 17,
                    components: [
                        { type: 10, content: `> **🎭 Rolün: ${roleInfo.name} ${roleInfo.emoji || ""}**` },
                        { type: 14, divider: true },
                        { type: 10, content: desc }
                    ]
                }
            ];
            await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
        }
    }
    
    await game.save();

    if (interaction.message && interaction.customId === "vk_v2_start") {
        await interaction.message.delete().catch(e => console.error(e));
    }
    
    const GeneralService = require("../../../Services/Systems/GeneralService");
    await GeneralService.sendV2Message(interaction.channel, {
        components: [
            { type: 17, components: [ { type: 10, content: `> 🌑 **Oyun Başladı!**\nRolleriniz DM üzerinden gönderildi. Şimdi **Muhtar Seçimi** yapılacak!` } ] }
        ],
        flags: [MessageFlags.IsComponentsV2]
    }).catch(()=>{});

    if (game.voiceChannelID) {
        const voiceChannel = interaction.client.channels.cache.get(game.voiceChannelID);
        if (voiceChannel) {
            const VoiceManager = require('../../Utils/VampireVoiceManager');
            const ttsMode = game.settings.ttsRoleMode || 1;
            let ttsText = `Vampir Köylü oyunu başlatıldı! `;

            if (ttsMode === 1) {
                let goodCount = 0, badCount = 0, neutralCount = 0;
                game.players.forEach(p => {
                    const r = p.role === "RANDOM" ? "KOYLU" : p.role;
                    const side = RolesLib[r] ? RolesLib[r].side : "GOOD";
                    if (side === "GOOD") goodCount++;
                    else if (side === "BAD") badCount++;
                    else neutralCount++;
                });
                
                let sideTexts = [];
                if (goodCount > 0) sideTexts.push(`${goodCount} İyi`);
                if (badCount > 0) sideTexts.push(`${badCount} Kötü`);
                if (neutralCount > 0) sideTexts.push(`${neutralCount} Tarafsız`);
                
                ttsText += `Kasabamızda ${sideTexts.join(", ")} rol var. `;
            } else if (ttsMode === 2) {
                const roleCounts = {};
                game.players.forEach(p => {
                    const r = p.role === "RANDOM" ? "KOYLU" : p.role;
                    roleCounts[r] = (roleCounts[r] || 0) + 1;
                });
                
                const roleTexts = Object.entries(roleCounts).map(([rKey, count]) => {
                    const rName = RolesLib[rKey] ? RolesLib[rKey].name : rKey;
                    return `${count} ${rName}`;
                }).join(", ");
                
                ttsText += `Kasabamızda şu roller var: ${roleTexts}. `;
            }
            
            ttsText += `Herkese rolleri özel mesaj olarak gönderildi. İlk işimiz muhtar seçmek. Muhtarın oyları 2 puan sayılır. Lütfen muhtar adayınızı oylayın.`;
            VoiceManager.speak(voiceChannel, ttsText, "start.wav");
        }
    }
    
    if (interaction.message && interaction.customId === "vk_v2_start") {
         const startEmbed = new EmbedBuilder()
             .setTitle("🌑 Oyun Başladı!")
             .setDescription("Rolleriniz DM üzerinden gönderildi. Şimdi Muhtar Seçimi yapılacak!\n*(Sesli asistanın kuralları anlatması bekleniyor, lütfen kısa bir süre bekleyin...)*")
             .setColor("#2b2d31")
             .setImage("attachment://vampire_banner.gif");
         await interaction.message.channel.send({ embeds: [startEmbed] }).catch(e => console.error(e));
    }

    setTimeout(() => {
        require("../../Commands/Prefix/Fun/Game/VampireDayHandler").startMayorElection(client, game);
    }, 25000);
}
