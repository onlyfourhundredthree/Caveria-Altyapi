const { MessageFlags, ChannelType } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))]);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const allLogs = [
    { name: "message-log", key: "MessageLog" },
    { name: "voice-log", key: "VoiceLog" },
    { name: "channel-log", key: "ChannelLog" },
    { name: "role-log", key: "RoleLog" },
    { name: "member-log", key: "MemberLog" },
    { name: "emoji-log", key: "EmojiLog" },
    { name: "invite-log", key: "InviteLog" },
    { name: "server-log", key: "ServerLog" },
    { name: "command-log", key: "CommandLog" },
    { name: "name-log", key: "NameLog" },
    { name: "forceban-log", key: "ForcebanLog" },
    { name: "ban-log", key: "BanLog" },
    { name: "underworld-log", key: "UnderworldLog" },
    { name: "jail-log", key: "JailLog" },
    { name: "mute-log", key: "MuteLog" },
    { name: "uyari-log", key: "UyariLog" },
    { name: "guard-log", key: "GuardLog" },
    { name: "guard-role-log", key: "GuardRoleLog" },
    { name: "guard-channel-log", key: "GuardChannelLog" },
    { name: "guard-ban-log", key: "GuardBanLog" },
    { name: "guard-emoji-log", key: "GuardEmojiLog" },
    { name: "guard-webhook-log", key: "GuardWebhookLog" },
    { name: "guard-server-log", key: "GuardServerLog" },
    { name: "guard-bot-log", key: "GuardBotLog" },
    { name: "atlama-log", key: "PromotionLog" },
    { name: "gorev-bitirme-log", key: "CompletionLog" },
    { name: "görev-log", key: "TaskLog" }
];

function buildDashboard() {
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "✦";
    return {
        flags: [MessageFlags.IsComponentsV2],
        components: [{
            type: 17,
            components: [
                { type: 10, content: `## ${spark} Kurulum Paneli\nBot ayarlarını ve sistem kanallarını yönetin.` },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 3, label: "Emoji Kur", custom_id: "kurulum_emojis" },
                        { type: 2, style: 1, label: "Log Kanalları Kur", custom_id: "kurulum_logs" },
                        { type: 2, style: 1, label: "Emoji Listesi", custom_id: "kurulum_list" },
                        { type: 2, style: 4, label: "Emoji Sil", custom_id: "kurulum_emojisil" }
                    ]
                },
                {
                    type: 1,
                    components: [
                        { type: 2, style: 2, label: "Ayarları Yenile", custom_id: "kurulum_reload" }
                    ]
                }
            ]
        }]
    };
}

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    const cid = interaction.customId || "";
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "✦";
    const guild = interaction.guild;

    if (cid === "kurulum_refresh") {
        return interaction.update(buildDashboard());
    }

    if (cid === "kurulum_list") {
        const emojiConfig = ConfigManager.get("Emojis") || {};
        const entries = Object.entries(emojiConfig);
        const charsPerMsg = 1800;
        const chunks = [];
        let cur = "";
        for (const [k, v] of entries) {
            const line = `**${k}:** ${v || "YOK"}\n`;
            if ((cur + line).length > charsPerMsg) { chunks.push(cur); cur = line; }
            else cur += line;
        }
        if (cur) chunks.push(cur);

        for (let i = 0; i < chunks.length; i++) {
            const comps = [{ type: 10, content: i === 0 ? `## ${spark} Emoji Listesi\n${chunks[i]}` : chunks[i] }];
            if (i === 0) {
                comps.unshift({ type: 14, divider: true, spacing: 1 });
                await interaction.reply({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral], components: [{ type: 17, components: [{ type: 10, content: `## ${spark} Emoji Listesi` }, { type: 14, divider: true, spacing: 1 }, ...comps] }] });
            } else {
                await interaction.followUp({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral], components: [{ type: 17, components: [...comps] }] });
            }
        }
        return;
    }

    if (cid === "kurulum_reload") {
        const defaultConfigPath = path.resolve(__dirname, "../../Core/Config/DefaultConfig.js");
        delete require.cache[defaultConfigPath];
        await ConfigManager.reload();
        return interaction.reply({ content: `${spark} Ayarlar yeniden yüklendi.`, flags: [MessageFlags.Ephemeral] });
    }

    if (cid === "kurulum_emojisil") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const toDelete = guild.emojis.cache.filter(e => e.name.toLowerCase().includes("toji") || e.name.toLowerCase().includes("maravilha"));
        if (toDelete.size === 0) return interaction.editReply({ content: "Silinecek emoji bulunamadı." });
        let deleted = 0;
        for (const [, emoji] of toDelete) {
            await emoji.delete().catch(() => {});
            deleted++;
        }
        return interaction.editReply({ content: `${spark} **${deleted}** emoji silindi.` });
    }

    if (cid === "kurulum_emojis") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const remoteEmojis = [
            { name: "toji_create", url: "https://cdn.discordapp.com/emojis/1208394190975803433.webp?size=128&quality=lossless" },
            { name: "toji_hello", url: "https://cdn.discordapp.com/emojis/914262870580158485.gif?size=128&quality=lossless" },
            { name: "toji_nokta", url: "https://cdn.discordapp.com/emojis/1246122337808416930.webp?size=56&quality=lossless" },
            { name: "toji_message", url: "https://cdn.discordapp.com/emojis/975535520530702378.webp?size=128&quality=lossless" },
            { name: "bar_full_start", url: "https://cdn.discordapp.com/emojis/1458253834450108457.webp?size=44&animated=true" },
            { name: "bar_full_mid", url: "https://cdn.discordapp.com/emojis/1458253376352424106.webp?size=44&animated=true" },
            { name: "bar_full_end", url: "https://cdn.discordapp.com/emojis/1458252953390678070.webp?size=44&animated=true" },
            { name: "bar_empty_start", url: "https://cdn.discordapp.com/emojis/1276538603681353749.webp?size=44" },
            { name: "bar_empty_mid", url: "https://cdn.discordapp.com/emojis/1192109472630444133.webp?size=44" },
            { name: "bar_empty_end", url: "https://cdn.discordapp.com/emojis/1192109488665272360.webp?size=44" },
            { name: "confetti", url: "https://cdn.discordapp.com/emojis/1417773280504320031.webp?size=44&animated=true" },
        ];

        let localFiles = [];
        const localPath = path.join(__dirname, "../../Assets/Emojis");
        if (fs.existsSync(localPath)) {
            localFiles = fs.readdirSync(localPath).filter(f => [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(path.extname(f).toLowerCase()));
        }

        const total = remoteEmojis.length + localFiles.length;
        await interaction.editReply({ content: `⏳ Emoji kurulumu başladı (${total} adet)...` });

        let remoteCreated = 0, remoteExist = 0;
        for (const x of remoteEmojis) {
            let emoji = guild.emojis.cache.find(e => e.name === x.name);
            if (!emoji) {
                try {
                    const res = await withTimeout(axios.get(x.url, { responseType: 'arraybuffer', timeout: 8000 }), 10000);
                    emoji = await withTimeout(guild.emojis.create({ attachment: Buffer.from(res.data, 'binary'), name: x.name }), 15000);
                    remoteCreated++;
                    await sleep(3000);
                } catch { continue; }
            } else remoteExist++;
            if (emoji) await ConfigManager.updateNested("Emojis", x.name, emoji.toString(), interaction.user.tag);
        }

        const emojiMap = { "cherry": "cherry", "heart": "heart", "dalga": "dalga", "coin": "coin", "slot_gif": "slot_gif", "cf_gif": "cf_gif", "konfeti_gif": "konfeti_gif", "toji_iptal": "toji_iptal", "toji_time": "toji_time", "toji_info": "toji_info", "toji_create": "toji_create", "maravilha_hello": "toji_hello", "toji_onay": "toji_onay", "maravilha_message": "toji_message", "toji_nokta": "toji_nokta", "butterfly": "toji_crucifix", "giftbox": "toji_giftbox", "hubsparkle392": "toji_hubsparkles" };

        let localCreated = 0, localExist = 0;
        for (const file of localFiles) {
            const ext = path.extname(file);
            const name = emojiMap[path.basename(file, ext)] || path.basename(file, ext);
            let emoji = guild.emojis.cache.find(e => e.name === name);
            if (!emoji) {
                try {
                    emoji = await withTimeout(guild.emojis.create({ attachment: path.join(localPath, file), name }), 15000);
                    localCreated++;
                    await sleep(3000);
                } catch { continue; }
            } else localExist++;
            if (emoji) await ConfigManager.updateNested("Emojis", name, emoji.toString(), interaction.user.tag);
        }

        return interaction.editReply({
            content: null,
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components: [
                { type: 10, content: `## ${spark} Emoji Kurulum Özeti\n### Uzak\nYeni: ${remoteCreated} | Mevcut: ${remoteExist}\n### Yerel\nYeni: ${localCreated} | Mevcut: ${localExist}` },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: "> ConfigManager güncellendi." }
            ] }]
        });
    }

    if (cid === "kurulum_logs") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        await interaction.editReply({ content: "⏳ Log kanalları kontrol ediliyor..." });

        let logCategory = guild.channels.cache.find(c => c.name === "TOJI LOGS" && c.type === 4);
        if (!logCategory) {
            logCategory = await guild.channels.create({ name: "TOJI LOGS", type: 4, permissionOverwrites: [{ id: guild.id, deny: ["ViewChannel"] }] });
        }

        const channelsConfig = ConfigManager.get("Channels") || {};
        let created = 0, fixed = 0, exist = 0;

        for (const logObj of allLogs) {
            const storedId = channelsConfig[logObj.key];
            const existingChannel = storedId ? guild.channels.cache.get(storedId) : null;
            if (existingChannel) { exist++; continue; }

            const isGuard = logObj.key.startsWith("Guard");
            const nameFilter = c => isGuard ? c.name.endsWith(logObj.name) : (!c.name.startsWith("guard-") && c.name.endsWith(logObj.name));

            let channel = guild.channels.cache.find(c => nameFilter(c) && c.parentId === logCategory.id);
            if (!channel) channel = guild.channels.cache.find(c => nameFilter(c));

            if (channel) {
                await ConfigManager.updateNested("Channels", logObj.key, channel.id, interaction.user.tag);
                fixed++;
            } else {
                channel = await guild.channels.create({ name: logObj.name, type: 0, parent: logCategory.id });
                await ConfigManager.updateNested("Channels", logObj.key, channel.id, interaction.user.tag);
                created++;
            }
        }

        return interaction.editReply({
            content: null,
            flags: [MessageFlags.IsComponentsV2],
            components: [{ type: 17, components: [
                { type: 10, content: `## ${spark} Log Kurulum Özeti\n**TOJI LOGS** altında ${allLogs.length} log\n✅ Oluşturulan: ${created}\n🔧 Güncellenen: ${fixed}\n✨ Mevcut: ${exist}` }
            ] }]
        });
    }
};
