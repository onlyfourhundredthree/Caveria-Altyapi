const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const OneOnOneSession = require("../../Core/Database/OneOnOneSession");

const timeouts = new Map();

module.exports = async (oldState, newState) => {
    // Sadece kanal değişimlerinde veya sesten çıkışlarda çalışır
    if (oldState.channelId === newState.channelId) return;

    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const memberId = oldState.member?.id || newState.member?.id;
    if (!memberId) return;

    // Check if user is in an active session (either as manager or member)
    const session = await OneOnOneSession.findOne({ 
        guildID: guild.id, 
        $or: [{ managerID: memberId }, { memberID: memberId }] 
    });

    if (!session) return;

    // A user involved in a session has moved or left
    const managerId = session.managerID;
    const staffId = session.memberID;

    const managerMember = guild.members.cache.get(managerId) || await guild.members.fetch(managerId).catch(() => null);
    const staffMember = guild.members.cache.get(staffId) || await guild.members.fetch(staffId).catch(() => null);

    if (!managerMember || !staffMember) return;

    const managerChannel = managerMember.voice?.channelId;
    const staffChannel = staffMember.voice?.channelId;

    const areTogether = managerChannel && staffChannel && managerChannel === staffChannel;

    if (!areTogether) {
        // They separated
        if (!session.pausedAt) {
            session.pausedAt = new Date();
            await session.save();

            // Set 5 min timeout
            const timeoutId = setTimeout(async () => {
                const checkSession = await OneOnOneSession.findById(session._id);
                if (checkSession && checkSession.pausedAt) {
                    // 5 minutes passed, they are still separated. End session.
                    const now = Date.now();
                    let activeTimeMs = now - checkSession.startTime.getTime() - (checkSession.pauseDuration || 0) - (now - checkSession.pausedAt.getTime());
                    const totalMins = Math.max(1, Math.round(activeTimeMs / 60000));

                    await OneOnOneSession.deleteOne({ _id: checkSession._id });
                    timeouts.delete(session._id.toString());

                    // DM or Log to Manager
                    const btn = new ButtonBuilder()
                        .setCustomId(`1e1_btn_session_finish_${staffId}_${totalMins}`)
                        .setLabel("Görüşmeyi Raporla")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("📝");
                        
                    const row = new ActionRowBuilder().addComponents(btn);

                    managerMember.send({
                        content: `⚠️ **1E1 Görüşmesi Zaman Aşımı:** <@${staffId}> ile olan görüşmeniz, 5 dakikadan uzun süre ayrı kaldığınız için otomatik olarak sonlandırıldı.\nLütfen raporunuzu girmek için aşağıdaki butona tıklayın.`,
                        components: [row]
                    }).catch(() => {
                        // Eğer DM kapalıysa log kanalına veya sisteme atmak gerekebilir.
                    });
                }
            }, 5 * 60 * 1000); // 5 mins

            timeouts.set(session._id.toString(), timeoutId);
        }
    } else {
        // They reunited
        if (session.pausedAt) {
            const pausedDurationMs = Date.now() - session.pausedAt.getTime();
            session.pauseDuration = (session.pauseDuration || 0) + pausedDurationMs;
            session.pausedAt = null;
            await session.save();

            // Clear timeout if exists
            const timeoutId = timeouts.get(session._id.toString());
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeouts.delete(session._id.toString());
            }
        }
    }
};
