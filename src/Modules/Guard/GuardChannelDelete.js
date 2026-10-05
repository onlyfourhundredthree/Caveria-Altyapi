const { AuditLogEvent, EmbedBuilder } = require("discord.js");
const client = global.bot;
const GuardManager = require("../../Core/Handlers/GuardManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const GuardUtils = require("../../Core/Handlers/GuardUtils"); 
const { applyPunishment, sendGuardLog } = GuardUtils;

module.exports = async (channel) => {
    const guild = channel.guild;
    const now = Date.now();

    const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
    if (!audit) return;
    const entry = audit.entries.first();
    if (!entry || entry.target.id !== channel.id || entry.createdTimestamp < (now - 5000)) return;

    const executor = entry.executor;
    const member = await guild.members.fetch(executor.id).catch(() => null);

    if (executor.id === client.user.id || executor.id === guild.ownerId) return;

    if (ConfigManager.isOwner({ id: executor.id }) || (member && ConfigManager.isOwner(member))) return;

    // Config Koruması (Guard kapalı olsa bile çalışır)
    const configPath = GuardUtils.checkConfigDependency(channel.id, "channel");
    if (configPath) {
        const newChannel = await channel.clone({
            reason: `Guard: Config Dependent Channel Deleted`,
            position: channel.position
        });
        
        if (channel.parentId) {
            await newChannel.setParent(channel.parentId, { lockPermissions: false }).catch(() => {});
        }
        await newChannel.setPosition(channel.position, { reason: "Guard: Kanal Sırasını Düzeltme" }).catch(() => {});
        
        const pathParts = configPath.split('.');
        const mainKey = pathParts.shift(); // "Channels"
        const nestedPath = pathParts.join('.');
        
        await ConfigManager.updateNested(mainKey, nestedPath, newChannel.id, "Guard (Auto-Restore)");
        
        const warningEmbed = new EmbedBuilder()
            .setTitle("⚠️ Sistem Uyarı: Kanal Koruması")
            .setColor("Red")
            .setDescription(`Silmeye çalıştığınız **#${channel.name}** kanalı botun sistem ayarlarında (\`${configPath}\`) kullanıldığı için silinmesi engellendi ve yeniden oluşturuldu.\nEğer bu kanalı gerçekten silmek istiyorsanız, öncelikle sistem yapılandırmasından kaldırmanız veya değiştirmeniz gerekmektedir.`);
            
        if (member) await member.send({ embeds: [warningEmbed] }).catch(() => {});
        sendGuardLog(guild, executor, "Kanal Silme (Config Koruması)", `Kanal: **${channel.name}**\nDurum: **Config'de (${configPath}) bulunduğu için anında geri yüklendi.**`);
        return; // Config koruması devreye girdiyse normal limitlere dahil etme.
    }

    const check = await GuardManager.checkLimit(guild.id, executor.id, "channelDelete");

    const settings = await GuardManager.getSettings(guild.id);
    if (GuardManager.isWhitelisted(executor.id, member, "channelDelete", settings)) return;

    if (check && check.limited) {
        await applyPunishment(guild, member, executor, check.action, "Kanal Silme Limiti Aşıldı");

        const newChannel = await channel.clone({
            reason: "Guard: Silinen Kanal Geri Yüklendi",
            position: channel.position
        });

        if (channel.parentId) {
            await newChannel.setParent(channel.parentId, { lockPermissions: false }).catch(() => {});
        }
        await newChannel.setPosition(channel.position, { reason: "Guard: Kanal Sırasını Düzeltme" }).catch(() => {});

        const GuildBackup = require("../../Core/Database/GuildBackup");
        const latestBackup = await GuildBackup.findOne({ guildID: guild.id }).sort({ createdAt: -1 }).lean();
        
        if (latestBackup) {
            if (channel.type === 4) { // 4 is GuildCategory in discord.js v14
                const channelsInCategory = latestBackup.channels.filter(c => c.parentId === channel.id);
                for (const child of channelsInCategory) {
                    const existingChild = guild.channels.cache.get(child.id);
                    if (existingChild) {
                        await existingChild.setParent(newChannel.id, { lockPermissions: false, reason: "Guard: Kategori geri yüklendiği için kanallar içeri taşındı" }).catch(() => {});
                    }
                }
            } else if (newChannel.isTextBased()) {
                const backupChan = latestBackup.channels.find(c => c.id === channel.id);
                if (backupChan && backupChan.messages && backupChan.messages.length > 0) {
                    try {
                        const webhook = await newChannel.createWebhook({ name: "Guard-Restore", reason: "Mesaj kurtarma" });
                        for (const msg of backupChan.messages) {
                            await webhook.send({
                                content: msg.content || undefined,
                                username: msg.username,
                                avatarURL: msg.avatar,
                                embeds: msg.embeds || [],
                                files: msg.attachments || []
                            }).catch(() => {});
                            await new Promise(r => setTimeout(r, 400));
                        }
                        await webhook.delete("Mesaj kurtarma tamamlandı").catch(() => {});
                    } catch (err) {
                        console.error("[Guard] Mesaj kurtarma hatası:", err);
                    }
                }
            }
        }

        sendGuardLog(guild, executor, "Kanal Silme", `Kanal: **${channel.name}**\nİşlem: **${check.action}**\nDurum: **Geri Yüklendi ve İçerik Kurtarıldı.**`);
    }
};
