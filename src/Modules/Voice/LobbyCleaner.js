const GameLobby = require("../../Core/Database/GameLobby");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (client) => {
    setInterval(async () => {
        try {
            const chanId = ConfigManager.get("Channels")?.LobbyChannel;
            if (!chanId) return;

            const channel = client.channels.cache.get(chanId);
            if (!channel) return;

            const now = new Date();
            const allLobbies = await GameLobby.find();

            for (const lobby of allLobbies) {
                let ownerInVoice = false;

                if (lobby.voiceChannelId) {
                    const vChannel = client.channels.cache.get(lobby.voiceChannelId);
                    if (vChannel) {
                        if (vChannel.members.has(lobby.userId)) {
                            ownerInVoice = true;
                        }
                    }
                }

                if (ownerInVoice) {
                    lobby.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
                    await lobby.save();
                } else if (lobby.expiresAt <= now) {
                    if (lobby.messageId) {
                        const msg = await channel.messages.fetch(lobby.messageId).catch(() => null);
                        if (msg && msg.deletable) {
                            await msg.delete().catch(() => { });
                        }
                    }

                    if (lobby.voiceChannelId) {
                        const vChannel = client.channels.cache.get(lobby.voiceChannelId);
                        if (vChannel) await vChannel.delete().catch(() => { });
                    }

                    await GameLobby.deleteOne({ _id: lobby._id });
                }
            }
        } catch (e) {
        }
    }, 30000); 
};
