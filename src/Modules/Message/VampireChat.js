const VampireGame = require("../../Core/Database/VampireGame");
const { MessageFlags } = require("discord.js");
const client = global.bot;

module.exports = async (message) => {
    if (!message.guild && !message.author.bot) {
        try {
            const game = await VampireGame.findOne({
                isActive: true,
                phase: "NIGHT",
                "players": {
                    $elemMatch: {
                        id: message.author.id,
                        role: { $in: ["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"] },
                        isAlive: true
                    }
                }
            });

            if (!game) return;

            const vampires = game.players.filter(p => ["VAMPIR", "ALFA_KURT", "CIRAK_KURT", "SAMAN", "BUYUCU", "VAMPIR_LORDU"].includes(p.role) && p.isAlive && p.id !== message.author.id);
            if (vampires.length === 0) return;

            const guild = client.guilds.cache.get(game.guildID);
            if (!guild) return;

            const content = message.content;
            const authorId = message.author.id;

            // Components V2 payload
            const v2Payload = [
                {
                    type: 17,
                    accent_color: 0x8B0000,
                    components: [
                        { type: 10, content: `> 🐺 **[Kötüler Sohbeti]**` },
                        { type: 14, divider: true },
                        { type: 10, content: `<@${authorId}>: ${content}` }
                    ]
                }
            ];

            for (const v of vampires) {
                const member = guild.members.cache.get(v.id) || await guild.members.fetch(v.id).catch(() => null);
                if (member) {
                    await member.send({ components: v2Payload, flags: [MessageFlags.IsComponentsV2] }).catch(() => { });
                }
            }

            await message.react("🐺").catch(() => { });

        } catch (err) {
            console.error("Vampire Chat Error:", err);
        }
    }
};

module.exports.conf = {
    name: "VampireChat"
};
