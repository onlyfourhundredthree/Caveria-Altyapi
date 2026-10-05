const ConfigManager = require("../Core/Handlers/ConfigManager");

class FindGuildService {
    static async getPayload(client, targetId, requester) {
        try {
            const user = await client.users.fetch(targetId).catch(() => null);
            if (!user) {
                return {
                    content: "Kullanıcı bulunamadı. Lütfen geçerli bir ID girin.",
                    flags: 64
                };
            }

            const primaryGuild = user.primaryGuild;
            const emojis = ConfigManager.get("Emojis") || {};

            const container = {
                type: 17,
                components: []
            };

            const headerSection = {
                type: 9,
                components: [{
                    type: 10,
                    content: `# ${user.username} Klan Bilgisi`
                }],
                accessory: {
                    type: 11,
                    media: { url: user.displayAvatarURL({ dynamic: true }) }
                }
            };
            container.components.push(headerSection);
            container.components.push({ type: 14, divider: true, spacing: 1 });

            if (primaryGuild) {
                const infoText = `
${emojis.toji_nokta || "•"} **Klan Adı:** ${primaryGuild.name || "Bilinmiyor"}
${emojis.toji_nokta || "•"} **Klan Tag:** \`${primaryGuild.tag || "Yok"}\`
${emojis.toji_nokta || "•"} **Klan ID:** \`${primaryGuild.identityGuildId}\`
                `.trim();

                if (primaryGuild.badge) {
                    container.components.push({
                        type: 9,
                        components: [{ type: 10, content: infoText }],
                        accessory: {
                            type: 11,
                            media: { url: `https://cdn.discordapp.com/clan-badges/${primaryGuild.identityGuildId}/${primaryGuild.badge}.png?size=256` }
                        }
                    });
                } else {
                    container.components.push({ type: 10, content: infoText });
                }
            } else {
                container.components.push({ type: 10, content: `${emojis.toji_iptal || "❌"} Bu kullanıcı herhangi bir klan (primary guild) taşımıyor.` });
            }

            container.components.push({ type: 14, divider: true, spacing: 1 });
            container.components.push({ type: 10, content: `-# Sorgulayan: ${requester.tag}` });

            return {
                flags: 32768,
                components: [container]
            };

        } catch (err) {
            console.error(err);
            return {
                content: "Belirtilen kullanıcı getirilirken bir hata oluştu.",
                flags: 64
            };
        }
    }
}

module.exports = FindGuildService;
