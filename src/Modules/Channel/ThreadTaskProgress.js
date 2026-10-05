const TaskManager = require("../../Core/Handlers/TaskManager");

module.exports = async (thread) => {
    try {
        if (!thread.guild) return;
        
        // Sadece belirli bir forum kanalına açılan threadleri dinle
        const targetChannelId = "1496930098774016172";
        if (thread.parentId !== targetChannelId) return;

        const ownerId = thread.ownerId;
        if (!ownerId) return;

        const member = await thread.guild.members.fetch(ownerId).catch(() => null);
        if (!member || member.user.bot) return;

        // Görevi yapabilecek rol
        const targetRoleId = "1496891096524132532";
        if (!member.roles.cache.has(targetRoleId)) return;

        // Görev ilerlemesi sağla
        await TaskManager.progressTask(thread.guild, member, "THREADS", 1);
    } catch (error) {
        console.error("ThreadTaskProgress error:", error);
    }
};