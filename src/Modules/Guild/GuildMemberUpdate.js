const { EmbedBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
const StaffManager = require("../../Core/Handlers/StaffManager");
const client = global.bot;

module.exports = async (oldMember, newMember) => {
    const wasBoosting = oldMember.premiumSince;
    const isBoosting = newMember.premiumSince;

    if (!wasBoosting && isBoosting) {
        const guild = newMember.guild;
        const channelId = ConfigManager.get("Boost.LogChannel");
        const logChannel = guild.channels.cache.get(channelId);

        if (!logChannel) return;

        let messageContent = ConfigManager.get("Boost.Message") || "?? {member} sunucumuza boost bastı! Teşekkürler!";

        messageContent = messageContent
            .replace(/{member}/g, newMember.toString())
            .replace(/{server}/g, guild.name)
            .replace(/{boostCount}/g, guild.premiumSubscriptionCount || 0)
            .replace(/{tier}/g, guild.premiumTier);

        await logChannel.send({ content: messageContent }).catch(() => null);
    }

    if (wasBoosting && !isBoosting && newMember.id !== "1078973188718993418") {
        const BoosterRole = require("../../Core/Database/Booster");
        const boosterData = await BoosterRole.findOne({ userId: newMember.id, guildId: newMember.guild.id });

        if (boosterData) {
            if (boosterData.roleId) {
                const role = newMember.guild.roles.cache.get(boosterData.roleId);
                if (role) await role.delete("Boost çekildiği için silindi.").catch(() => null);
            }
            await BoosterRole.deleteMany({ userId: newMember.id, guildId: newMember.guild.id });
            await newMember.send(`**Server Boost** durumunuz değiştiği için veritabanındaki kayıtlarınız ve özel booster rolünüz silinmiştir.`).catch(() => null);
        }

        const specialRoles = ConfigManager.get("Boost.SpecialRoles") || [];
        const specialRoleIds = specialRoles.map(r => r.id);
        const rolesToRemove = newMember.roles.cache.filter(r => specialRoleIds.includes(r.id));
        if (rolesToRemove.size > 0) {
            await newMember.roles.remove(rolesToRemove, "Boost çekildiği için özel roller kaldırıldı.").catch(() => null);
        }
    }

    const TaskManager = require("../../Core/Handlers/TaskManager");
    await TaskManager.validateTasks(newMember);

    const staffRanks = await StaffRoleSystem.find({ guildID: newMember.guild.id, active: true });
    const staffIDs = staffRanks.map(r => r.roleID);

    const addedRole = newMember.roles.cache.find(r => !oldMember.roles.cache.has(r.id) && staffIDs.includes(r.id));
    if (addedRole) {
        const rank = staffRanks.find(r => r.roleID === addedRole.id);
        if (rank) {
            await StaffManager.applyMilestoneRoles(newMember, rank);

            const lowerRanks = staffRanks.filter(r => r.sortOrder < rank.sortOrder);
            let oldRankObj = null;
            for (const lr of lowerRanks) {
                if (newMember.roles.cache.has(lr.roleID)) {
                    oldRankObj = lr;
                    await newMember.roles.remove(lr.roleID).catch(() => { });
                }
            }
        }
    }
};
