const { MessageFlags, AttachmentBuilder } = require("discord.js");
const MonopolyGame = require("../../Core/Database/MonopolyGame");
const MonopolyProfile = require("../../Core/Database/MonopolyProfile");
const MonopolyCanvasService = require("./MonopolyCanvasService");

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
    { text: "🎂 Doğum gününüz kutlu olsun! Herkesten **+$50** tebrik hediyesi.", balanceChange: 100 },
    { text: "🛠️ Evinizde tadilat yaptırdınız: **-$120** masraf.", balanceChange: -120 }
];

class MonopolyGameService {
    static generateTiles(playerCount) {
        let totalTiles = 20;
        if (playerCount > 14) totalTiles = 44;
        else if (playerCount > 8) totalTiles = 36;
        else if (playerCount > 4) totalTiles = 28;

        const sideCount = Math.floor(totalTiles / 4);

        const turkeyCities = [
            "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Trabzon", "Eskişehir",
            "Gaziantep", "Konya", "Samsun", "Muğla", "Kayseri", "Mersin", "Diyarbakır", "Denizli",
            "Sakarya", "Erzurum", "Rize", "Çanakkale", "Balıkesir", "Malatya", "Ordu", "Hatay",
            "Aydın", "Manisa", "Kocaeli", "Sivas", "Tekirdağ", "Afyon", "Mardin", "Van", "Kahramanmaraş",
            "Zonguldak", "Elazığ", "Giresun", "Kastamonu", "Yalova", "Isparta", "Tokat", "Sinop", "Bolu"
        ];

        const shuffledCities = [...turkeyCities].sort(() => Math.random() - 0.5);

        const colorGroups = [
            "#94a3b8", "#78350f", "#0284c7", "#db2777",
            "#ea580c", "#dc2626", "#eab308", "#16a34a"
        ];

        const tiles = [];
        let propIndex = 0;

        for (let i = 0; i < totalTiles; i++) {
            if (i === 0) {
                tiles.push({ index: 0, name: "BAŞLANGIÇ", type: "GO", price: 0, rent: 0 });
            } else if (i === sideCount) {
                tiles.push({ index: sideCount, name: "KARANTİNA / HAPİSHANE", type: "JAIL", price: 0, rent: 0 });
            } else if (i === sideCount * 2) {
                tiles.push({ index: sideCount * 2, name: "TATİL YERİ", type: "VACATION", price: 0, rent: 0 });
            } else if (i === sideCount * 3) {
                tiles.push({ index: sideCount * 3, name: "HAPSE GİT", type: "GO_TO_JAIL", price: 0, rent: 0 });
            } else if (i === 5 || i === sideCount + 4) {
                tiles.push({ index: i, name: "SÜRPRİZ KART", type: "CHANCE", price: 0, rent: 0 });
            } else if (i === sideCount * 2 + 3) {
                tiles.push({ index: i, name: "HAVAALANI", type: "AIRPORT", price: 0, rent: 0 });
            } else if (i === sideCount * 3 + 3) {
                tiles.push({ index: i, name: "VERGİ DAİRESİ %10", type: "TAX", price: 0, rent: 0 });
            } else {
                const name = shuffledCities[propIndex % shuffledCities.length];
                const colorGroup = colorGroups[Math.floor(propIndex / 3) % colorGroups.length];
                const price = 100 + (propIndex + 1) * 25;
                const rent = Math.floor(price * 0.25);
                tiles.push({
                    index: i,
                    name: name,
                    type: "PROPERTY",
                    price: price,
                    rent: rent,
                    colorGroup: colorGroup,
                    ownerID: null,
                    level: 0
                });
                propIndex++;
            }
        }

        return tiles;
    }

    static async renderLobbyPanel(game, client) {
        let hostUser = client.users.cache.get(game.hostID);
        if (!hostUser) hostUser = await client.users.fetch(game.hostID).catch(() => null);

        const playerListStr = game.players.length > 0
            ? (await Promise.all(game.players.map(async (p, idx) => {
                let u = client.users.cache.get(p.userID);
                if (!u) u = await client.users.fetch(p.userID).catch(() => null);
                return `> **${idx + 1}.** ${u ? u.toString() : `<@${p.userID}>`} (\`$${p.balance}\`)`;
            }))).join("\n")
            : "> -# *Henüz kimse katılmadı.*";

        const components = [
            {
                type: 10,
                content: `> ## 🎲 CAVERIAPOLY LOBİSİ\n> -# Oyuna katılmak için **Katıl** butonuna tıklayın. Lobi kurucusu oyunu başlatabilir.`
            },
            { type: 14, spacing: 1, divider: true },
            {
                type: 10,
                content: `> **Kurucu:** ${hostUser ? hostUser.toString() : `<@${game.hostID}>`}\n> **Katılan Oyuncular (${game.players.length}/18):**\n${playerListStr}`
            },
            { type: 14, spacing: 1, divider: true },
            {
                type: 1,
                components: [
                    { type: 2, style: 3, custom_id: `monopoly_join_${game._id}`, label: "🎮 Oyuna Katıl" },
                    { type: 2, style: 4, custom_id: `monopoly_leave_${game._id}`, label: "❌ Ayrıl" },
                    { type: 2, style: 1, custom_id: `monopoly_start_${game._id}`, label: "🚀 Oyunu Başlat" },
                    { type: 2, style: 2, custom_id: `monopoly_cancel_${game._id}`, label: "🗑️ İptal Et" }
                ]
            }
        ];

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components }]
        };
    }

    static async renderGamePanel(game, client) {
        const boardBuffer = await MonopolyCanvasService.renderBoard(game, client);
        const attachment = new AttachmentBuilder(boardBuffer, { name: "monopoly_board.png" });

        const activePlayer = game.players[game.turnIndex];
        let activeUser = activePlayer ? client.users.cache.get(activePlayer.userID) : null;
        if (activePlayer && !activeUser) activeUser = await client.users.fetch(activePlayer.userID).catch(() => null);

        const activeTile = game.tiles[activePlayer ? activePlayer.position : 0];

        // Player Buttons
        const actionRow = {
            type: 1,
            components: [
                { type: 2, style: 1, custom_id: `monopoly_roll_${game._id}`, label: "🎲 Zar At" }
            ]
        };

        // Property Buy / Upgrade options
        if (activeTile && activeTile.type === "PROPERTY" && activePlayer) {
            if (!activeTile.ownerID && activePlayer.balance >= activeTile.price) {
                actionRow.components.push({ type: 2, style: 3, custom_id: `monopoly_buy_${game._id}`, label: `🏠 Satın Al ($${activeTile.price})` });
            } else if (activeTile.ownerID === activePlayer.userID && activeTile.level < 5) {
                const upgradeCost = Math.floor(activeTile.price * 0.5);
                if (activePlayer.balance >= upgradeCost) {
                    actionRow.components.push({ type: 2, style: 3, custom_id: `monopoly_upgrade_${game._id}`, label: `⬆️ Geliştir ($${upgradeCost})` });
                }
            }
        } else if (activeTile && activeTile.type === "AIRPORT") {
            actionRow.components.push({ type: 2, style: 1, custom_id: `monopoly_airport_${game._id}`, label: "✈️ Hızlı Uçuş Yap" });
        }

        actionRow.components.push({ type: 2, style: 2, custom_id: `monopoly_endturn_${game._id}`, label: "⏭️ Turu Bitir" });
        actionRow.components.push({ type: 2, style: 4, custom_id: `monopoly_bankrupt_${game._id}`, label: "🏳️ İflas Et" });

        const playerListFormatted = (await Promise.all(game.players.map(async (p, idx) => {
            let u = client.users.cache.get(p.userID);
            if (!u) u = await client.users.fetch(p.userID).catch(() => null);
            const isTurn = idx === game.turnIndex;
            const statusStr = p.isBankrupt ? "🔴 İflas Etti" : (p.inJail ? "⛓️ Karantinada" : `Kare #${p.position}`);
            return `> ${isTurn ? "👉 " : ""}${u ? u.username : p.userID}: **$${p.balance}** (${statusStr})`;
        }))).join("\n");

        const components = [
            {
                type: 12,
                items: [{ media: { url: "attachment://monopoly_board.png" } }]
            },
            { type: 14, spacing: 1, divider: true },
            {
                type: 10,
                content: `> ## 🎲 CAVERIAPOLY DEVAM EDİYOR\n> ⏳ **Sıradaki Oyuncu:** ${activeUser ? activeUser.toString() : "Bilinmiyor"} (Hamle Süresi: **30 Saniye**)\n> 📌 **Son Durum:** ${game.lastActionLog}\n\n> ### 📊 Oyuncu Bakiyeleri:\n${playerListFormatted}`
            },
            { type: 14, spacing: 1, divider: true },
            actionRow
        ];

        return {
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components }],
            files: [attachment]
        };
    }
}

module.exports = MonopolyGameService;
