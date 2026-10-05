const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async (client, game) => {
    const freshGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
    if (!freshGame || !freshGame.isActive) return;
    game = freshGame;

    if (game.phase !== "NIGHT") {
        game.phase = "NIGHT";
        game.dayCount += 1; 

        const duration = game.settings.nightDuration || 90;
        const endTime = Date.now() + (duration * 1000);
        game.phaseEndTime = endTime;

        let offlineDeaths = [];
        const guild = client.guilds.cache.get(game.guildID);
        if (guild && game.voiceChannelID) {
            const voiceChannel = guild.channels.cache.get(game.voiceChannelID);
            if (voiceChannel) {
                game.players.forEach(p => {
                    if (p.isAlive && !p.isBot) {
                        if (!voiceChannel.members.has(p.id)) {
                            p.isAlive = false;
                            offlineDeaths.push(p);
                        }
                    }
                });
            }
        }

        // --- MAFIOSO PROMOTION (Vampire Revenge) ---
        // Eğer takımda hiç asıl katil kalmadıysa, destek kötü rollerinden biri Vampir'e dönüşür.
        const alivePlayersForPromote = game.players.filter(p => p.isAlive);
        const primaryKillers = alivePlayersForPromote.filter(p => ["VAMPIR", "ALFA_KURT", "VAMPIR_LORDU"].includes(p.role));
        
        if (primaryKillers.length === 0) {
            const supportEvils = alivePlayersForPromote.filter(p => ["CIRAK_KURT", "SAMAN", "BUYUCU"].includes(p.role));
            if (supportEvils.length > 0) {
                const getPriority = (role) => {
                    if (role === "CIRAK_KURT") return 1;
                    if (role === "SAMAN") return 2;
                    if (role === "BUYUCU") return 3;
                    return 99;
                };
                
                supportEvils.sort((a, b) => getPriority(a.role) - getPriority(b.role));
                const promotedPlayer = supportEvils[0];
                promotedPlayer.role = "VAMPIR";
                
                const user = await client.users.fetch(promotedPlayer.id).catch(() => null);
                if (user && !promotedPlayer.isBot) {
                    user.send(`> 🩸 **KAN UYANIŞI!**\nKötü takımda asıl katillerin hepsi öldü. Takımın son umudu sensin! Eski yeteneklerini kaybederek tam bir **Vampir**'e dönüştün. Artık avlanma sırası sende!`).catch(() => {});
                }
            }
        }

        game.players.forEach(p => {
            p.actions = {}; 
            p.isProtected = false;
            p.isFramed = false; // Şaman efsunu her gece sıfırlanır
        });
        await game.markModified("players");
        await game.save();

        if (game.channelID) {
            const channel = client.channels.cache.get(game.channelID);
            if (channel) {
                const v2Payload = [
                    {
                        type: 17,
                        components: [
                            { type: 10, content: `> **🌑 Gece ${game.dayCount}**` },
                            { type: 14, divider: true },
                            { type: 10, content: `Hava karardı, kasaba uykuya daldı... Roller DM üzerinden harekete geçiyor.\nSüre: <t:${Math.floor(endTime / 1000)}:R>` }
                        ]
                    }
                ];

                if (offlineDeaths.length > 0) {
                    const formatPlayer = (id) => {
                        const p = game.players.find(x => x.id === id);
                        return p ? (p.fakeName ? `**${p.fakeName}** (<@${id}>)` : `<@${id}>`) : `<@${id}>`;
                    };
                    const deathStrings = offlineDeaths.map(p => `💀 ${formatPlayer(p.id)} *(Sesten Ayrıldı)*`);
                    v2Payload[0].components.push({ type: 10, content: `\n⚠️ **Sesten Ayrılanlar Öldü:**\n${deathStrings.join("\n")}` });
                }

                const { AttachmentBuilder } = require('discord.js');
                const { renderVampireCanvas } = require('../../../../Utils/VampireCanvas');
                
                let files = [];
                try {
                    const canvasBuffer = await renderVampireCanvas(client, game);
                    if (canvasBuffer) {
                        files.push(new AttachmentBuilder(canvasBuffer, { name: 'vampire_status.png' }));
                        v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://vampire_status.png" } }] });
                    }
                } catch (e) {
                    console.error("[VampireCanvas] Error rendering canvas in NightHandler:", e);
                }

                const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                const voiceChannel = client.channels.cache.get(game.voiceChannelID);
                if (voiceChannel) {
                    VoiceManager.speak(voiceChannel, `Gece oldu. Kasabaya karanlık çöktü... Herkes uykuya daldı. Sadece rollerin karanlıkta iş başına geçme vakti.`, "night.wav");
                }

                await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
            }
        }

        setTimeout(async () => {
            const checkGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
            if (checkGame && checkGame.isActive && checkGame.phase === "NIGHT" && checkGame.dayCount === game.dayCount) {
                // --- AI (Bot) Eylemlerini Simüle Et ---
                const alivePlayers = checkGame.players.filter(p => p.isAlive);
                let actionsChanged = false;
                
                for (const p of alivePlayers) {
                    if (!p.isBot) continue;
                    if (p.actions && p.actions.type) continue;

                    if (p.role === "VAMPIR") {
                        const targets = alivePlayers.filter(t => t.role !== "VAMPIR");
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "KILL", target: randomTarget.id };
                            actionsChanged = true;
                        }
                    } else if (p.role === "DOKTOR") {
                        const targets = checkGame.settings.doctorSelfProtect
                            ? alivePlayers
                            : alivePlayers.filter(t => t.id !== p.id);
                        const unprot = targets.filter(t => t.id !== p.lastProtectedTarget);
                        const pool = unprot.length > 0 ? unprot : targets;
                        if (pool.length > 0) {
                            const randomTarget = pool[Math.floor(Math.random() * pool.length)];
                            p.actions = { type: "PROTECT", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "GOZCU") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "SEE", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "AVCI") {
                        if (Math.random() < 0.5) {
                            const targets = alivePlayers.filter(t => t.id !== p.id);
                            if (targets.length > 0) {
                                const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                                p.actions = { type: "SHOOT", target: randomTarget.id };
                                actionsChanged = true;
                            } else {
                                p.actions = { type: "SKIP", target: "skip" };
                                actionsChanged = true;
                            }
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "AURA") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "AURA", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "BOMBACI") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "BOMB", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "SAMAN") {
                        const targets = alivePlayers.filter(t => t.id !== p.id && t.role !== "VAMPIR" && t.role !== "ALFA_KURT" && t.role !== "CIRAK_KURT" && t.role !== "VAMPIR_LORDU" && t.role !== "BUYUCU" && t.role !== "SAMAN");
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "FRAME", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "BUYUCU") {
                        const targets = alivePlayers.filter(t => t.id !== p.id && t.role !== "VAMPIR" && t.role !== "ALFA_KURT" && t.role !== "CIRAK_KURT" && t.role !== "VAMPIR_LORDU" && t.role !== "BUYUCU" && t.role !== "SAMAN");
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "BLOCK", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "VAMPIR_LORDU") {
                        const targets = alivePlayers.filter(t => t.role !== "VAMPIR" && t.role !== "ALFA_KURT" && t.role !== "CIRAK_KURT" && t.role !== "VAMPIR_LORDU" && t.role !== "BUYUCU" && t.role !== "SAMAN");
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "KILL", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "SERI_KATIL") {
                        if ((p.cooldown || 0) > 0) {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        } else {
                            const targets = alivePlayers.filter(t => t.id !== p.id && t.role !== "SERI_KATIL");
                            if (targets.length >= 2) {
                                const shuffled = targets.sort(() => 0.5 - Math.random());
                                p.actions = { type: "SERIAL_KILL", targets: [shuffled[0].id, shuffled[1].id] };
                                actionsChanged = true;
                            } else if (targets.length === 1) {
                                p.actions = { type: "SERIAL_KILL", targets: [targets[0].id] };
                                actionsChanged = true;
                            } else {
                                p.actions = { type: "SKIP", target: "skip" };
                                actionsChanged = true;
                            }
                        }
                    } else if (p.role === "ALFA_KURT") {
                        const targets = alivePlayers.filter(t => t.id !== p.id && t.role !== "VAMPIR" && t.role !== "ALFA_KURT" && t.role !== "SERI_KATIL" && t.role !== "CIRAK_KURT");
                        if (!p.hasConverted && Math.random() < 0.3 && targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "CONVERT", target: randomTarget.id };
                            actionsChanged = true;
                        } else if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "KILL", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "KUNDAKCI") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            if (Math.random() < 0.2) {
                                p.actions = { type: "IGNITE", target: "ignite" };
                            } else {
                                const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                                p.actions = { type: "DOUSE", target: randomTarget.id };
                            }
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "DEDEKTIF") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "DETECT", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "IZCI") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "SCOUT", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "TUZAKCI") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "TRAP", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "DELI") {
                        const targets = alivePlayers.filter(t => t.id !== p.id);
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "INVESTIGATE", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "CIRAK_KURT") {
                        const targets = alivePlayers.filter(t => t.id !== p.id && t.role !== "VAMPIR" && t.role !== "ALFA_KURT" && t.role !== "CIRAK_KURT" && t.role !== "SERI_KATIL");
                        if (targets.length > 0) {
                            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
                            p.actions = { type: "SILENCE", target: randomTarget.id };
                            actionsChanged = true;
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "MEDYUM") {
                        if (!p.hasRevived) {
                            const deadPlayers = checkGame.players.filter(dp => !dp.isAlive);
                            if (deadPlayers.length > 0 && Math.random() < 0.4) {
                                const randomDead = deadPlayers[Math.floor(Math.random() * deadPlayers.length)];
                                p.actions = { type: "REVIVE", target: randomDead.id };
                                actionsChanged = true;
                            } else {
                                p.actions = { type: "SKIP", target: "skip" };
                                actionsChanged = true;
                            }
                        } else {
                            p.actions = { type: "SKIP", target: "skip" };
                            actionsChanged = true;
                        }
                    } else if (p.role === "SOYTARI" || p.role === "KOYLU" || p.role === "CELLAT") {
                        p.actions = { type: "SKIP", target: "skip" };
                        actionsChanged = true;
                    }
                }

                if (actionsChanged) {
                    await require("../../../../Core/Database/VampireGame").updateOne(
                        { _id: checkGame._id },
                        { $set: { players: checkGame.players } }
                    );
                }
                
                // TTS kuyruğunun bitmesini bekle
                const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                await VoiceManager.waitUntilIdle(checkGame.guildID, 30000);
                
                const DayHandler = require("./VampireDayHandler");
                DayHandler.startDay(client, checkGame);
            }
        }, duration * 1000);
    }

    const alivePlayers = game.players.filter(p => p.isAlive);
    const allPlayerOptions = alivePlayers.map(p => ({
        label: p.fakeName || (p.isBot ? `🤖 AI (${p.id.split("_")[2]})` : `Oyuncu ${p.id}`),
        value: p.id,
        role: p.role
    }));

    const playerIdsToDM = alivePlayers.filter(p => !p.isBot).map(p => p.id);
    const guild = client.guilds.cache.get(game.guildID);
    const membersToDM = guild ? await guild.members.fetch({ user: playerIdsToDM }).catch(() => new Map()) : new Map();

    for (const p of alivePlayers) {
        if (p.isBot) continue;
        const member = membersToDM.get(p.id);
        if (!member) continue;

        let components = [];

        let targetEndTime = game.phaseEndTime;
        if (!targetEndTime) targetEndTime = Date.now() + 60000; 

        const displayTime = Math.floor(targetEndTime / 1000);
        let desc = "";

        if (p.role === "VAMPIR") {
            desc = "Bu gece kimi öldürmek istiyorsun? Diğer vampirlerle anlaş!";

            const killTargets = allPlayerOptions.filter(opt => opt.role !== "VAMPIR");
            const cleanOptions = killTargets.map(o => ({ label: o.label, value: o.value }));

            if (cleanOptions.length === 0) {
                desc = "Öldürebilecek kimse kalmadı?! (Hata)";
            } else {
                const select = new StringSelectMenuBuilder()
                    .setCustomId("vk_act_kill")
                    .setPlaceholder("Öldürülecek kişiyi seç...")
                    .addOptions(cleanOptions);

                const noteBtn = new ButtonBuilder()
                    .setCustomId("vk_note_btn")
                    .setLabel("Not Bırak")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("✍️");

                components.push(new ActionRowBuilder().addComponents(select));
                components.push(new ActionRowBuilder().addComponents(noteBtn));
            }
        }
        else if (p.role === "DOKTOR") {
            desc = "Bu gece kimi korumak istiyorsun?";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));

            const validTargets = game.settings.doctorSelfProtect
                ? cleanAll
                : cleanAll.filter(o => o.value !== p.id);

            // Doktor: lastProtectedTarget filtresi
            const filterTargets = validTargets.filter(o => o.value !== p.lastProtectedTarget);

            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_protect")
                .setPlaceholder("Korunacak kişiyi seç...")
                .addOptions(filterTargets.length > 0 ? filterTargets : [{ label: "Kimse kalmadı (Pas)", value: "skip" }]);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "GOZCU") {
            desc = "Bu gece kimi gözetlemek istiyorsun? Seçtiğin oyuncuyu o gece kimlerin ziyaret ettiğini öğrenirsin.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_see")
                .setPlaceholder("Gözetlenecek kişi veya Pas...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "AVCI") {
            desc = "Birini hedef alırsın; hedefin kötüyse ölür, iyiyse SEN ölürsün. Pas geçebilirsin.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_shoot")
                .setPlaceholder("Hedef veya Pas...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "AURA") {
            desc = "Bu gece kimin tarafını öğrenmek istiyorsun? (İyi/Kötü/Tarafsız)";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_aura")
                .setPlaceholder("Hedefi seç...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "BOMBACI") {
            desc = "Bu gece kimi bombalamak istiyorsun? Bombalanan oyuncu ertesi gece patlar.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_bomb")
                .setPlaceholder("Bombalanacak kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "SAMAN") {
            desc = "Bu gece kimi efsunlamak istiyorsun? Efsunlanan kişi bu gece araştırılırsa KÖTÜ/VAMPİR olarak gözükür.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_saman")
                .setPlaceholder("Efsunlanacak kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "BUYUCU") {
            desc = "Bu gece kimi büyülemek istiyorsun? Büyülenen kişi bu gece hiçbir yeteneğini kullanamaz.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_buyucu")
                .setPlaceholder("Büyülenecek kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "VAMPIR_LORDU") {
            desc = "Vampirlerin Efendisi olarak bu gece kimi kurban etmek istersin? (Gece saldırılarına bağışıksın ve araştırmalara İYİ çıkarsın)";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_lord")
                .setPlaceholder("Öldürülecek kurban...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "SERI_KATIL") {
            if ((p.cooldown || 0) > 0) {
                desc = `Bekleme süren var: ${p.cooldown} tur daha beklemelisin. Bu gece saldıramazsın.`;
            } else {
                desc = "Bu gece 2 oyuncuyu seçerek öldürebilirsin!";
                const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
                const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
                const select = new StringSelectMenuBuilder()
                    .setCustomId("vk_act_serial")
                    .setPlaceholder("Hedefleri seç (2 kişi)...")
                    .setMinValues(1)
                    .setMaxValues(Math.min(2, opts.length))
                    .addOptions(opts);
                components.push(new ActionRowBuilder().addComponents(select));
            }
        }
        else if (p.role === "ALFA_KURT") {
            const hasConverted = p.hasConverted || false;
            if (hasConverted) {
                desc = "Çırak dönüştürme hakkın bitti. Bu gece birini öldürebilirsin.";
            } else {
                desc = "Birini Çırak Kurt olarak kazandır (1x) VEYA birini öldür.";
            }
            const killOpts = allPlayerOptions.filter(o => o.value !== p.id).map(o => ({ label: `🔪 Öldür: ${o.label}`, value: `kill_${o.value}` }));
            killOpts.push({ label: "Pas Geç", value: "skip", emoji: "⏭️" });
            const killSelect = new StringSelectMenuBuilder()
                .setCustomId("vk_act_alfa_kill")
                .setPlaceholder("Kimi öldüreceksin?")
                .addOptions(killOpts.slice(0, 25));

            if (!hasConverted) {
                let convertOpts = allPlayerOptions.filter(o => o.value !== p.id && o.role !== "VAMPIR" && o.role !== "ALFA_KURT" && o.role !== "CIRAK_KURT" && o.role !== "SERI_KATIL").map(o => ({ label: `🐺 Çırak Yap: ${o.label}`, value: `convert_${o.value}` }));
                if (convertOpts.length > 0) {
                    convertOpts.push({ label: "İptal", value: "skip", emoji: "⏭️" });
                    const convertSelect = new StringSelectMenuBuilder()
                        .setCustomId("vk_act_alfa_convert")
                        .setPlaceholder("Kimi çırak yapacaksın?")
                        .addOptions(convertOpts.slice(0, 25));
                    components.push(new ActionRowBuilder().addComponents(convertSelect));
                }
            }
            components.push(new ActionRowBuilder().addComponents(killSelect));
        }
        else if (p.role === "DEDEKTIF") {
            desc = "Bu gece kimi araştırmak istiyorsun? 2 rol gösterilecek: biri doğru, biri yanlış.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_detective")
                .setPlaceholder("Araştırılacak kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "IZCI") {
            desc = "Bu gece kimin hareketini takip etmek istiyorsun?";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_scout")
                .setPlaceholder("Takip edilecek kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "TUZAKCI") {
            desc = "Bu gece kime tuzak kurmak istiyorsun? Onu ziyaret eden herkes yakalanacak.";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_trap")
                .setPlaceholder("Tuzak kurulacak kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "DELI") {
            const fakeRole = p.fakeRole || "KOYLU";
            if (fakeRole === "DOKTOR") {
                desc = "Bu gece kimi korumak istiyorsun? (Aynı kişiyi üst üste koruyamazsın)";
                const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
                const opts = [...cleanAll.filter(o => o.value !== p.id && o.value !== p.lastProtectedTarget), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
                const select = new StringSelectMenuBuilder()
                    .setCustomId("vk_act_protect")
                    .setPlaceholder("Korunacak kişi...")
                    .addOptions(opts);
                components.push(new ActionRowBuilder().addComponents(select));
            } else if (fakeRole === "GOZCU") {
                desc = "Bu gece kimin hareketini takip etmek istiyorsun?";
                const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
                const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
                const select = new StringSelectMenuBuilder()
                    .setCustomId("vk_act_scout")
                    .setPlaceholder("Takip edilecek kişi...")
                    .addOptions(opts);
                components.push(new ActionRowBuilder().addComponents(select));
            } else if (fakeRole === "AURA") {
                desc = "Bu gece kimin tarafını öğrenmek istiyorsun? (İyi/Kötü/Tarafsız)";
                const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
                const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
                const select = new StringSelectMenuBuilder()
                    .setCustomId("vk_act_aura")
                    .setPlaceholder("Hedefi seç...")
                    .addOptions(opts);
                components.push(new ActionRowBuilder().addComponents(select));
            } else if (fakeRole === "DEDEKTIF") {
                desc = "Bu gece kimi araştırmak istiyorsun? 2 rol gösterilecek: biri doğru, biri yanlış.";
                const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
                const opts = [...cleanAll.filter(o => o.value !== p.id), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
                const select = new StringSelectMenuBuilder()
                    .setCustomId("vk_act_detective")
                    .setPlaceholder("Araştırılacak kişi...")
                    .addOptions(opts);
                components.push(new ActionRowBuilder().addComponents(select));
            } else {
                desc = "Gece eylemin yok. Sabahı bekle.";
            }
        }
        else if (p.role === "CIRAK_KURT") {
            desc = "Bu gece kimi susturmak istiyorsun? Seçtiğin kişi yarın mesaj yazamaz ve oy kullanamaz.";
            const opts = [...allPlayerOptions.filter(o => o.value !== p.id && o.role !== "VAMPIR" && o.role !== "ALFA_KURT" && o.role !== "CIRAK_KURT" && o.role !== "SERI_KATIL").map(o => ({ label: o.label, value: o.value })), { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_silence")
                .setPlaceholder("Susturulacak kişi...")
                .addOptions(opts);
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "KUNDAKCI") {
            desc = "Benzin dökebilir veya benzin döktüğün herkesi yakabilirsin!";
            const cleanAll = allPlayerOptions.map(o => ({ label: o.label, value: o.value }));
            const douseOpts = cleanAll.filter(o => o.value !== p.id).map(o => ({ label: `🛢️ Benzin Dök: ${o.label}`, value: `douse_${o.value}` }));
            const opts = [...douseOpts, { label: "🔥 HERKESİ YAK", value: "ignite", emoji: "🔥" }, { label: "Pas Geç", value: "skip", emoji: "⏭️" }];
            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_act_arsonist")
                .setPlaceholder("Eylem seç...")
                .addOptions(opts.slice(0, 25));
            components.push(new ActionRowBuilder().addComponents(select));
        }
        else if (p.role === "MEDYUM") {
            const hasRevived = p.hasRevived || false;
            if (hasRevived) {
                desc = "Diriltme hakkın bitti. Sabahı bekle.";
            } else {
                desc = "Bir ölü oyuncuyu hayata döndürebilirsin! (Oyun boyunca 1 kez)";
                const deadPlayers = game.players.filter(dp => !dp.isAlive);
                if (deadPlayers.length === 0) {
                    desc = "Henüz ölmüş oyuncu yok. Sabahı bekle.";
                } else {
                    const deadOpts = deadPlayers.map(dp => {
                        const name = dp.fakeName || (dp.isBot ? `🤖 AI (${dp.id.split("_")[2]})` : `Oyuncu ${dp.id}`);
                        return { label: `💀 ${name}`, value: dp.id };
                    });
                    deadOpts.push({ label: "Pas Geç", value: "skip", emoji: "⏭️" });
                    const select = new StringSelectMenuBuilder()
                        .setCustomId("vk_act_revive")
                        .setPlaceholder("Dirilecek kişi...")
                        .addOptions(deadOpts);
                    components.push(new ActionRowBuilder().addComponents(select));
                }
            }
        }
        else if (p.role === "SOYTARI" || p.role === "KOYLU" || p.role === "CELLAT") {
            desc = "Gece oldu. Kurtlar, Vampirler ve Katiller avlanıyor... Sabahı bekle.";
        }

        if (components.length === 0) continue;

        let v2Payload = [
            {
                type: 17,
                components: [
                    { type: 10, content: `> **🌑 Gece ${game.dayCount}** | Süre: <t:${displayTime}:R>` },
                    { type: 14, divider: true },
                    { type: 10, content: desc }
                ]
            }
        ];

        for (const row of components) {
            v2Payload[0].components.push({ type: 1, components: row.components.map(c => c.toJSON()) });
        }

        await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
    }

    await updateVoiceState(client, game, true);
};

async function updateVoiceState(client, game, isNight) {
    if (!game.voiceChannelID) return;
    const channel = client.channels.cache.get(game.voiceChannelID);
    if (!channel) {
        console.error(`[VampireGame] Voice channel ${game.voiceChannelID} not found in cache!`);
        return;
    }

    console.log(`[VampireGame] Muting/Unmuting ${channel.members.size} members in ${channel.name} (isNight: ${isNight})`);

    const { secondaryClient } = require("../../../../Core/Clients/SecondaryClient");
    const secGuild = secondaryClient && secondaryClient.isReady() ? secondaryClient.guilds.cache.get(game.guildID) : null;

    const membersToProcess = [];
    for (const [id, member] of channel.members) {
        if (member.user.bot) continue;
        const player = game.players.find(p => p.id === id);

        const shouldMute = (!player || !player.isAlive || isNight);

        if (!player || !player.isAlive) {
            channel.permissionOverwrites.edit(member.id, { SendMessages: false }).catch(() => {});
        }

        if (member.voice && member.voice.serverMute !== shouldMute) {
            membersToProcess.push({ id, mainMember: member, shouldMute });
        }
    }

    if (membersToProcess.length > 0) {
        const tasks = membersToProcess.map((item, index) => {
            return async () => {
                const useSecondary = (index % 2 === 1) && secGuild;
                let targetMember = item.mainMember;

                if (useSecondary) {
                    const secMem = secGuild.members.cache.get(item.id) || await secGuild.members.fetch(item.id).catch(() => null);
                    if (secMem) targetMember = secMem;
                }

                try {
                    await targetMember.voice.setMute(item.shouldMute);
                } catch (e) {
                    try {
                        await item.mainMember.voice.setMute(item.shouldMute);
                    } catch (err2) {}
                }
            };
        });

        await Promise.all(tasks.map(fn => fn()));
    }

    // Manage everyone role text chat permission based on day/night
    try {
        const everyone = channel.guild.roles.everyone;
        if (isNight) {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: false }).catch(() => {});
        } else {
            await channel.permissionOverwrites.edit(everyone, { SendMessages: true }).catch(() => {});
        }
    } catch (e) {
        console.error(`[VampireGame] Text Chat Mute Error:`, e.message);
    }
}
