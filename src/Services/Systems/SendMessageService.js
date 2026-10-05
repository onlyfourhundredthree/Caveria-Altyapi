const { ChannelType, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class SendMessageService {
    static async process(client, channel, rawJson, attachmentUrl) {
        if (!channel || channel.type !== ChannelType.GuildText) {
            return { error: "Geçerli bir kanal belirt." };
        }

        let jsonData;

        try {
            if (attachmentUrl) {
                const res = await fetch(attachmentUrl);
                const text = await res.text();
                jsonData = JSON.parse(text);
            } else {
                if (!rawJson) return { error: "JSON gir." };
                jsonData = JSON.parse(rawJson);
            }
        } catch (err) {
            return { error: `JSON hatalı:\n\`\`\`js\n${err}\n\`\`\`` };
        }

        try {
            if (Array.isArray(jsonData)) {
                jsonData = { components: jsonData };
            }

            if (!jsonData.flags) {
                jsonData.flags = [MessageFlags.IsComponentsV2];
            }

            await channel.send(jsonData);
            return { success: true };
        } catch (err) {
            return { error: `Gönderme hatası:\n\`\`\`js\n${err}\n\`\`\`` };
        }
    }
}

module.exports = SendMessageService;
