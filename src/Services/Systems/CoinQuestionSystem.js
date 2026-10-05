const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require("discord.js");
const Canvas = require('canvas');
const path = require('path');
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const Economy = require("../../Core/Database/Economy");
const client = global.bot;

const fontsPath = path.join(__dirname, "../../Assets/Fonts");
const registerFont = (file, family) => {
    try {
        const fullPath = path.join(fontsPath, file);
        Canvas.registerFont(fullPath, { family });
    } catch (err) {
        console.warn(`Font register failed: ${file} - using default.`);
    }
};

registerFont("LuckiestGuy-Regular.ttf", "luckiest guy");
registerFont("KeepCalm-Medium.ttf", "KeepCalm");
registerFont("Manrope-Bold.ttf", "Bold");
registerFont("Roboto.ttf", "SketchMatch"); 

class CoinQuestionSystem {
    constructor() {
        this.activeQuestion = null;
        this.timeout = null;
        this.currentType = null;
        this.currentIndex = 0;
        this.initialized = false;
        this.currentMessage = null;
        this.gameTerminator = null;
    }

    async init() {
        if (this.initialized) return;
        const config = ConfigManager.get("Economy");
        if (!config || !config.QuestionEnabled) return;

        this.initialized = true;
        if (this.timeout) clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
            this.askQuestion();
        }, 10000);

        this.handleMessageCreate = async (message) => {
            if (message.author.bot || !message.guild || !this.activeQuestion) return;
            const config = ConfigManager.get("Economy");
            if (message.channel.id !== config.QuestionChannel) return;

            if (["CHESTS", "BUTTON_MATH"].includes(this.currentType)) return;

            const content = message.content.trim().toUpperCase();
            const answers = (this.activeQuestion.a || []).map(a => a.toUpperCase());

            if (answers.includes(content)) {
                message.delete().catch(() => { });
                if (this.currentMessage) {
                    this.currentMessage.delete().catch(() => { });
                    this.currentMessage = null;
                }
                if (this.gameTerminator) {
                    clearTimeout(this.gameTerminator);
                    this.gameTerminator = null;
                }
                await this.deliverReward(message);
            }
        };
    }

    async deliverReward(messageOrInteraction) {
        const config = ConfigManager.get("Economy");
        const reward = Number(config.QuestionReward || 5.0);
        const user = messageOrInteraction.user || messageOrInteraction.author;
        const guildId = messageOrInteraction.guildId || messageOrInteraction.guild.id;

        this.activeQuestion = null;
        this.currentType = null;

        await Economy.findOneAndUpdate(
            { guildID: guildId, userID: user.id },
            { $inc: { coin: reward } },
            { upsert: true }
        );

        if (messageOrInteraction.token) {
            const winText = `${ConfigManager.get("Emojis.confetti") || "✨"} **Tebrikler!** ${user}, doğru cevabı verdin ve **${reward.toFixed(1)}** coin kazandın!`;
            if (messageOrInteraction.deferred || messageOrInteraction.replied) {
                await messageOrInteraction.followUp({ content: winText, flags: [1 << 6] }); 
            } else {
                await messageOrInteraction.reply({ content: winText });
            }
        } else {
            const winText = `${ConfigManager.get("Emojis.confetti") || "✨"} **Tebrikler!** ${user}, doğru cevabı verdin ve **${reward.toFixed(1)}** coin kazandın!`;
            const x = await messageOrInteraction.channel.send({ content: winText });
            setTimeout(() => x.delete().catch(() => { }), 6000);
        }
    }

    scheduleNext() {
        const config = ConfigManager.get("Economy");
        const nextTime = config.QuestionInterval || 1800000;

        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.askQuestion();
        }, nextTime);
    }

    async askQuestion() {
        const config = ConfigManager.get("Economy");
        if (!config || !config.QuestionEnabled || !config.QuestionChannel) {
            this.scheduleNext();
            return;
        }

        const channel = client.channels.cache.get(config.QuestionChannel);
        if (!channel) {
            this.scheduleNext();
            return;
        }

        const types = ["REFLEX", "BUTTON_MATH", "CHESTS"];
        const type = types[this.currentIndex];
        this.currentType = type;

        this.currentIndex = (this.currentIndex + 1) % types.length;

        const canvas = Canvas.createCanvas(1080, 400);
        const ctx = canvas.getContext("2d");
        const rewardAmount = Number(config.QuestionReward || 5.0).toFixed(1);

        const drawBase = async () => {
            ctx.beginPath();
            ctx.moveTo(30, 0); ctx.lineTo(1050, 0); ctx.quadraticCurveTo(1080, 0, 1080, 30);
            ctx.lineTo(1080, 370); ctx.quadraticCurveTo(1080, 400, 1050, 400);
            ctx.lineTo(30, 400); ctx.quadraticCurveTo(0, 400, 0, 370);
            ctx.lineTo(0, 30); ctx.quadraticCurveTo(0, 0, 30, 0);
            ctx.closePath();
            ctx.clip();

            ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 1080, 400);
            try {
                const bgUrl = "https://i.pinimg.com/736x/89/a7/c2/89a7c23e603eca351d3a77b6b140a9ee.jpg";
                const background = await Canvas.loadImage(bgUrl);
                ctx.drawImage(background, 0, 0, 1080, 400);
            } catch (e) { }

            ctx.restore();
            ctx.beginPath();
            ctx.globalAlpha = 0.5; ctx.fillStyle = "#000000";
            ctx.roundRect(22, 22, 1036, 356, [50]);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.closePath();
            ctx.stroke();
        };

        const applyText = (text, defaultFontSize, width, font) => {
            let fontSize = defaultFontSize;
            do {
                ctx.font = `${(fontSize -= 1)}px ${font}`;
            } while (ctx.measureText(text).width > width && fontSize > 10);
            return ctx.font;
        };

        const generateAttachment = () => new AttachmentBuilder(canvas.toBuffer(), { name: 'caveria_game.png' });

        let gameContent = "";
        let componentsByRow = [];
        let questionData = {};

        await drawBase();

        if (type === "REFLEX") {
            const kod = Math.random().toString(36).substring(2, 7).toUpperCase() + Math.floor(Math.random() * 999);
            questionData = { q: kod, a: [kod] };

            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.font = applyText("İLK YAZAN SEN OL!", 75, 800, "Bold");
            ctx.fillText("İLK YAZAN SEN OL!", 540, 130);

            ctx.font = applyText(`YAZARSAN ÖDÜL KAZANACAKSIN!`, 40, 700, "Bold");
            ctx.fillText(`YAZARSAN ÖDÜL KAZANACAKSIN!`, 540, 200);

            ctx.fillStyle = "#facc15"; 
            ctx.font = applyText(kod, 110, 800, "Bold");
            ctx.fillText(kod, 540, 310);

            ctx.fillStyle = "#ffffff";
            ctx.font = applyText(`ÖDÜL: ${rewardAmount} COIN`, 45, 500, "Bold");
            ctx.fillText(`ÖDÜL: ${rewardAmount} COIN`, 540, 370);

            gameContent = `**Hızlı Ol ve Kazan**\nAşağıdaki kodu kanala ilk yazan kazanır! Süre: 30 Saniye.`;
        }

        else if (type === "BUTTON_MATH") {
            const n1 = Math.floor(Math.random() * 100) + 1;
            const n2 = Math.floor(Math.random() * 100) + 1;
            const op = Math.random() > 0.5 ? "+" : "-";
            const result = op === "+" ? n1 + n2 : n1 - n2;
            questionData = { winning: result };

            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.font = applyText("İŞLEMİ ÇÖZ!", 75, 800, "Bold");
            ctx.fillText("İŞLEMİ ÇÖZ!", 540, 130);

            ctx.fillStyle = "#facc15";
            ctx.font = applyText(`${n1} ${op} ${n2}`, 130, 900, "Bold");
            ctx.fillText(`${n1} ${op} ${n2}`, 540, 260);

            ctx.fillStyle = "#ffffff";
            ctx.font = applyText(`DOĞRU BUTONA BAS VE ${rewardAmount} COIN KAZAN!`, 45, 900, "Bold");
            ctx.fillText(`DOĞRU BUTONA BAS VE ${rewardAmount} COIN KAZAN!`, 540, 330);

            const options = [result];
            while (options.length < 5) {
                const fake = result + Math.floor(Math.random() * 20) - 10;
                if (!options.includes(fake)) options.push(fake);
            }
            options.sort(() => Math.random() - 0.5);

            const row = new ActionRowBuilder().addComponents(
                options.map(opt => new ButtonBuilder().setCustomId(`math_${opt}`).setLabel(`${opt}`).setStyle(ButtonStyle.Success))
            );
            componentsByRow = [row];
            gameContent = `**Matematik Oyunu**\nDoğru sonucu bul ve kazan! Süreniz: 30 Saniye.`;
        }
        else if (type === "CHESTS") {
            const winningChest = Math.floor(Math.random() * 5) + 1;
            questionData = { winning: winningChest };

            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.font = applyText("DOĞRU KUTUYU BUL!", 75, 800, "Bold");
            ctx.fillText("DOĞRU KUTUYU BUL!", 540, 130);

            ctx.fillStyle = "#facc15";
            ctx.font = applyText(`BİR KUTUYU SEÇ VE ŞANSINI DENE!`, 55, 800, "luckiest guy");
            ctx.fillText(`BİR KUTUYU SEÇ VE ŞANSINI DENE!`, 540, 230);

            ctx.fillStyle = "#ffffff";
            ctx.font = applyText(`ÖDÜL: ${rewardAmount} COIN | TEK HAKKIN VAR!`, 40, 900, "Bold");
            ctx.fillText(`ÖDÜL: ${rewardAmount} COIN | TEK HAKKIN VAR!`, 540, 330);

            const row = new ActionRowBuilder().addComponents(
                [1, 2, 3, 4, 5].map(n => new ButtonBuilder().setCustomId(`chest_${n}`).setEmoji((ConfigManager.get("Emojis.giftbox") || "✨")).setStyle(ButtonStyle.Secondary))
            );
            componentsByRow = [row];
            gameContent = `**Doğru KUTUYU Bul!**\nAşağıdaki kutulardan ödüllü olanı bul ve kazan! Süreniz: 30 Saniye.`;
        }



        this.activeQuestion = questionData;
        const attachment = generateAttachment();
        const msg = this.currentMessage = await channel.send({ content: gameContent, files: [attachment], components: componentsByRow });

        if (this.gameTerminator) clearTimeout(this.gameTerminator);
        this.gameTerminator = setTimeout(() => {
            if (this.activeQuestion === questionData) {
                this.activeQuestion = null;
                this.currentType = null;
                this.currentMessage = null;
                this.gameTerminator = null;
                msg.delete().catch(() => { });
            }
        }, 30000);

        if (componentsByRow.length > 0) {
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
            const tapped = new Set();

            collector.on("collect", async (i) => {
                if (tapped.has(i.user.id)) return i.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Zaten bir seçim yaptın!", flags: [64] }).catch(() => {});
                tapped.add(i.user.id);

                const choice = parseInt(i.customId.split("_")[1]);
                if (choice === questionData.winning) {
                    if (this.gameTerminator) {
                        clearTimeout(this.gameTerminator);
                        this.gameTerminator = null;
                    }
                    collector.stop("winner");

                    if (this.currentMessage) {
                        this.currentMessage.delete().catch(() => { });
                        this.currentMessage = null;
                    }

                    await this.deliverReward(i).catch(() => {});
                } else {
                    await i.reply({ content: (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Maalesef bu kasa boş!", flags: [64] }).catch(() => {});
                }
            });

            collector.on("end", (c, r) => {
                if (r !== "winner") msg.delete().catch(() => { });
            });
        }

        this.scheduleNext();
    }
}

module.exports = new CoinQuestionSystem();
