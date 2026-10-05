const VampireGame = require("../../Core/Database/VampireGame");
const Punitives = require("../../Core/Database/Punitives");

module.exports = async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    // 1. Sesten tamamen çıkma durumları (Lobi temizliği)
    if (oldState.channelId && !newState.channelId) {
        try {
            const game = await VampireGame.findOne({ voiceChannelID: oldState.channelId, isActive: true, phase: "LOBBY" });
            if (game) {
                const playerIndex = game.players.findIndex(p => p.id === member.id);
                if (playerIndex !== -1) {
                    game.players.splice(playerIndex, 1);
                    await game.save();

                    const channel = oldState.client.channels.cache.get(game.channelID);
                    if (channel) {
                        const VampireKoylu = require("../../Commands/Prefix/Fun/VampireKoylu");
                        if (game.messageID && VampireKoylu.buildDashboardPayload) {
                            const lobbyMsg = await channel.messages.fetch(game.messageID).catch(() => null);
                            if (lobbyMsg && lobbyMsg.editable) {
                                const payload = VampireKoylu.buildDashboardPayload(game, oldState.client);
                                await lobbyMsg.edit({ components: payload }).catch(() => {});
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("[VampireLobbyCleaner] Sesten çıkış hatası:", e);
        }
    }

    // 2. Herhangi bir sese girme veya ses kanalını değiştirme
    if (newState.channelId) {
        try {
            const activeGame = await VampireGame.findOne({ voiceChannelID: newState.channelId, isActive: true });

            if (activeGame && activeGame.phase !== "LOBBY" && activeGame.phase !== "SETUP") {
                // Aktif Vampir Köylü oyun kanalında
                const pInfo = activeGame.players.find(p => p.id === member.id);
                const isAlive = pInfo && pInfo.isAlive === true;

                if (!isAlive) {
                    // İzleyici veya ölü -> Mute
                    if (!newState.serverMute) {
                        await member.voice.setMute(true, "Vampir Köylü: İzleyici/Ölü").catch(() => {});
                    }
                } else {
                    // Yaşayan oyuncu
                    if (activeGame.phase === "NIGHT" || activeGame.phase === "PROCESSING") {
                        if (!newState.serverMute) {
                            await member.voice.setMute(true, "Vampir Köylü: Gece Aşaması").catch(() => {});
                        }
                    } else if (activeGame.phase === "DAY" || activeGame.phase === "VOTING" || activeGame.phase === "DISCUSSION") {
                        if (newState.serverMute) {
                            await member.voice.setMute(false, "Vampir Köylü: Gündüz Aşaması").catch(() => {});
                        }
                    }
                }
            } else if (oldState.channelId && oldState.channelId !== newState.channelId) {
                // SADECE daha önceki kanalı bir Vampir Köylü oyun kanalı ise mutesini kaldır!
                const oldVkGame = await VampireGame.findOne({ voiceChannelID: oldState.channelId, isActive: true });
                if (oldVkGame && newState.serverMute) {
                    // Yetkili ceza susturması var mı kontrol et
                    const staffMute = await Punitives.findOne({ Member: member.id, Type: "Ses Susturulma", Active: true });
                    const isStaffMuted = staffMute && (!staffMute.Expried || Date.now() < staffMute.Expried);

                    // Eğer yetkili cezası yoksa, VK oyunundan çıktığı için mutesini aç!
                    if (!isStaffMuted) {
                        await member.voice.setMute(false, "Vampir Köylü: VK oyun kanalından başka sese geçti").catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.error("[VampireLobbyCleaner] Ses izleyici kontrol hatası:", e);
        }
    }
};
