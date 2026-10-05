const { MessageFlags } = require("discord.js");
const MonopolyGame = require("../../Core/Database/MonopolyGame");
const MonopolyProfile = require("../../Core/Database/MonopolyProfile");
const MonopolyGameService = require("../../Services/Fun/MonopolyGameService");

const PLAYER_COLORS = [
    "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899",
    "#14b8a6", "#6366f1", "#84cc16", "#06b6d4", "#f43f5e", "#d97706",
    "#64748b", "#10b981", "#8b5cf6", "#f97316", "#0284c7", "#e11d48"
];

const SURPRISE_CARDS = [
    { text: "🎁 Piyango kazandınız! Bankadan **+$150** aldınız.", balanceChange: 150 },
    { text: "🧾 Elektrik ve su faturası ödediniz: **-$80**.", balanceChange: -80 },
    { text: "🚀 Şanslı gününüzdesiniz! Bankadan **+$200** ödül.", balanceChange: 200 },
    { text: "⚠️ Hız cezası yediniz: **-$50** ödediniz.", balanceChange: -50 },
    { text: "🎂 Doğum gününüz kutlu olsun! Bankadan **+$100** hediye.", balanceChange: 100 },
    { text: "🛠️ Evinizde tadilat yaptırdınız: **-$120** masraf.", balanceChange: -120 }
];

module.exports = async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    const cid = interaction.customId || "";
    if (!cid.startsWith("monopoly_")) return;

    const parts = cid.split("_");
    const action = parts[1];
    const gameId = parts[2];

    const game = await MonopolyGame.findById(gameId).catch(() => null);
    if (!game) {
        return interaction.reply({ content: "❌ Monopoly oyunu veritabanında bulunamadı veya sonlandırılmış.", flags: [MessageFlags.Ephemeral] });
    }

    const uid = interaction.user.id;

    // 1. JOIN LOBBY
    if (action === "join") {
        if (game.status !== "LOBBY") {
            return interaction.reply({ content: "❌ Oyun çoktan başladı!", flags: [MessageFlags.Ephemeral] });
        }
        if (game.players.some(p => p.userID === uid)) {
            return interaction.reply({ content: "⚠️ Zaten oyundasınız!", flags: [MessageFlags.Ephemeral] });
        }
        if (game.players.length >= 18) {
            return interaction.reply({ content: "❌ Lobi maksimum kapasiteye (18 Oyuncu) ulaştı!", flags: [MessageFlags.Ephemeral] });
        }

        const color = PLAYER_COLORS[game.players.length % PLAYER_COLORS.length];
        game.players.push({
            userID: uid,
            balance: 1500,
            position: 0,
            inJail: false,
            jailTurns: 0,
            isBankrupt: false,
            color: color
        });

        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const lobbyPayload = await MonopolyGameService.renderLobbyPanel(game, interaction.client);
        return interaction.message.edit(lobbyPayload).catch(() => {});
    }

    // 2. LEAVE LOBBY
    if (action === "leave") {
        if (game.status !== "LOBBY") {
            return interaction.reply({ content: "❌ Başlayan oyundan ayrılamazsınız.", flags: [MessageFlags.Ephemeral] });
        }
        if (!game.players.some(p => p.userID === uid)) {
            return interaction.reply({ content: "⚠️ Lobide bulunmuyorsunuz.", flags: [MessageFlags.Ephemeral] });
        }

        game.players = game.players.filter(p => p.userID !== uid);
        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const lobbyPayload = await MonopolyGameService.renderLobbyPanel(game, interaction.client);
        return interaction.message.edit(lobbyPayload).catch(() => {});
    }

    // 3. CANCEL LOBBY
    if (action === "cancel") {
        if (game.hostID !== uid) {
            return interaction.reply({ content: "❌ Lobiyi sadece kurucu iptal edebilir.", flags: [MessageFlags.Ephemeral] });
        }
        await MonopolyGame.findByIdAndDelete(gameId);
        return interaction.update({ components: [{ type: 17, components: [{ type: 10, content: "❌ Monopoly lobisi iptal edildi." }] }] });
    }

    // 4. START GAME
    if (action === "start") {
        if (game.hostID !== uid) {
            return interaction.reply({ content: "❌ Oyunu sadece kurucu başlatabilir.", flags: [MessageFlags.Ephemeral] });
        }
        if (game.players.length < 2) {
            return interaction.reply({ content: "❌ Oyunu başlatmak için en az 2 oyuncu gerekiyor!", flags: [MessageFlags.Ephemeral] });
        }

        game.tiles = MonopolyGameService.generateTiles(game.players.length);
        game.status = "PLAYING";
        game.turnIndex = 0;
        game.turnDeadline = new Date(Date.now() + 30000); // 30 seconds limit!
        game.lastActionLog = `🚀 Oyun başladı! İlk tur <@${game.players[0].userID}> oyuncusunda.`;

        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const gamePayload = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(gamePayload).catch(() => {});
    }

    // --- GAME ACTIONS (Only active player) ---
    const activePlayer = game.players[game.turnIndex];
    if (!activePlayer || activePlayer.userID !== uid) {
        return interaction.reply({ content: `❌ Şu an sizin sıranız değil! Sıra: <@${activePlayer ? activePlayer.userID : ""}>`, flags: [MessageFlags.Ephemeral] });
    }

    // 5. ROLL DICE
    if (action === "roll") {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const rollSum = d1 + d2;
        const isDouble = d1 === d2;

        game.lastDice = [d1, d2];
        const userTag = interaction.user.username;

        // Jail Logic Check
        if (activePlayer.inJail) {
            if (isDouble) {
                activePlayer.inJail = false;
                activePlayer.jailTurns = 0;
                game.lastActionLog = `🎲 ${userTag} çift zar (${d1}-${d2}) atarak Karantinadan çıktı!`;
            } else {
                activePlayer.jailTurns += 1;
                if (activePlayer.jailTurns >= 3) {
                    activePlayer.inJail = false;
                    activePlayer.jailTurns = 0;
                    activePlayer.balance = Math.max(0, activePlayer.balance - 50);
                    game.lastActionLog = `⛓️ ${userTag} 3 tur bekledi ve $50 kefalet ödeyerek serbest kaldı. Zarlar: (${d1}-${d2})`;
                } else {
                    game.lastActionLog = `⛓️ ${userTag} zarları attı (${d1}-${d2}) ancak çift gelmedi. Karantinada kalmaya devam ediyor. (${activePlayer.jailTurns}/3)`;
                    await game.save();
                    await interaction.deferUpdate().catch(() => {});
                    const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
                    return interaction.message.edit(panel).catch(() => {});
                }
            }
        }

        // Advance position
        const oldPos = activePlayer.position;
        const totalTiles = game.tiles.length;
        const newPos = (oldPos + rollSum) % totalTiles;

        // Pass GO Salary
        let salaryText = "";
        if (newPos < oldPos) {
            activePlayer.balance += 200;
            salaryText = " (Başlangıçtan geçti +$200)";
        }

        activePlayer.position = newPos;
        const currentTile = game.tiles[newPos];

        let actionResult = `🎲 ${userTag} zar attı: **${d1}-${d2}** (${rollSum} ilerledi)${salaryText}. Durulan kare: **${currentTile.name}**.`;

        // Handle Landing Tile Actions
        if (currentTile.type === "GO_TO_JAIL") {
            const sideCount = Math.floor(totalTiles / 4);
            activePlayer.position = sideCount; // Jail Index
            activePlayer.inJail = true;
            activePlayer.jailTurns = 0;
            actionResult += ` 🚨 Hapse girdiniz!`;
        } else if (currentTile.type === "TAX") {
            const taxAmount = Math.floor(activePlayer.balance * 0.10);
            activePlayer.balance = Math.max(0, activePlayer.balance - taxAmount);
            actionResult += ` 💰 %10 Vergi Dairesi: **-$${taxAmount}** ödendi.`;
        } else if (currentTile.type === "CHANCE") {
            const card = SURPRISE_CARDS[Math.floor(Math.random() * SURPRISE_CARDS.length)];
            activePlayer.balance = Math.max(0, activePlayer.balance + card.balanceChange);
            actionResult += ` 🃏 Şans Kartı: ${card.text}`;
        } else if (currentTile.type === "PROPERTY" && currentTile.ownerID && currentTile.ownerID !== uid) {
            const owner = game.players.find(p => p.userID === currentTile.ownerID);
            if (owner && !owner.isBankrupt) {
                const rentAmount = currentTile.rent * (1 + currentTile.level * 0.5);
                activePlayer.balance -= rentAmount;
                owner.balance += rentAmount;

                actionResult += ` 💸 <@${owner.userID}> mülküne basıldı! **-$${rentAmount}** kira ödendi.`;

                // Bankruptcy check
                if (activePlayer.balance <= 0) {
                    activePlayer.isBankrupt = true;
                    actionResult += ` 🔴 ${userTag} iflas etti!`;
                }
            }
        }

        game.lastActionLog = actionResult;
        game.markModified("tiles");
        game.markModified("players");
        await game.save();

        await interaction.deferUpdate().catch(() => {});
        const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(panel).catch(() => {});
    }

    // 6. BUY PROPERTY
    if (action === "buy") {
        const activeTile = game.tiles[activePlayer.position];
        if (!activeTile || activeTile.type !== "PROPERTY") {
            return interaction.reply({ content: "❌ Satın alınabilir bir mülk üzerinde değilsiniz.", flags: [MessageFlags.Ephemeral] });
        }
        if (activeTile.ownerID) {
            return interaction.reply({ content: "⚠️ Bu mülk zaten satın alınmış!", flags: [MessageFlags.Ephemeral] });
        }
        if (activePlayer.balance < activeTile.price) {
            return interaction.reply({ content: `❌ Yetersiz bakiye! Gerekli: $${activeTile.price}`, flags: [MessageFlags.Ephemeral] });
        }

        activePlayer.balance -= activeTile.price;
        activeTile.ownerID = uid;
        activeTile.level = 0;

        game.lastActionLog = `🏠 ${interaction.user.username}, **${activeTile.name}** mülkünü **$${activeTile.price}** tutarına satın aldı!`;

        // Update Stats Profile
        await MonopolyProfile.findOneAndUpdate(
            { userID: uid },
            { $inc: { propertiesBought: 1 } },
            { upsert: true }
        );

        game.markModified("tiles");
        game.markModified("players");
        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(panel).catch(() => {});
    }

    // 7. UPGRADE PROPERTY
    if (action === "upgrade") {
        const activeTile = game.tiles[activePlayer.position];
        if (!activeTile || activeTile.ownerID !== uid) {
            return interaction.reply({ content: "❌ Size ait bir mülk üzerinde değilsiniz.", flags: [MessageFlags.Ephemeral] });
        }
        if (activeTile.level >= 5) {
            return interaction.reply({ content: "⚠️ Bu mülk maksimum seviyeye (Otel) ulaşmış!", flags: [MessageFlags.Ephemeral] });
        }

        const cost = Math.floor(activeTile.price * 0.5);
        if (activePlayer.balance < cost) {
            return interaction.reply({ content: `❌ Yetersiz bakiye! Geliştirme ücreti: $${cost}`, flags: [MessageFlags.Ephemeral] });
        }

        activePlayer.balance -= cost;
        activeTile.level += 1;

        const lvlName = activeTile.level === 5 ? "🏨 OTEL" : `🏠 Ev (Seviye ${activeTile.level})`;
        game.lastActionLog = `⬆️ ${interaction.user.username}, **${activeTile.name}** mülkünü geliştirdi! Yeni Seviye: **${lvlName}**`;

        game.markModified("tiles");
        game.markModified("players");
        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(panel).catch(() => {});
    }

    // 8. AIRPORT FAST TRAVEL
    if (action === "airport") {
        const activeTile = game.tiles[activePlayer.position];
        if (!activeTile || activeTile.type !== "AIRPORT") {
            return interaction.reply({ content: "❌ Havaalanı karesinde değilsiniz.", flags: [MessageFlags.Ephemeral] });
        }

        // Fast travel to next available unowned property
        const unownedProp = game.tiles.find(t => t.type === "PROPERTY" && !t.ownerID);
        if (unownedProp) {
            activePlayer.position = unownedProp.index;
            game.lastActionLog = `✈️ ${interaction.user.username} Havaalanından uçuş yaparak boş mülk olan **${unownedProp.name}** karesine indi!`;
        } else {
            game.lastActionLog = `✈️ ${interaction.user.username} Havaalanından uçuş yaptı!`;
        }

        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(panel).catch(() => {});
    }

    // 9. END TURN
    if (action === "endturn") {
        const totalPlayers = game.players.length;
        let nextIndex = (game.turnIndex + 1) % totalPlayers;

        // Skip bankrupt players
        let attempts = 0;
        while (game.players[nextIndex].isBankrupt && attempts < totalPlayers) {
            nextIndex = (nextIndex + 1) % totalPlayers;
            attempts++;
        }

        // Check Winner (Only 1 non-bankrupt player left)
        const activePlayers = game.players.filter(p => !p.isBankrupt);
        if (activePlayers.length <= 1) {
            const winner = activePlayers[0];
            game.status = "FINISHED";
            game.winnerID = winner ? winner.userID : null;
            game.lastActionLog = `🏆 OYUN BİTTİ! KAZANAN: <@${winner ? winner.userID : "Bilinmiyor"}>!`;

            if (winner) {
                await MonopolyProfile.findOneAndUpdate(
                    { userID: winner.userID },
                    { $inc: { wins: 1, totalMoneyEarned: winner.balance } },
                    { upsert: true }
                );
                const Economy = require("../../Core/Database/Economy");
                await Economy.updateOne(
                    { userID: winner.userID },
                    { $inc: { coin: 500 } },
                    { upsert: true }
                ).catch(() => {});
            }

            await game.save();
            await interaction.deferUpdate().catch(() => {});
            const finalPanel = await MonopolyGameService.renderGamePanel(game, interaction.client);
            return interaction.message.edit(finalPanel).catch(() => {});
        }

        game.turnIndex = nextIndex;
        game.turnDeadline = new Date(Date.now() + 30000); // Reset 30s deadline
        const nextUser = interaction.client.users.cache.get(game.players[nextIndex].userID);
        game.lastActionLog = `⏭️ Sıra <@${nextUser ? nextUser.id : ""}> oyuncusuna geçti. (Hamle süresi: 30s)`;

        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(panel).catch(() => {});
    }

    // 10. BANKRUPT
    if (action === "bankrupt") {
        activePlayer.isBankrupt = true;

        // Release properties
        game.tiles.forEach(t => {
            if (t.ownerID === uid) {
                t.ownerID = null;
                t.level = 0;
            }
        });

        const activePlayers = game.players.filter(p => !p.isBankrupt);
        if (activePlayers.length <= 1) {
            const winner = activePlayers[0];
            game.status = "FINISHED";
            game.winnerID = winner ? winner.userID : null;
            game.lastActionLog = `🏳️ ${interaction.user.username} iflas etti! 🏆 OYUN BİTTİ! KAZANAN: <@${winner ? winner.userID : ""}> (+500 Coin Ödül)!`;

            if (winner) {
                await MonopolyProfile.findOneAndUpdate(
                    { userID: winner.userID },
                    { $inc: { wins: 1, totalMoneyEarned: winner.balance } },
                    { upsert: true }
                );
                const Economy = require("../../Core/Database/Economy");
                await Economy.updateOne(
                    { userID: winner.userID },
                    { $inc: { coin: 500 } },
                    { upsert: true }
                ).catch(() => {});
            }

            await game.save();
            await interaction.deferUpdate().catch(() => {});
            const finalPanel = await MonopolyGameService.renderGamePanel(game, interaction.client);
            return interaction.message.edit(finalPanel).catch(() => {});
        }

        let nextIndex = (game.turnIndex + 1) % game.players.length;
        while (game.players[nextIndex].isBankrupt) {
            nextIndex = (nextIndex + 1) % game.players.length;
        }
        game.turnIndex = nextIndex;
        game.turnDeadline = new Date(Date.now() + 30000);

        game.lastActionLog = `🏳️ ${interaction.user.username} iflas etti ve elendi. Sıra <@${game.players[nextIndex].userID}> oyuncusunda.`;

        await game.save();
        await interaction.deferUpdate().catch(() => {});
        const panel = await MonopolyGameService.renderGamePanel(game, interaction.client);
        return interaction.message.edit(panel).catch(() => {});
    }
};
