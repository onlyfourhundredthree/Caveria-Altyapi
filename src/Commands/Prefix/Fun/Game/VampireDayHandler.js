const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const VampireGame = require("../../../../Core/Database/VampireGame");
const ConfigManager = require("../../../../Core/Handlers/ConfigManager");
const Roles = require("./Roles");

const formatPlayer = (id, game) => {
    if (game && game.players) {
        const p = game.players.find(x => x.id === id);
        if (p && p.fakeName) return p.fakeName;
    }
    return id.startsWith("ai_") ? `🤖 AI (${id.split("_")[2]})` : `<@${id}>`;
};

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

module.exports = {
    startMayorElection: async (client, game) => {
        game.phase = "MAYOR_ELECTION";
        game.players.forEach(p => p.votedFor = null);

        const duration = game.settings.discussionDuration || 60;
        const endTime = Date.now() + (duration * 1000);
        game.phaseEndTime = endTime;

        game.markModified("players");
        await game.save();

        setTimeout(async () => {
            const freshGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
            if (freshGame && freshGame.isActive && freshGame.phase === "MAYOR_ELECTION") {
                module.exports.processMayorElection(client, freshGame);
            }
        }, duration * 1000);

        const channel = client.channels.cache.get(game.channelID);
        if (!channel) return;

        const alivePlayers = game.players.filter(p => p.isAlive);
        const options = alivePlayers.map(p => ({ label: p.fakeName || (p.isBot ? `🤖 AI (${p.id.split("_")[2]})` : `Oyuncu ${p.id}`), value: p.id }));

        const select = new StringSelectMenuBuilder()
            .setCustomId("vk_mayor_vote_menu")
            .setPlaceholder("Muhtar adayını seç...")
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        const endTimeSeconds = Math.floor(endTime / 1000);
        const v2Payload = [
            {
                type: 17,
                components: [
                    { type: 10, content: `> **🎩 Muhtar Seçimi** | Bitiş: <t:${endTimeSeconds}:R>\n\nKasabanın yeni muhtarını seçmek için oylama başladı! Muhtarın oyları 2 puan sayılacaktır.\nHerkesin 1 oy hakkı var.` },
                    { type: 14, divider: true },
                    { type: 1, components: [ select.toJSON() ] }
                ]
            }
        ];

        const msg = await channel.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] });
        game.votingMessageID = msg.id;
        game.markModified("votingMessageID");
        await game.save();
    },

    processMayorElection: async (client, game) => {
        if (game.phase !== "MAYOR_ELECTION") return;
        game.phase = "PROCESSING";
        await game.save();

        const votes = {}; // ID -> Count
        for (const p of game.players) {
            if (!p.isAlive) continue;
            // AI (Bot) oylaması - rastgele biri:
            if (p.isBot && !p.votedFor) {
                const aliveList = game.players.filter(x => x.isAlive);
                p.votedFor = aliveList[Math.floor(Math.random() * aliveList.length)].id;
            }

            if (p.votedFor) {
                const weight = (p.role === "KOY_MUHTARI") ? 2 : 1;
                votes[p.votedFor] = (votes[p.votedFor] || 0) + weight;
            }
        }

        let maxVotes = 0;
        let candidate = null;

        // Shuffle the entries to pick random on tie implicitly, or just pick the first we see.
        // Array.from(Object.entries(votes)).sort(()=> Math.random() - 0.5) works for random tie-breaker.
        const voteEntries = Object.entries(votes).sort(() => Math.random() - 0.5);

        for (const [id, count] of voteEntries) {
            if (count > maxVotes) {
                maxVotes = count;
                candidate = id;
            }
        }

        const channel = client.channels.cache.get(game.channelID);
        game.mayorID = candidate;
        game.markModified("mayorID");
        await game.save();

        const v2Payload = [
            {
                type: 17,
                components: [
                    { type: 10, content: `> **🎩 Muhtar Seçim Sonucu**` },
                    { type: 14, divider: true },
                    { type: 10, content: `Kasabanın yeni Muhtarı **${formatPlayer(candidate, game)}** seçildi!` }
                ]
            }
        ];

        if (channel) await channel.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] });

        if (game.voiceChannelID) {
            const voiceChannel = client.channels.cache.get(game.voiceChannelID);
            if (voiceChannel) {
                const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                const cleanName = (formatPlayer(candidate, game) || "Bir oyuncu").replace(/[^\w\sçğıöşüÇĞIİÖŞÜ]/g, '');
                VoiceManager.speak(voiceChannel, `Seçimler bitti! Kasabanın yeni Muhtarı ${cleanName} seçildi!`);
            }
        }

        // Go to Night 1
        require("./VampireNightHandler")(client, game);
    },

    triggerMayorInheritance: async (client, game, deadMayorID, nextPhase) => {
        game.phase = "MAYOR_INHERITANCE";
        game.phaseBeforeInheritance = nextPhase;
        
        const duration = 45; // 45 seconds to pick an heir
        game.phaseEndTime = Date.now() + (duration * 1000);
        await game.save();

        const channel = client.channels.cache.get(game.channelID);
        const alivePlayers = game.players.filter(p => p.isAlive);
        
        if (alivePlayers.length === 0) return module.exports.resumeAfterInheritance(client, game);

        const deadPlayer = game.players.find(p => p.id === deadMayorID);
        if (deadPlayer && deadPlayer.isBot) {
            const heir = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
            if (heir) {
                await sendV2(channel, `> **🎩 Muhtar Vasiyeti**`, `Eski Muhtar ölmeden önce **${formatPlayer(heir.id, game)}** kişisini varis bıraktı! Yeni muhtar o.`);
                game.mayorID = heir.id;
                await game.save();
            }
            return module.exports.resumeAfterInheritance(client, game);
        } else {
            await sendV2(channel, `> **🎩 Muhtar Öldü!**`, `Kasabanın yeni muhtarını seçmesi için ${formatPlayer(deadMayorID, game)} kişisine 45 saniye süre verildi.\n-# Lütfen DM kutunuzu kontrol edin.`);
            if (game.voiceChannelID) {
                const voiceChannel = client.channels.cache.get(game.voiceChannelID);
                if (voiceChannel) {
                    const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                    VoiceManager.speak(voiceChannel, `Kasabanın muhtarı öldü! Eski muhtarın varisini seçmesi bekleniyor.`);
                }
            }
        }
        
        const guild = client.guilds.cache.get(game.guildID);
        const member = guild ? await guild.members.fetch(deadMayorID).catch(()=>null) : null;
        
        if (member) {
            const options = alivePlayers.map(p => ({ label: p.isBot ? `🤖 AI (${p.id.split("_")[2]})` : `Oyuncu ${p.id}`, value: p.id }));
            
            const fetchedMembers = await guild.members.fetch({ user: options.filter(o => !o.value.startsWith("ai_")).map(o => o.value) }).catch(() => new Map());
            for (const opt of options) {
                if (opt.value.startsWith("ai_")) continue;
                const m = fetchedMembers.get(opt.value);
                if (m) opt.label = m.displayName;
            }

            const select = new StringSelectMenuBuilder()
                .setCustomId("vk_mayor_heir_select")
                .setPlaceholder("Yeni Muhtarı Seç (Varisin)...")
                .addOptions(options.slice(0, 25));

            const v2Payload = [
                {
                    type: 17,
                    components: [
                        { type: 10, content: `> **🎩 Ölmeden Önce Son İsteğin**` },
                        { type: 14, divider: true },
                        { type: 10, content: "Lütfen kasanın yeni muhtarını (varisini) seç. Süren 45 saniye!" },
                        { type: 1, components: [ select.toJSON() ] }
                    ]
                }
            ];

            await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(()=>{});
        }

        setTimeout(async () => {
            const freshGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
            if (freshGame && freshGame.phase === "MAYOR_INHERITANCE") {
                const alive = freshGame.players.filter(p => p.isAlive);
                if (alive.length > 0) {
                    const heir = alive[Math.floor(Math.random() * alive.length)];
                    freshGame.mayorID = heir.id;
                    await freshGame.save();
                    await sendV2(channel, `> **⏳ Süre Doldu**`, `Rastgele biri muhtar seçildi: **${formatPlayer(heir.id, game)}**`);
                }
                module.exports.resumeAfterInheritance(client, freshGame);
            }
        }, duration * 1000);
    },

    resumeAfterInheritance: async (client, game) => {
        const nextPhase = game.phaseBeforeInheritance;
        game.phaseBeforeInheritance = null;
        await game.save();

        const channel = client.channels.cache.get(game.channelID);

        if (nextPhase === "DISCUSSION") {
            game.phase = "DISCUSSION";
            await game.save();

            const discDuration = game.settings.discussionDuration || 60;
            const votingTimeSeconds = Math.floor((Date.now() + discDuration * 1000) / 1000);
            await sendV2(channel, `> **🗣️ Tartışma Başladı!**`, `Şüphelileri konuşun. Oylamaya <t:${votingTimeSeconds}:R> geçilecek.`);
            
            setTimeout(() => {
                module.exports.startVoting(client, game);
            }, discDuration * 1000);
        } else if (nextPhase === "NIGHT") {
            require("./VampireNightHandler")(client, game);
        }
    },

    startDay: async (client, game) => {
        const VampireGame = require("../../../../Core/Database/VampireGame");
        const freshGame = await VampireGame.findOneAndUpdate(
            { _id: game._id, phase: "NIGHT" },
            { $set: { phase: "DAY" } },
            { new: true }
        );
        if (!freshGame) return; // Zaten DAY olmuş veya oyun bitmiş
        game = freshGame;

        const channel = client.channels.cache.get(game.channelID);
        const guild = client.guilds.cache.get(game.guildID);

        // --- PROCESS NIGHT ACTIONS ---
        let protectedPlayerIDs = new Set();
        let hunterShot = null;
        let hunterSelfDied = null;
        let deaths = [];
        let savedPlayers = new Set();

        const players = game.players;
        const incStat = (p, stat, amount = 1) => {
            if (p) {
                if (!p.stats) p.stats = {};
                p.stats[stat] = (p.stats[stat] || 0) + amount;
            }
        };
        
        // --- OFFLINE KILL CHECK (Sesten Çıkanları Öldür) ---
        let offlineKillIds = new Set();
        if (game.voiceChannelID) {
            const voiceChannel = guild.channels.cache.get(game.voiceChannelID);
            if (voiceChannel) {
                for (const p of players) {
                    if (p.isAlive && !p.isBot) {
                        if (!voiceChannel.members.has(p.id)) {
                            p.offlineKilled = true;
                            offlineKillIds.add(p.id);
                            if (!deaths.includes(p.id)) deaths.push(p.id);
                        }
                    }
                }
            }
        }

        // --- BUYUCU: Hedefin yeteneğini bloke et ---
        const buyucular = players.filter(p => p.role === "BUYUCU" && p.isAlive && p.actions && p.actions.type === "BLOCK" && p.actions.target !== "skip");
        for (const b of buyucular) {
            const target = players.find(p => p.id === b.actions.target);
            if (target && target.isAlive && target.actions && target.actions.type !== "SKIP") {
                target.actions = { type: "BLOCKED", target: "skip" };
                if (!target.isBot) {
                    const user = await client.users.fetch(target.id).catch(() => null);
                    if (user) sendV2(user, "🪄 **Büyülendin!** Bu gece hiçbir yeteneğini kullanamadın.");
                }
            }
        }

        // --- SAMAN: Hedefi efsunla (Aura/Dedektif'e KÖTÜ/VAMPİR çıksın) ---
        const samanlar = players.filter(p => p.role === "SAMAN" && p.isAlive && p.actions && p.actions.type === "FRAME" && p.actions.target !== "skip");
        for (const s of samanlar) {
            const target = players.find(p => p.id === s.actions.target);
            if (target && target.isAlive) {
                target.isFramed = true;
            }
        }

        protectedPlayerIDs = new Set(
            players
                .filter(p => p.actions && p.actions.type === "PROTECT" && p.actions.target !== "skip")
                .map(p => p.actions.target)
        );

        // --- DOKTOR: korunan hedefleri lastProtectedTarget olarak güncelle ---
        const doctors = players.filter(p => p.role === "DOKTOR" && p.isAlive && p.actions && p.actions.type === "PROTECT" && p.actions.target !== "skip");
        for (const d of doctors) {
            d.lastProtectedTarget = d.actions.target;
        }

        // --- TUZAKCI: ziyaretçileri yakala ---
        const trapperActions = players.filter(p => p.role === "TUZAKCI" && p.isAlive && p.actions && p.actions.type === "TRAP" && p.actions.target !== "skip");
        for (const tr of trapperActions) {
            tr.trapTarget = tr.actions.target;
            // Tuzağa yakalananları bul: bu gece tuzak hedefini ziyaret edenler
            const trapped = players.filter(p => p.isAlive && p.id !== tr.id && p.actions && p.actions.target === tr.actions.target && p.actions.type !== "SKIP");
            for (const victim of trapped) {
                // Yakalananlar bu gece işlem yapamaz - eylemleri iptal
                victim.actions = { type: "TRAPPED", target: "skip" };
                if (!victim.isBot) {
                    const user = await client.users.fetch(victim.id).catch(() => null);
                    if (user) sendV2(user, `🪤 **Tuzağa yakalandın!** Bu gece yaptığın eylem iptal edildi.`);
                }
            }
            if (trapped.length > 0 && !tr.isBot) {
                const user = await client.users.fetch(tr.id).catch(() => null);
                if (user) sendV2(user, `🪤 **Tuzak başarılı!** ${trapped.length} kişi tuzağına yakalandı.`);
            }
        }
        
        game.markModified("players");

        // VAMPIRE KILLS
        const vampireActions = players.filter(p => (p.role === "VAMPIR" || p.role === "VAMPIR_LORDU") && p.actions && p.actions.type === "KILL");

        for (const v of vampireActions) {
            const targetID = v.actions.target;
            const targetPlayer = players.find(p => p.id === targetID);
            
            if (protectedPlayerIDs.has(targetID)) {
                savedPlayers.add(targetID);
            } else if (targetPlayer && (targetPlayer.role === "SERI_KATIL" || targetPlayer.role === "BOMBACI" || targetPlayer.role === "KUNDAKCI" || targetPlayer.role === "VAMPIR_LORDU")) {
                // Seri Katil, Bombacı, Kundakçı ve Vampir Lordu gece vampir/kurt saldırılarına karşı bağışıktır.
            } else {
                if (!deaths.includes(targetID)) {
                    deaths.push(targetID);
                    incStat(v, "kills");
                }
            }
        }

        // --- AVCI: hedefin tarafı ölüm belirler (ammo yok) ---
        const hunterAction = players.find(p => p.role === "AVCI" && p.actions && p.actions.type === "SHOOT");
        if (hunterAction && hunterAction.actions.target !== "skip") {
            const targetID = hunterAction.actions.target;
            const targetPlayer = players.find(p => p.id === targetID);

            if (targetPlayer) {
                const targetIsBad = ["VAMPIR", "SOYTARI", "SERI_KATIL", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(targetPlayer.role);
                if (targetIsBad) {
                    // Hedef kötüyse hedef ölür (Vampir Lordu bağışık)
                    if (targetPlayer.role === "VAMPIR_LORDU") {
                        // Vampir Lordu avcıdan etkilenmez
                    } else if (!deaths.includes(targetID)) {
                        deaths.push(targetID);
                        hunterShot = targetID;
                        incStat(hunterAction, "kills");
                    }
                } else {
                    // Hedef iyiyse HEM AVCI HEM DE HEDEF ölür
                    hunterSelfDied = hunterAction.id;
                    if (!deaths.includes(hunterAction.id)) {
                        deaths.push(hunterAction.id);
                    }
                    if (!deaths.includes(targetID)) {
                        deaths.push(targetID);
                    }
                }
            }
        }

        // --- GÖZCÜ: Hedefi kimlerin ziyaret ettiğini gör ---
        const seerActions = players.filter(p => p.role === "GOZCU" && p.isAlive && p.actions && p.actions.type === "SEE" && p.actions.target !== "skip");
        for (const seer of seerActions) {
            const targetID = seer.actions.target;
            const target = players.find(p => p.id === targetID);
            if (target) {
                const visitors = [];
                for (const p of players) {
                    if (!p.isAlive || !p.actions || p.id === targetID || p.id === seer.id) continue;
                    
                    const actType = p.actions.type;
                    let targetOfTarget = null;
                    if (actType === "SERIAL_KILL") {
                        if (p.actions.targets && p.actions.targets.includes(targetID)) targetOfTarget = targetID;
                    } else if (p.actions.target === targetID) {
                        targetOfTarget = targetID;
                    }

                    if (targetOfTarget === targetID) {
                        visitors.push(`<@${p.id}>`);
                    }
                }

                if (!seer.isBot) {
                    const user = await client.users.fetch(seer.id).catch(() => null);
                    if (user) {
                        if (visitors.length > 0) {
                            await sendV2(user, `> **👁️ Gözcü Raporu**`, `Bu gece <@${targetID}> kişisinin evini gözetledin. Onu şu kişiler ziyaret etti:\n${visitors.join("\n")}`);
                        } else {
                            await sendV2(user, `> **👁️ Gözcü Raporu**`, `Bu gece <@${targetID}> kişisinin evini gözetledin. Onu kimse ziyaret etmedi.`);
                        }
                    }
                }
            }
        }

        // --- AURA: hedefin tarafını öğren ---
        const auraActions = players.filter(p => p.role === "AURA" && p.isAlive && p.actions && p.actions.type === "AURA" && p.actions.target !== "skip");
        for (const a of auraActions) {
            const target = players.find(p => p.id === a.actions.target);
            if (target) {
                const Roles = require('./Roles');
                let side;
                if (target.isFramed) {
                    // Şaman efsunladıysa her zaman KÖTÜ gözükür
                    side = "KÖTÜ";
                } else if (target.role === "VAMPIR_LORDU") {
                    // Vampir Lordu her zaman İYİ gözükür
                    side = "İYİ";
                } else {
                    const roleDef = Roles[target.role];
                    side = roleDef ? (roleDef.side === "GOOD" ? "İYİ" : roleDef.side === "BAD" ? "KÖTÜ" : "TARAFSIZ") : "BİLİNMEYEN";
                }
                if (!a.isBot) {
                    const user = await client.users.fetch(a.id).catch(() => null);
                    if (user) await sendV2(user, `> **✨ Aura Sonucu**`, `<@${target.id}> kişisi **${side}** tarafta!`);
                }
                incStat(a, "checks");
            }
        }


        // --- SERİ KATİL: 2 kişi öldür + cooldown ---
        const serialActions = players.filter(p => p.role === "SERI_KATIL" && p.isAlive && p.actions && p.actions.type === "SERIAL_KILL");
        for (const sk of serialActions) {
            const targets = sk.actions.targets || [];
            for (const tid of targets) {
                if (tid !== "skip") {
                    if (protectedPlayerIDs.has(tid)) {
                        savedPlayers.add(tid);
                    } else {
                        const skTarget = players.find(p => p.id === tid);
                        if (skTarget && skTarget.role === "VAMPIR_LORDU") {
                            // Vampir Lordu seri katile karşı bağışık
                        } else if (!deaths.includes(tid)) {
                            deaths.push(tid);
                            incStat(sk, "kills");
                        }
                    }
                }
            }
            if (targets.length > 0 && targets[0] !== "skip") {
                sk.cooldown = 2;
            }
        }
        for (const p of players) {
            if (p.role === "SERI_KATIL" && (p.cooldown || 0) > 0) {
                p.cooldown -= 1;
            }
        }

        // --- BOMBACI: Mevcut bombaları patlat veya tetikle ---
        const bombers = players.filter(p => p.role === "BOMBACI" && p.isAlive);
        for (const b of bombers) {
            if (b.bombTarget) {
                if (game.dayCount >= b.bombExplodeDay) {
                    const target = players.find(p => p.id === b.bombTarget);
                    // Eğer hedef zaten ölmüşse ve bu gece ölmüyorsa (yani gündüz oylamada öldüyse)
                    // Bombacı patlar.
                    if (target && !target.isAlive) {
                        if (!deaths.includes(b.id)) deaths.push(b.id);
                    } else {
                        // Bomba hedefi öldürür
                        if (!deaths.includes(b.bombTarget)) deaths.push(b.bombTarget);
                    }
                    b.bombTarget = null;
                } else {
                    const target = players.find(p => p.id === b.bombTarget);
                    if (target && !target.isAlive) {
                        // Hedef önceden ölmüşse bombacı patlar
                        if (!deaths.includes(b.id)) deaths.push(b.id);
                        b.bombTarget = null;
                    }
                }
            }
        }
        
        // --- BOMBACI: Yeni bomba yerleştir ---
        const bomberActions = players.filter(p => p.role === "BOMBACI" && p.isAlive && p.actions && p.actions.type === "BOMB" && p.actions.target !== "skip");
        for (const b of bomberActions) {
            if (!b.bombTarget) { // Sadece 1 aktif bombası olabilir
                b.bombTarget = b.actions.target;
                b.bombExplodeDay = game.dayCount + 1;
            }
        }

        // --- KUNDAKCI: benzin dök veya ateşle ---
        const arsonistActions = players.filter(p => p.role === "KUNDAKCI" && p.isAlive && p.actions);
        for (const ar of arsonistActions) {
            if (ar.actions.type === "DOUSE" && ar.actions.target !== "skip") {
                const target = players.find(t => t.id === ar.actions.target);
                if (target && target.isAlive) {
                    target.doused = true;
                    if (!target.isBot) {
                        const user = await client.users.fetch(target.id).catch(() => null);
                        if (user) await sendV2(user, `🔥 **Korkutucu Bir His...**`, `Sabah uyandığında üzerine benzin döküldüğünü fark ettin. Kasabada bir Kundakçı var ve her an ateşe verilebilirsin!`);
                    }
                }
            } else if (ar.actions.type === "IGNITE") {
                const dousedPlayers = players.filter(p => p.isAlive && p.doused);
                for (const dp of dousedPlayers) {
                    if (!deaths.includes(dp.id)) deaths.push(dp.id);
                }
                if (!ar.isBot && dousedPlayers.length > 0) {
                    const user = await client.users.fetch(ar.id).catch(() => null);
                    if (user) sendV2(user, "🔥 **Ateşi yaktın!** Benzin döktüğün herkes bu gece yanarak öldü.");
                }
            }
        }

        // --- ALFA KURT: dönüştürme veya öldürme ---
        const alfaActions = players.filter(p => p.role === "ALFA_KURT" && p.isAlive && p.actions);
        for (const a of alfaActions) {
            if (a.actions.type === "CONVERT" && a.actions.target !== "skip") {
                const target = players.find(t => t.id === a.actions.target);
                if (target && target.isAlive) {
                    target.role = "CIRAK_KURT";
                    a.hasConverted = true;
                    if (!target.isBot) {
                        const user = await client.users.fetch(target.id).catch(() => null);
                        if (user) sendV2(user, "🐺 **Alfa Kurt seni Çırak Kurt olarak dönüştürdü!** Artık kötü taraftasın.");
                    }
                }
            } else if (a.actions.type === "KILL" && a.actions.target !== "skip") {
                const targetPlayer = players.find(t => t.id === a.actions.target);
                if (protectedPlayerIDs.has(a.actions.target)) {
                    savedPlayers.add(a.actions.target);
                } else if (targetPlayer && (targetPlayer.role === "SERI_KATIL" || targetPlayer.role === "BOMBACI" || targetPlayer.role === "KUNDAKCI" || targetPlayer.role === "VAMPIR_LORDU")) {
                    // Katil roller ve Vampir Lordu gece saldırılarına karşı bağışıktır
                } else if (!deaths.includes(a.actions.target)) {
                    deaths.push(a.actions.target);
                }
            }
        }

        // --- DEDEKTİF: Tam rol göster (Yeni Denge) ---
        const detectiveActions = players.filter(p => p.role === "DEDEKTIF" && p.isAlive && p.actions && p.actions.type === "DETECT" && p.actions.target !== "skip");
        for (const d of detectiveActions) {
            const target = players.find(p => p.id === d.actions.target);
            if (target) {
                const Roles = require('./Roles');
                let targetRoleStr = target.role;
                
                // Şaman efsunladıysa her zaman VAMPİR gözükür
                if (target.isFramed) {
                    targetRoleStr = "VAMPIR";
                }
                // Vampir Lordu her zaman KÖYLÜ gözükür
                else if (targetRoleStr === "VAMPIR_LORDU") {
                    targetRoleStr = "KOYLU";
                }
                // Deli kontrolü: Deli ise Dedektif'e sahte rolünü göster
                else if (targetRoleStr === "DELI" && target.fakeRole) {
                    targetRoleStr = target.fakeRole;
                }
                
                const roleDef = Roles[targetRoleStr];
                
                if (!d.isBot) {
                    const user = await client.users.fetch(d.id).catch(() => null);
                    if (user) await sendV2(user, `> **🕵️ Dedektif Raporu**`, `<@${target.id}> kişisinin tam rolü: **${roleDef?.emoji || '?'} ${roleDef?.name || targetRoleStr}**`);
                }
                incStat(d, "checks");
            }
        }

        // --- İZCİ: hedefin hareketini öğren ---
        const scoutActions = players.filter(p => p.role === "IZCI" && p.isAlive && p.actions && p.actions.type === "SCOUT" && p.actions.target !== "skip");
        for (const s of scoutActions) {
            const target = players.find(p => p.id === s.actions.target);
            if (target) {
                let actionDesc = "Bu gece evinden çıkmadı.";
                if (target.actions && target.actions.type && target.actions.type !== "SKIP") {
                    const targetOfTarget = target.actions.target || target.actions.targets?.[0];
                    if (targetOfTarget && targetOfTarget !== "skip") {
                        actionDesc = `Bu gece <@${targetOfTarget}> kişisini ziyaret etti.`;
                    } else {
                        actionDesc = "Bu gece bir yerlere gitti ama kimi ziyaret ettiği belirsiz.";
                    }
                }
                if (!s.isBot) {
                    const user = await client.users.fetch(s.id).catch(() => null);
                    if (user) await sendV2(user, `> **👣 İzci Raporu**`, `<@${target.id}> kişisi için gözlemin:\n${actionDesc}`);
                }
                incStat(s, "checks");
            }
        }

        // --- DELİ: yanlış sonuç ver ---
        const foolActions = players.filter(p => p.role === "DELI" && p.isAlive && p.actions && p.actions.target !== "skip");
        for (const f of foolActions) {
            const target = players.find(p => p.id === f.actions.target);
            if (target && !f.isBot) {
                const user = await client.users.fetch(f.id).catch(() => null);
                if (user) {
                    const Roles = require('./Roles');
                    const actType = f.actions.type; // AURA, DETECT, SCOUT (DOKTOR/PROTECT doesn't report back unless saved, but we don't notify deli for fake saves)
                    
                    if (actType === "AURA" || actType === "INVESTIGATE") {
                        const allSides = ["İYİ", "KÖTÜ", "TARAFSIZ"];
                        const realSide = Roles[target.role]?.side === "GOOD" ? "İYİ" : Roles[target.role]?.side === "BAD" ? "KÖTÜ" : "TARAFSIZ";
                        const wrongSides = allSides.filter(s => s !== realSide);
                        const wrongSide = wrongSides[Math.floor(Math.random() * wrongSides.length)];
                        await sendV2(user, `> **🔍 Araştırma Sonucu**`, `<@${target.id}> kişisi **${wrongSide}** tarafta!`);
                    } else if (actType === "DETECT") {
                        const allRoleKeys = Object.keys(Roles).filter(k => k !== "KOYLU" && k !== target.role);
                        const fakeRole = allRoleKeys[Math.floor(Math.random() * allRoleKeys.length)];
                        const fakeDef = Roles[fakeRole];
                        await sendV2(user, `> **🕵️ Dedektif Raporu**`, `<@${target.id}> kişisinin tam rolü: **${fakeDef?.emoji || '?'} ${fakeDef?.name || fakeRole}**`);
                    } else if (actType === "SCOUT") {
                        const fakeDesc = Math.random() > 0.5 ? "Bu gece evinden çıkmadı." : `Bu gece bir yerlere gitti ama kimi ziyaret ettiği belirsiz.`;
                        await sendV2(user, `> **🏹 İzci Raporu**`, `<@${target.id}> — ${fakeDesc}`);
                    }
                }
            }
        }

        // --- ÇIRAK KURT: susturma ---
        const silenceActions = players.filter(p => p.role === "CIRAK_KURT" && p.isAlive && p.actions && p.actions.type === "SILENCE" && p.actions.target !== "skip");
        for (const ck of silenceActions) {
            const target = players.find(p => p.id === ck.actions.target);
            if (target && target.isAlive) {
                target.isSilenced = true;
            }
        }

        // --- MEDYUM: diriltme ---
        const reviveActions = players.filter(p => p.role === "MEDYUM" && p.isAlive && p.actions && p.actions.type === "REVIVE" && p.actions.target !== "skip");
        for (const m of reviveActions) {
            if (m.hasRevived) continue;
            const target = players.find(p => p.id === m.actions.target);
            if (target && !target.isAlive) {
                target.isAlive = true;
                m.hasRevived = true;
                if (!target.isBot) {
                    const user = await client.users.fetch(target.id).catch(() => null);
                    if (user) sendV2(user, `🔮 **Medyum seni diriltti!** Oyuna kaldığın yerden devam ediyorsun.`);
                }
            }
        }

        // APPLY DEATHS
        // Remove duplicates
        deaths = [...new Set(deaths)];

        const deathsToFetch = deaths.filter(d => !d.startsWith("ai_"));
        const fetchedDeaths = guild ? await guild.members.fetch({ user: deathsToFetch }).catch(() => new Map()) : new Map();
        const deathNames = [];

        let mayorDied = false;
        let deadMayorID = null;

        for (const deadID of deaths) {
            const p = players.find(x => x.id === deadID);
            if (p) {
                p.isAlive = false;
                if (game.mayorID === p.id) {
                    mayorDied = true;
                    deadMayorID = p.id;
                }

                const offlineTag = p.offlineKilled ? " *(Sesten Ayrıldı)*" : "";
                deathNames.push(`${formatPlayer(deadID, game)} ${game.settings.revealRoleOnDeath ? `(${p.role})` : ""}${offlineTag}`);

                // MUTE
                const member = fetchedDeaths.get(deadID);
                if (member && member.voice && !member.user.bot) member.voice.setMute(true).catch(() => { });

                // Doctor Inheritance
                if (p.role === "DOKTOR" && game.settings.doctorInheritance) {
                    const villagers = game.players.filter(pl => pl.isAlive && pl.role === "KOYLU");
                    if (villagers.length > 0) {
                        const heir = villagers[Math.floor(Math.random() * villagers.length)];
                        heir.role = "DOKTOR";
                        const heirMember = await client.users.fetch(heir.id).catch(() => null);
                        if (heirMember) sendV2(heirMember, "🚑 **Önemli Haber:** Kasabanın doktoru öldü! Onun çantası artık sende. Yeni **DOKTOR** sensin!");
                    }
                }
            }
        }
        
        // --- DOKTOR: Başarılı kurtarmaları kaydet ---
        for (const sid of savedPlayers) {
            const doc = players.find(p => p.role === "DOKTOR" && p.actions && p.actions.type === "PROTECT" && p.actions.target === sid);
            if (doc) incStat(doc, "saves");
        }

        game.markModified("players");
        await game.save();

        // Voice Management: Unmute Alive (Day)
        await updateVoiceState(client, game, false);

        const discDuration = game.settings.discussionDuration || 60;
        const votingTimeSeconds = Math.floor((Date.now() + discDuration * 1000) / 1000);
        
        // Check if any vampire successfully killed a target
        let vampireKillSuccess = false;
        const vampireKillActions = players.filter(p => p.role === "VAMPIR" && p.isAlive && p.actions && p.actions.type === "KILL" && p.actions.target !== "skip");
        for (const v of vampireKillActions) {
            if (deaths.includes(v.actions.target)) {
                vampireKillSuccess = true;
                break;
            }
        }
        
        const finalNote = vampireKillSuccess ? game.vampireNote : "";
        const v2Payload = [
            {
                type: 17,
                components: [
                    { type: 10, content: `> **☀️ Gün Doğdu - ${game.dayCount}. Gün**` },
                    { type: 14, divider: true },
                    { type: 10, content: `🗣️ Tartışma Başladı! Şüphelileri konuşun. Oylamaya <t:${votingTimeSeconds}:R> geçilecek.` }
                ]
            }
        ];

        // DOKTOR NOTIFICATIONS
        for (const pid of protectedPlayerIDs) {
            const p = players.find(x => x.id === pid);
            if (p && !p.isBot) {
                const user = await client.users.fetch(p.id).catch(() => null);
                if (user) {
                    if (savedPlayers.has(pid)) {
                        sendV2(user, "🛡️ **Ölümden Döndün!**", "Bu gece saldırıya uğradın ancak bir Doktor tarafından kurtarıldın!");
                    } else {
                        sendV2(user, "🛡️ **Güvende Hissettin**", "Bu gece bir doktor tarafından koruma altındaydın ancak sana saldıran olmadı.");
                    }
                }
            }
        }

        // Send Morning Canvas
        const { renderVampireCanvas } = require('../../../../Utils/VampireCanvas');
        const { AttachmentBuilder } = require('discord.js');
        const files = [];
        try {
            const canvasBuffer = await renderVampireCanvas(client, game, { deaths: deathNames, note: finalNote });
            if (canvasBuffer) {
                files.push(new AttachmentBuilder(canvasBuffer, { name: 'morning.png' }));
                v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://morning.png" } }] });
            }
        } catch(e) {
            console.error("[VampireCanvas] Error rendering morning canvas:", e);
        }

        if (channel) {
            const VoiceManager = require('../../../../Utils/VampireVoiceManager');
            const voiceChannel = client.channels.cache.get(game.voiceChannelID);
            if (voiceChannel) {
                let ttsMsg = `Sabah oldu. Kasaba halkı uyanıyor. `;
                if (deathNames.length > 0) {
                    const cleanNames = deaths.map(id => {
                        const p = players.find(x => x.id === id);
                        let nameStr = p ? (p.fakeName || "Bir oyuncu") : "Bir oyuncu";
                        if (game.settings.revealRoleOnDeath && p) {
                            const RolesLib = require('./Roles');
                            const rName = RolesLib[p.role] ? RolesLib[p.role].name : p.role;
                            nameStr += `, rolü: ${rName}`;
                        }
                        return nameStr;
                    }).join(", ");
                    ttsMsg += `Maalesef dün gece çok kanlı geçti, Ölenler: ${cleanNames}. `;
                } else {
                    ttsMsg += `Dün gece kimse ölmedi! `;
                }
                ttsMsg += "Tartışma zamanı başladı. Birazdan oylamaya geçilecek.";
                VoiceManager.speak(voiceChannel, ttsMsg, "morning.wav");
            }

            await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
        }

        // Reset Note for next night
        game.vampireNote = "";

        // SEER DM


        // CHECK WIN CONDITION PHASE 1
        if (await checkWin(client, game, channel)) return;

        if (mayorDied) {
            module.exports.triggerMayorInheritance(client, game, deadMayorID, "DISCUSSION");
            return;
        }

        setTimeout(async () => {
            const freshGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
            if (freshGame && freshGame.isActive) {
                module.exports.startVoting(client, freshGame);
            }
        }, discDuration * 1000);
    },

    startVoting: async (client, game) => {
        const freshGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
        if (!freshGame || !freshGame.isActive) return;
        game = freshGame;

        game.phase = "VOTING";
        game.players.forEach(p => p.votedFor = null);

        // Voting Timer
        const duration = game.settings.voteDuration || 90;
        const endTime = Date.now() + (duration * 1000); // 60 seconds from now
        game.phaseEndTime = endTime;

        game.markModified("players")
        await game.save();

        // Strict Timeout
        setTimeout(async () => {
            const freshGame = await require("../../../../Core/Database/VampireGame").findById(game._id);
            if (freshGame && freshGame.phase === "VOTING") {
                module.exports.processVoting(client, freshGame);
            }
        }, duration * 1000);

        const channel = client.channels.cache.get(game.channelID);
        if (!channel) return;

        const alivePlayers = game.players.filter(p => p.isAlive);

        // Build Select Menu for Voting
        const options = alivePlayers.map(p => ({ label: p.fakeName || (p.isBot ? `🤖 AI (${p.id.split("_")[2]})` : `Oyuncu ${p.id}`), value: p.id }));

        options.push({ label: "Pas Geç", value: "skip", emoji: "⏭️" });

        const select = new StringSelectMenuBuilder()
            .setCustomId("vk_vote_menu")
            .setPlaceholder("Asılacak kişiyi oyla...")
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        const endTimeSeconds = Math.floor(endTime / 1000);
        const v2Payload = [
            {
                type: 17,
                components: [
                    { type: 10, content: `> **🗳️ Oylama Zamanı** | Bitiş: <t:${endTimeSeconds}:R>\n\nKimi asmak istiyorsunuz? Herkesin 1 oy hakkı var.` },
                    { type: 14, divider: true },
                    { type: 1, components: [ select.toJSON() ] }
                ]
            }
        ];

        const { renderVampireCanvas } = require('../../../../Utils/VampireCanvas');
        const { AttachmentBuilder } = require('discord.js');
        const files = [];
        try {
            const canvasBuffer = await renderVampireCanvas(client, game);
            if (canvasBuffer) {
                files.push(new AttachmentBuilder(canvasBuffer, { name: 'vote_status.png' }));
                v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://vote_status.png" } }] });
            }
        } catch(e) {
            console.error("[VampireCanvas] Error rendering canvas in startVoting:", e);
        }

        const VoiceManager = require('../../../../Utils/VampireVoiceManager');
        const voiceChannel = client.channels.cache.get(game.voiceChannelID);
        if (voiceChannel) {
            VoiceManager.speak(voiceChannel, "Oylama zamanı başladı. Asacağınız kişiyi kararlaştırın!");
        }

        const msg = await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] });
        game.votingMessageID = msg.id;
        game.markModified("votingMessageID"); // Schemaless / mixed types sometimes need this, safe to add.
        await game.save();
    },

    processVoting: async (client, game) => {
        if (game.phase !== "VOTING") return; // prevented double run
        game.phase = "PROCESSING"; // Lock
        await game.save();

        try {
            const votes = {}; // ID -> Count
            let skipCount = 0;

            for (const p of game.players) {
                if (!p.isAlive) continue;
                if (p.votedFor) {
                    const weight = (p.id === game.mayorID || p.role === "KOY_MUHTARI") ? 2 : 1;
                    if (p.votedFor === "skip") skipCount += weight;
                    else votes[p.votedFor] = (votes[p.votedFor] || 0) + weight;
                }
            }

            // Find max
            let maxVotes = 0;
            let candidate = null;
            let tie = false;

            for (const [id, count] of Object.entries(votes)) {
                if (count > maxVotes) {
                    maxVotes = count;
                    candidate = id;
                    tie = false;
                } else if (count === maxVotes) {
                    tie = true;
                }
            }

            // Tie handling or Skip handling?
            // If Skip > MaxVotes -> No one hanged.
            // If Tie -> No one hanged.

            const channel = client.channels.cache.get(game.channelID);

            const { AttachmentBuilder } = require('discord.js');
            const { renderVampireCanvas } = require('../../../../Utils/VampireCanvas');
            
            let text = "Oylama tamamlandı.";
            let executionOpt = { isHanged: false };
            let victim = null;

            if (skipCount >= maxVotes || tie || !candidate) {
                // No one hanged
                text += "\n\nOylama iptal edildi veya kimse asılmadı.";
                const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                const voiceChannel = client.channels.cache.get(game.voiceChannelID);
                if (voiceChannel) {
                    VoiceManager.speak(voiceChannel, `Halk kararsız kaldı. Oylama sonucunda kimse asılmadı.`, "crowd.wav");
                }
            } else {
                // Hang Candidate
                const victimIndex = game.players.findIndex(p => p.id === candidate);
                if (victimIndex === -1) {
                    text += `\n\nHata: Oylanan kişi (${candidate}) bulunamadı.`;
                } else {
                    victim = game.players[victimIndex];
                    victim.isAlive = false;

                    game.markModified("players");
                    await game.save().catch(() => {});

                    // MUTE HANGED
                    const guild = client.guilds.cache.get(game.guildID);
                    if (guild) {
                        const member = await guild.members.fetch(candidate).catch(() => null);
                        if (member && member.voice && !member.user.bot) member.voice.setMute(true).catch(() => { });
                    }

                    // Kötü/Tarafsız birini asanlara doğru oy puanı ver
                    const badRoles = ["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU", "SERI_KATIL", "BOMBACI", "KUNDAKCI", "SOYTARI", "DELI"];
                    if (badRoles.includes(victim.role)) {
                        for (const vp of game.players) {
                            if (vp.isAlive && vp.votedFor === victim.id) {
                                if (!vp.stats) vp.stats = {};
                                vp.stats.correctVotes = (vp.stats.correctVotes || 0) + 1;
                            }
                        }
                    }

                    // Doctor Inheritance (Hanging)
                    if (victim.role === "DOKTOR" && game.settings.doctorInheritance) {
                        const villagers = game.players.filter(pl => pl.isAlive && pl.role === "KOYLU");
                        if (villagers.length > 0) {
                            const heir = villagers[Math.floor(Math.random() * villagers.length)];
                            heir.role = "DOKTOR";
                            const heirMember = await client.users.fetch(heir.id).catch(() => null);
                            if (heirMember) await sendV2(heirMember, "> **🚑 Önemli Haber**", "Kasabanın doktoru asıldı! Onun çantası artık sende. Yeni **DOKTOR** sensin!");
                        }
                    }

                    // Execution Data
                    executionOpt = {
                        isHanged: true,
                        name: formatPlayer(candidate, game),
                        role: game.settings.revealRoleOnDeath ? victim.role : "GİZLİ"
                    };

                    const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                    const voiceChannel = client.channels.cache.get(game.voiceChannelID);
                    if (voiceChannel) {
                        const cleanName = (victim.fakeName || "Bir oyuncu").replace(/[^\w\sçğıöşüÇĞIİÖŞÜ]/g, '');
                        let ttsHang = `Halk kararını verdi. Oylama sonucunda ${cleanName} asıldı!`;
                        if (game.settings.revealRoleOnDeath && victim) {
                            const RolesLib = require('./Roles');
                            const rName = RolesLib[victim.role] ? RolesLib[victim.role].name : victim.role;
                            ttsHang += ` Asılan kişinin rolü: ${rName}.`;
                        }
                        VoiceManager.speak(voiceChannel, ttsHang, "kill.wav");
                    }

                    // Jester Check
                    if (victim.role === "SOYTARI") {
                        text += `\n\n...ama asılan kişi bir **SOYTARI**'dı! 🤡`;
                        await game.save();
                        
                        const v2Payload = [{ type: 17, components: [ { type: 10, content: `> **📊 Oylama Sonucu**` }, { type: 14, divider: true }, { type: 10, content: text } ] }];
                        
                        // Send Canvas
                        const files = [];
                        try {
                            const canvasBuffer = await renderVampireCanvas(client, game, { execution: executionOpt });
                            if (canvasBuffer) {
                                files.push(new AttachmentBuilder(canvasBuffer, { name: 'execution.png' }));
                                v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://execution.png" } }] });
                            }
                        } catch(e) { console.error(e); }
                        
                        await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));

                        module.exports.endGame(client, game, "SOYTARI");
                        return;
                    }

                    // Cellat Check
                    const cellats = game.players.filter(p => p.role === "CELLAT" && p.isAlive);
                    let cellatWon = null;
                    for (const c of cellats) {
                        if (c.cellatTarget === victim.id) {
                            cellatWon = c;
                            break;
                        }
                    }

                    if (cellatWon) {
                        text += `\n\n...ama asılan kişi **CELLAT**'ın hedefiydi! 🪓\n\n🎉 **CELLAT KAZANDI!**`;
                        await game.save();
                        
                        const v2Payload = [{ type: 17, components: [ { type: 10, content: `> **📊 Oylama Sonucu**` }, { type: 14, divider: true }, { type: 10, content: text } ] }];
                        
                        const files = [];
                        try {
                            const canvasBuffer = await renderVampireCanvas(client, game, { execution: executionOpt });
                            if (canvasBuffer) {
                                files.push(new AttachmentBuilder(canvasBuffer, { name: 'execution.png' }));
                                v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://execution.png" } }] });
                            }
                        } catch(e) { console.error(e); }
                        
                        await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));

                        module.exports.endGame(client, game, "CELLAT");
                        return;
                    }
                }
            }

            // Send standard canvas for non-Jester/non-Cellat results
            if (!victim || (victim.role !== "SOYTARI" && !game.players.some(p => p.role === "CELLAT" && p.isAlive && p.cellatTarget === victim.id))) {
                const v2Payload = [{ type: 17, components: [ { type: 10, content: `> **📊 Oylama Sonucu**` }, { type: 14, divider: true }, { type: 10, content: text } ] }];
                const files = [];
                try {
                    const canvasBuffer = await renderVampireCanvas(client, game, { execution: executionOpt });
                    if (canvasBuffer) {
                        files.push(new AttachmentBuilder(canvasBuffer, { name: 'execution.png' }));
                        v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://execution.png" } }] });
                    }
                } catch(e) { console.error(e); }
                
                await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
            }
            if (victim) {
                // Check if victim was Mayor
                const wasMayor = (game.mayorID === victim.id);

                await game.save();

                // CHECK WIN STATS
                if (await checkWin(client, game, channel)) return;

                if (wasMayor) {
                    module.exports.triggerMayorInheritance(client, game, victim.id, "NIGHT");
                    return;
                }

                // Next Night
                setTimeout(async () => {
                    const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                    await VoiceManager.waitUntilIdle(game.guildID, 30000);
                    require("./VampireNightHandler")(client, game);
                }, 5000);
            } else {
                // Next Night immediately if no victim
                setTimeout(async () => {
                    const VoiceManager = require('../../../../Utils/VampireVoiceManager');
                    await VoiceManager.waitUntilIdle(game.guildID, 30000);
                    require("./VampireNightHandler")(client, game);
                }, 5000);
            }
        } catch (err) {
            console.error("Voting Error:", err);
        }
    },
};

async function checkWin(client, game, channel) {
    const alive = game.players.filter(p => p.isAlive);
    if (alive.length === 0) {
        await module.exports.endGame(client, game, "Draw", "Herkes öldü! Oyun berabere bitti.");
        return true;
    }

    const Roles = require("./Roles");
    const vampires = alive.filter(p => ["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(p.role));
    const neutralKillers = alive.filter(p => ["SERI_KATIL", "BOMBACI", "KUNDAKCI"].includes(p.role));
    const goods = alive.filter(p => {
        const r = Roles[p.role];
        return r && r.side === "GOOD";
    });

    // NEUTRAL KILLER WIN:
    if (neutralKillers.length >= 1 && vampires.length === 0 && goods.length === 0) {
        const killer = neutralKillers[0];
        const killerRole = Roles[killer.role];
        await module.exports.endGame(client, game, killer.role, `${killerRole.name} kasabadaki herkesi ortadan kaldırdı ve tek başına zafer kazandı!`);
        return true;
    }

    // GOOD WIN:
    if (vampires.length === 0 && neutralKillers.length === 0) {
        await module.exports.endGame(client, game, "Villager", "Tüm tehditler ortadan kalktı. Kasaba huzura kavuştu!");
        return true;
    }

    // VAMPIRE WIN:
    if (vampires.length > 0) {
        // Eğer hayatta hiç Tarafsız Katil yoksa, Vampirler Köylü sayısına eşit veya fazla olduğunda kazanır.
        if (neutralKillers.length === 0 && vampires.length >= goods.length) {
            await module.exports.endGame(client, game, "Vampire", "Vampirler çoğunluğu ele geçirdi. Kasaba düştü!");
            return true;
        }

        // Eğer hayatta Tarafsız Katil (Seri Katil vb.) varsa:
        if (neutralKillers.length > 0) {
            // 1v1 Düello: 1 Vampir vs 1 Seri Katil (Köylü yok)
            if (vampires.length === 1 && neutralKillers.length === 1 && goods.length === 0) {
                const killer = neutralKillers[0];
                const killerRole = Roles[killer.role];
                await module.exports.endGame(client, game, killer.role, `Son düelloda ${killerRole.name} daha hızlı davrandı ve zafer kazandı!`);
                return true;
            }
            // Yalnızca vampir sayısı tüm oyuncuların (Köylüler + Tarafsız Katiller*2) toplamını aşarsa ezici zafer verilir.
            if (vampires.length > (goods.length + neutralKillers.length * 2)) {
                await module.exports.endGame(client, game, "Vampire", "Vampirler mutlak ezici çoğunluğu ele geçirdi!");
                return true;
            }
        }
    }

    return false;
}

module.exports.endGame = async (client, game, winner, reason = "") => {
    game.isActive = false;
    game.phase = "ENDED";
    await game.save();

    const channel = client.channels.cache.get(game.channelID);
    const winnerText = winner === "Villager" ? "🎉 KÖYLÜLER" : (winner === "Vampire" ? "🧛 VAMPİRLER" : `🤡 ${winner.toUpperCase()}`);
    const reasonText = reason ? `${reason}\n\n` : "";

    // 1. Voice Management & Voice Sound (Instant)
    updateVoiceState(client, game, false).catch(() => {});

    if (game.voiceChannelID) {
        const voiceChannel = client.channels.cache.get(game.voiceChannelID);
        if (voiceChannel) {
            const VoiceManager = require('../../../../Utils/VampireVoiceManager');
            const winSfx = winner === "Villager" ? "village_win.wav" : (winner === "Vampire" ? "wolf.wav" : "neutral_win.wav");
            VoiceManager.speak(voiceChannel, `Oyun sona erdi! Kazanan taraf: ${winner === "Villager" ? "Köylüler" : (winner === "Vampire" ? "Vampirler" : winner)}! Bütün oyunculara teşekkürler.`, winSfx);
        }
    }

    // 2. Generate Canvas & Send Game End Message Immediately (Fast Response!)
    const { renderVampireCanvas } = require('../../../../Utils/VampireCanvas');
    const { AttachmentBuilder } = require('discord.js');
    const files = [];
    
    try {
        const canvasBuffer = await renderVampireCanvas(client, game, {
            endGame: {
                winnerText: winnerText,
                reason: reason
            }
        });
        if (canvasBuffer) {
            files.push(new AttachmentBuilder(canvasBuffer, { name: 'endgame.png' }));
        }
    } catch(e) {
        console.error("Endgame canvas err:", e);
    }

    const v2Payload = [
        {
            type: 17,
            components: [
                { type: 10, content: `> ## ${winnerText} KAZANDI!` },
                { type: 14, divider: true },
                { type: 10, content: `> ${reasonText}` }
            ]
        }
    ];

    if (files.length > 0) {
        v2Payload[0].components.push({ type: 12, items: [{ media: { url: "attachment://endgame.png" } }] });
    }

    if (channel) {
        await channel.send({ components: v2Payload, files, flags: [MessageFlags.IsComponentsV2] }).catch(e => console.error(e));
    }

    // 3. Asynchronous Background Tasks (Restore Nicknames, Stats & ELO Calculation)
    (async () => {
        try {
            // Restore Mute & Text Permissions
            if (game.voiceChannelID) {
                const vChan = client.channels.cache.get(game.voiceChannelID);
                if (vChan) {
                    for (const [id, member] of vChan.members) {
                        if (!member.user.bot && member.voice.serverMute) await member.voice.setMute(false).catch(() => { });
                    }
                    for (const p of game.players) {
                        await vChan.permissionOverwrites.delete(p.id).catch(() => {});
                    }
                    const everyone = vChan.guild.roles.everyone;
                    await vChan.permissionOverwrites.edit(everyone, { SendMessages: null }).catch(() => {});
                }
            }

            // Restore Nicknames
            const guild = client.guilds.cache.get(game.guildID);
            if (guild) {
                for (const p of game.players) {
                    if (p.isBot || !p.fakeName || p.originalName === undefined) continue;
                    const member = await guild.members.fetch(p.id).catch(() => null);
                    if (member && member.manageable) await member.setNickname(p.originalName).catch(() => {});
                }
            }

            // MVP & ELO DB Profile Updates
            const VampireProfile = require('../../../../Core/Database/VampireProfile');
            const Roles = require('./Roles');
            let mvp = null;
            let maxScore = -1;

            const profileUpdates = game.players.filter(p => !p.isBot).map(async (p) => {
                let profile = await VampireProfile.findOne({ id: p.id });
                if (!profile) profile = new VampireProfile({ id: p.id });

                profile.gamesPlayed += 1;
                if (!profile.rolesPlayed) profile.rolesPlayed = {};
                profile.rolesPlayed[p.role] = (profile.rolesPlayed[p.role] || 0) + 1;

                const rDef = Roles[p.role];
                const isWinner = (winner === "Villager" && rDef?.side === "GOOD") || 
                                 (winner === "Vampire" && rDef?.side === "BAD") || 
                                 (winner === p.role);

                if (isWinner) {
                    profile.wins += 1;
                    profile.elo += 20;
                } else {
                    profile.losses += 1;
                    profile.elo = Math.max(0, profile.elo - 10);
                }

                let score = 0;
                if (p.stats) {
                    score += (p.stats.kills || 0) * 3;
                    score += (p.stats.saves || 0) * 4;
                    score += (p.stats.checks || 0) * 1;
                    score += (p.stats.correctVotes || 0) * 2;
                }

                if (isWinner && score > maxScore && score > 0) {
                    maxScore = score;
                    mvp = p;
                }

                await profile.save();
            });

            await Promise.all(profileUpdates);

            if (mvp) {
                const mvpProfile = await VampireProfile.findOne({ id: mvp.id });
                if (mvpProfile) {
                    mvpProfile.mvpCount += 1;
                    mvpProfile.elo += 15;
                    await mvpProfile.save();
                }
            }
        } catch (bgErr) {
            console.error("[VampireGame] Background EndGame Tasks Error:", bgErr);
        }
    })();

    // Disconnect bot voice connection after sound plays
    setTimeout(() => {
        const VoiceManager = require('../../../../Utils/VampireVoiceManager');
        VoiceManager.disconnect(game.guildID);
    }, 30000);
};

async function updateVoiceState(client, game, isNight) {
    if (!game.voiceChannelID) return;
    const channel = client.channels.cache.get(game.voiceChannelID);
    if (!channel) return;

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
