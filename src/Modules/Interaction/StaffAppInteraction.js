const { MessageFlags, ChannelType } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const LevelUtils = require("../../Services/Stats/LevelUtils");
const StatHistory = require("../../Core/Database/StatHistory");

let pendingTimeouts = new Map();

function clearAppTimeout(id) {
    const key = id.toString();
    if (pendingTimeouts.has(key)) { clearTimeout(pendingTimeouts.get(key)); pendingTimeouts.delete(key); }
}

async function askNextQuestion(app, thread) {
    const StaffApp = require("../../Core/Database/StaffApp");
    const ApplicationPanel = require("../../Core/Database/ApplicationPanel");

    const panel = await ApplicationPanel.findById(app.panelId).lean();
    if (!panel || app.currentQuestion >= panel.questions.length) return;

    const q = panel.questions[app.currentQuestion];
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "✦";

    await thread.send({
        content: `## ${spark} Soru ${app.currentQuestion + 1}/${panel.questions.length}\n\n${q.question}`
    });
}

async function compileApplication(app, applicant, guild, panel) {
    const ApplicationPanel = require("../../Core/Database/ApplicationPanel");
    const Member = await guild.members.fetch(applicant.id).catch(() => null);
    const stats = await StatHistory.aggregate([
        { $match: { guildID: guild.id, userID: applicant.id } },
        { $group: { _id: null, msgTotal: { $sum: "$message.total" }, voiceTotal: { $sum: "$voice.total" } } }
    ]);
    const msgXP = stats[0]?.msgTotal || 0;
    const voiceXP = stats[0]?.voiceTotal || 0;
    const msgLevel = LevelUtils.calculateMessageLevel(msgXP);
    const voiceLevel = LevelUtils.calculateVoiceLevel(voiceXP);
    const vMin = Math.floor(voiceXP / 60000);
    const voiceText = vMin >= 60 ? `${Math.floor(vMin / 60)} sa ${vMin % 60} dk` : `${vMin} dk`;
    const created = Math.floor(applicant.createdTimestamp / 1000);
    const joined = Member ? Math.floor(Member.joinedTimestamp / 1000) : 0;

    const emojis = ConfigManager.get("Emojis") || {};
    const onay = emojis.toji_onay?.match(/<a?:(.+):(\d+)>/) ? { name: RegExp.$1, id: RegExp.$2 } : { name: "✅" };
    const iptal = emojis.toji_iptal?.match(/<a?:(.+):(\d+)>/) ? { name: RegExp.$1, id: RegExp.$2 } : { name: "❌" };

    const freshPanel = await ApplicationPanel.findOne({
        $or: [
            { customId: app.customId },
            { _id: app.panelId }
        ],
        guildID: guild.id
    }).lean();

    const panelName = freshPanel?.name || panel?.name || "Başvuru";
    const pcid = freshPanel?.customId || panel?.customId || "yetkili";
    const approveList = freshPanel?.approveRoles || panel?.approveRoles || [];
    const giveList = freshPanel?.giveRoles || panel?.giveRoles || [];

    const staffMentions = approveList
        .map(id => id.replace(/^@+|@+$/g, "").trim())
        .filter(id => id.length > 0)
        .map(id => /^\d{17,20}$/.test(id) ? `<@&${id}>` : id)
        .join(", ") || "Kimse eklenmedi";

    const spark = emojis.toji_sparkles || "✦";
    const sign = emojis.toji_sign || "📝";

    const info = `## ${spark} ${panelName}: ${applicant.username}\n` +
        `> **Kullanıcı:** ${applicant} (\`${applicant.id}\`)\n` +
        `> **Hesap:** <t:${created}:D> (<t:${created}:R>)\n` +
        `> **Katılım:** <t:${joined}:D> (<t:${joined}:R>)\n` +
        `> **Chat:** Lv \`${msgLevel}\` (\`${msgXP.toLocaleString()} msj\`)\n` +
        `> **Ses:** Lv \`${voiceLevel}\` (\`${voiceText}\`)\n` +
        `> **Yetkililer:** ${staffMentions}`;

    const qaList = [];
    for (let i = 0; i < app.answers.length; i++) {
        const a = app.answers[i];
        qaList.push(`### ${sign} Soru ${i + 1}\n> ${a.question}`);
        qaList.push(`\`\`\`\n${a.answer}\n\`\`\``);
    }
    const footer = { type: 10, content: `-# ${spark} Onaylamak veya reddetmek için aşağıdaki butonları kullanın.` };

    const buttons = [
        { type: 9, accessory: { type: 2, style: 3, custom_id: `app_approve_${pcid}`, label: "Onayla", emoji: onay }, components: [{ type: 10, content: "-# Onaylamak için tıkla." }] },
        { type: 9, accessory: { type: 2, style: 4, custom_id: `app_reject_${pcid}`, label: "Reddet", emoji: iptal }, components: [{ type: 10, content: "-# Reddetmek için tıkla." }] }
    ];

    const thread = guild.channels.cache.get(app.threadID);
    if (!thread?.isThread()) return;

    const messages = [];
    const header = [{ type: 10, content: info }, { type: 14, divider: true, spacing: 1 }];
    let currentComponents = [...header];
    let currentLen = info.length;

    for (const qa of qaList) {
        if (currentLen + qa.length > 3800 && currentComponents.length > header.length) {
            messages.push([...currentComponents]);
            currentComponents = [];
            currentLen = 0;
        }
        currentComponents.push({ type: 10, content: qa });
        currentLen += qa.length;
    }

    currentComponents.push({ type: 14, divider: true, spacing: 1 }, footer);
    messages.push([...currentComponents, { type: 14, divider: true, spacing: 1 }, ...buttons]);

    await guild.members.fetch().catch(() => {});
    for (const rID of approveList) {
        const cleanID = rID.replace(/^@+|@+$/g, "").trim();
        const role = guild.roles.cache.get(cleanID);
        if (role) {
            for (const m of role.members.values()) {
                if (!m.user.bot) await thread.members.add(m.id).catch(() => {});
            }
        }
    }

    for (let i = 0; i < messages.length; i++) {
        const hasButtons = i === messages.length - 1;
        const components = hasButtons ? messages[i] : [...messages[i]];
        if (!hasButtons) {
            components.push({ type: 10, content: "-# Devamı aşağıda..." });
        }
        await thread.send({
            components: [{ type: 17, components }],
            flags: [MessageFlags.IsComponentsV2],
            allowedMentions: { parse: ['roles', 'users'] }
        });
    }
}

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    const cid = interaction.customId || "";

    if (interaction.isButton() && cid.startsWith("app_start_")) {
        const pcid = cid.slice(10);
        const ApplicationPanel = require("../../Core/Database/ApplicationPanel");
        const StaffApp = require("../../Core/Database/StaffApp");

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        let panel = await ApplicationPanel.findOne({ customId: pcid, guildID: interaction.guild.id, active: true });

        if (!panel && pcid === "yetkili") {
            panel = {
                _id: "legacy_yetkili",
                name: "Yetkili Alım",
                customId: "yetkili",
                questions: [
                    { question: "Kendini kısaca tanıtır mısın? (Ad, yaş, vb.)" },
                    { question: "Daha önce yetkili olduğun bir sunucu var mı?" },
                    { question: "Neden bu sunucuda yetkili olmak istiyorsun?" },
                    { question: "Hangi alanda daha yeteneklisin? (Chat, Ses, Etkinlik)" },
                    { question: "Günlük/haftalık ne kadar vakit ayırabilirsin?" }
                ],
                answerTimeLimit: 15,
                approveRoles: ConfigManager.get("Roles.Responsibilities.TicketManager") || [],
                giveRoles: [],
                active: true
            };
        }

        if (!panel) return interaction.editReply({ content: "❌ Panel bulunamadı." });

        const existing = await StaffApp.findOne({
            userID: interaction.user.id,
            guildID: interaction.guild.id,
            status: { $in: ["active", "completed"] }
        });
        if (existing) {
            const statusText = existing.status === "active" ? "Soruları cevaplıyorsun" : "Başvurun inceleniyor";
            return interaction.editReply({ content: `❌ Zaten bir başvurun var. ${statusText}, yeni başvuru oluşturamazsın.` });
        }

        const thread = await interaction.channel.threads.create({
            name: `başvuru-${interaction.user.username}`.slice(0, 100),
            autoArchiveDuration: 1440,
            type: ChannelType.PrivateThread,
            reason: `${panel.name}: ${interaction.user.tag}`
        }).catch(() => null);
        if (!thread) return interaction.editReply({ content: "❌ Başvuru oluşturulamadı (thread hatası)." });

        await thread.members.add(interaction.user.id).catch(() => {});

        const emojis = ConfigManager.get("Emojis") || {};
        const spark = emojis.toji_sparkles || "✦";

        let v2Content = `## ${spark} ${panel.name}\n`;
        v2Content += `> **Başvuran:** ${interaction.user} (\`${interaction.user.id}\`)\n`;
        v2Content += `> **Soru Sayısı:** \`${panel.questions?.length || 0}\` adet\n`;

        if (panel.answerTimeLimit) {
            const deadline = Date.now() + panel.answerTimeLimit * 60000;
            v2Content += `> **Kalan Süre:** <t:${Math.floor(deadline / 1000)}:R>\n`;
            v2Content += `> **Bitiş:** <t:${Math.floor(deadline / 1000)}:f>\n`;

            const app = await StaffApp.create({
                userID: interaction.user.id, guildID: interaction.guild.id,
                panelId: panel._id, customId: panel.customId || pcid, threadID: thread.id, channelID: interaction.channel.id,
                status: "active", questionTimeout: new Date(deadline)
            });

            const to = setTimeout(async () => {
                const fresh = await StaffApp.findById(app._id);
                if (!fresh || fresh.status !== "active") return;
                fresh.status = "cancelled"; await fresh.save();
                await thread.send({ content: "⏰ Süre doldu, başvuru iptal edildi." }).catch(() => {});
                setTimeout(() => thread.delete().catch(() => {}), 5000);
            }, panel.answerTimeLimit * 60000);
            pendingTimeouts.set(app._id.toString(), to);

            v2Content += `\n-# ${spark} Sorulara sırayla cevap ver, süre bitmeden hepsini tamamla.`;

            await thread.send({
                components: [{ type: 17, components: [{ type: 10, content: v2Content }] }],
                flags: [MessageFlags.IsComponentsV2]
            });
            await askNextQuestion(app, thread);
        }

        return interaction.editReply({ content: `✅ Başvurun alındı! ${thread}` });
    }

    if (interaction.isButton() && (cid.startsWith("app_approve_") || cid.startsWith("app_reject_"))) {
        const StaffApp = require("../../Core/Database/StaffApp");
        const ApplicationPanel = require("../../Core/Database/ApplicationPanel");
        const isApprove = cid.startsWith("app_approve_");
        const pcid = isApprove ? cid.slice(12) : cid.slice(11);

        let panel = await ApplicationPanel.findOne({ customId: pcid, guildID: interaction.guild.id, active: true });
        if (!panel) {
            const mgr = ConfigManager.get("Roles.Responsibilities.TicketManager") || [];
            panel = { approveRoles: mgr, giveRoles: [], name: "Yetkili Alım" };
        }

        const cleanApproveRoles = (panel.approveRoles || [])
            .map(id => String(id).replace(/^@+|@+$/g, "").trim())
            .filter(Boolean);

        const isOwner = ConfigManager.isOwner(interaction.member);
        const isAdmin = interaction.member.permissions.has("Administrator");
        const hasRole = cleanApproveRoles.some(r => interaction.member.roles.cache.has(r));

        const hasPerm = isOwner || isAdmin || hasRole || cleanApproveRoles.length === 0;
        if (!hasPerm) return interaction.reply({ content: "❌ Bu başvuruyu yönetme yetkiniz bulunmuyor.", flags: [MessageFlags.Ephemeral] });

        const app = await StaffApp.findOne({ 
            $or: [{ threadID: interaction.channel.id }, { channelID: interaction.channel.id }],
            status: { $in: ["completed", "approved", "rejected"] }
        });
        if (!app) return interaction.reply({ content: "❌ İncelenecek başvuru bulunamadı.", flags: [MessageFlags.Ephemeral] });

        if (app.status === "approved" || app.status === "rejected") {
            return interaction.reply({ 
                content: `❌ Bu başvuru zaten **${app.status === "approved" ? "onaylanmış" : "reddedilmiş"}**.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (isApprove) {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            app.status = "approved";
            app.approvedBy = interaction.user.id;
            app.approvedAt = new Date();
            await app.save();

            const member = await interaction.guild.members.fetch(app.userID).catch(() => null);
            if (member) {
                if (panel.giveRoles && Array.isArray(panel.giveRoles) && panel.giveRoles.length > 0) {
                    const cleanGiveRoles = panel.giveRoles
                        .map(r => String(r).replace(/^@+|@+$/g, "").trim())
                        .filter(r => /^\d{17,20}$/.test(r));
                    for (const rID of cleanGiveRoles) {
                        await member.roles.add(rID).catch(err => console.error(`[StaffApp] Role add error (${rID}):`, err.message));
                    }
                }
                await member.send(`🎉 **${interaction.guild.name}** — Başvurunuz **kabul edildi**! Tebrikler.`).catch(() => {});
            }

            const emojis = ConfigManager.get("Emojis") || {};
            if (interaction.message) await interaction.message.delete().catch(() => {});

            await interaction.channel.send({
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [
                    { type: 10, content: `## ${emojis.toji_onay || "✅"} Başvuru Onaylandı\n> **Onaylayan Yetkili:** ${interaction.user} (\`${interaction.user.id}\`)` }
                ] }]
            });
            if (interaction.channel.isThread()) setTimeout(() => interaction.channel.setArchived(true).catch(() => {}), 5000);
            return interaction.editReply({ content: "✅ Başvuru başarıyla onaylandı ve roller verildi." });
        }

        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
        const modal = new ModalBuilder().setCustomId(`app_reject_modal_${pcid}`).setTitle("Başvuruyu Reddet");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Reddetme Sebebi").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)));
        return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && cid.startsWith("app_reject_modal_")) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const StaffApp = require("../../Core/Database/StaffApp");
        const reason = interaction.fields.getTextInputValue("reason");

        const app = await StaffApp.findOne({ 
            $or: [{ threadID: interaction.channel.id }, { channelID: interaction.channel.id }],
            status: { $in: ["completed", "approved", "rejected"] }
        });

        if (app) {
            app.status = "rejected";
            app.rejectedBy = interaction.user.id;
            app.rejectedAt = new Date();
            app.rejectReason = reason;
            await app.save();

            const user = await interaction.client.users.fetch(app.userID).catch(() => null);
            if (user) await user.send(`❌ **${interaction.guild.name}** — Başvurunuz **reddedildi**.\n**Sebep:** ${reason}`).catch(() => {});
        }

        if (interaction.message) await interaction.message.delete().catch(() => {});
        const emojiConf = ConfigManager.get("Emojis") || {};
        await interaction.channel.send({
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components: [
                { type: 10, content: `## ${emojiConf.toji_iptal || "❌"} Başvuru Reddedildi\n> **Reddeden Yetkili:** ${interaction.user}\n> **Sebep:** ${reason}` }
            ] }]
        });
        if (interaction.channel.isThread()) setTimeout(() => interaction.channel.setArchived(true).catch(() => {}), 5000);
        return interaction.editReply({ content: "❌ Başvuru reddedildi." });
    }
};

module.exports.handleThreadMessage = async (message) => {
    const StaffApp = require("../../Core/Database/StaffApp");
    const ApplicationPanel = require("../../Core/Database/ApplicationPanel");

    const app = await StaffApp.findOne({ threadID: message.channel.id, status: "active", userID: message.author.id });
    if (!app) return false;

    const panel = await ApplicationPanel.findOne({ customId: app.customId, guildID: message.guild.id, active: true }).lean()
        || await ApplicationPanel.findById(app.panelId).lean();
    if (!panel) return false;

    app.answers.push({ question: panel.questions[app.currentQuestion]?.question || "?", answer: message.content || "(boş)" });
    app.currentQuestion++;

    if (app.currentQuestion >= panel.questions.length) {
        app.status = "completed"; app.completedAt = new Date();
        await app.save();
        await message.reply({ content: "✅ Tüm soruları cevapladın! Başvurun yetkililere iletildi." });
        await compileApplication(app, message.author, message.guild, panel);
        return true;
    }

    await app.save();
    await askNextQuestion(app, message.channel);
    return true;
};
