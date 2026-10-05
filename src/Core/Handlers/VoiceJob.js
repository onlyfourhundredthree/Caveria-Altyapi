const VoiceJoined = require("../Database/Voice.JoinedAt");
const StreamJoinedAt = require("../Database/StreamJoinedAt");
const VoiceManager = require("./VoiceManager");
const StreamManager = require("./StreamManager");
const ConfigManager = require("./ConfigManager");
const StaffUser = require("../Database/StaffUser");
const TaskSettings = require("../Database/TaskSettings");
const Settings = require("../../../Settings.json");

module.exports = (client) => {
    setInterval(async () => {
        const guild = client.guilds.cache.get(Settings.Main.GuildID);
        if (!guild) return;

        const now = Date.now();
        const voiceStates = guild.voiceStates.cache;

        for (const [userID, state] of voiceStates) {
            if (state.member.user.bot || !state.channel) continue;

            const session = await VoiceJoined.findOne({ userID: userID });
            if (!session) continue;

            const liveDiffMs = now - session.date;
            const liveDiffMins = Math.floor(liveDiffMs / 60000);

            const userData = await StaffUser.findOne({ guildID: guild.id, userID: userID });
            if (userData && userData.activeTasks && userData.activeTasks.length > 0) {
                const voiceTasks = userData.activeTasks.filter(at => at && at.taskID);

                let shouldCheckpoint = false;
                for (const activeTask of voiceTasks) {
                    const taskDef = await TaskSettings.findById(activeTask.taskID);
                    if (taskDef && taskDef.taskCategory === "VOICE") {
                        const totalLiveMinutes = activeTask.currentCount + liveDiffMins;
                        if (totalLiveMinutes >= taskDef.targetCount) {
                            shouldCheckpoint = true;
                            break;
                        }
                    }
                }

                if (shouldCheckpoint) {
                    await VoiceManager.saveCheckpoint(state.member, state.channel);
                    continue;
                }
            }

            if (liveDiffMins >= 10) {
                await VoiceManager.saveCheckpoint(state.member, state.channel);
            }
        }

        const streamSessions = await StreamJoinedAt.find({});
        for (const session of streamSessions) {
            const member = guild.members.cache.get(session.userID);
            if (!member || !member.voice.channel || (!member.voice.streaming && !member.voice.selfVideo)) {
                const diff = now - session.date;
                if (diff > 0) {
                    await StreamManager.saveStreamData(member, member?.voice.channel, Math.min(diff, 24 * 60 * 60 * 1000));
                }
                await StreamJoinedAt.deleteOne({ userID: session.userID });
                continue;
            }

            const liveDiffMins = Math.floor((now - session.date) / 60000);
            if (liveDiffMins >= 10) {
                await StreamManager.saveCheckpoint(member, member.voice.channel);
            }
        }
    }, 60000);
};
