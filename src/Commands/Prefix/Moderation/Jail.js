const ms = require("ms");
const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require("discord.js");
const ModerationService = require("../../../Services/Moderation/ModerationService");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["jail", "cezalı", "karantina", "jail-user", "cezalı-sistemi"],
        description: "Bir kullanıcıyı cezalıya atıp tüm kanallardan men eder.",
        category: "Moderation",
        usage: ".jail <user_id|mention> [süre] [sebep]"
    },

    run: async (client, message, args) => {
        let targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
        if (!targetUser) {
            return ModerationService.sendError(message, "Lütfen geçerli bir kullanıcı etiketleyin veya ID girin.");
        }

        const isOwner = ConfigManager.isOwner(message.member);

        let duration = null;
        let reasonArgs = args.slice(1);

        if (isOwner && reasonArgs.length > 0) {
            const first = reasonArgs[0];
            const parsed = ms(first);
            if (parsed && parsed >= 1000) {
                duration = first;
                reasonArgs = reasonArgs.slice(1);
            }
        }

        let reason = isOwner ? reasonArgs.join(" ") : null;

        if (isOwner && duration && reason) {
            return await ModerationService.handleJail(message, targetUser, reason, duration);
        }

        const allReasons = ConfigManager.get("PunishmentReasons") || [];
        const jailReasons = allReasons.filter(r => r && r.type === 3);

        if (jailReasons.length === 0) {
            if (!duration) {
                return ModerationService.sendError(message, "Lütfen bir jail süresi belirtin. Örn: `.jail @Kullanıcı 1h sebep`");
            }
            if (!reason) reason = "Bir sebep belirtilmemiş.";
            return await ModerationService.handleJail(message, targetUser, reason, duration);
        }

        const options = jailReasons.map(r => ({
            label: r.label.substring(0, 100),
            description: `1.İhlal: ${r.date1 || "1d"} | 2.İhlal: ${r.date2 || "3d"} | 3.İhlal: ${r.date3 || "7d"}`.substring(0, 100),
            value: r.value
        }));

        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`jail_select_reason_${targetUser.id}_${message.author.id}`)
                .setPlaceholder("Jail / Karantina sebebini seçin...")
                .addOptions(options)
        );

        const v2Payload = {
            flags: [MessageFlags.IsComponentsV2],
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## ⛓️ Jail / Karantina İşlemi\n> -# **Hedef Kullanıcı:** ${targetUser.toString()} (\`${targetUser.id}\`)\n\nLütfen cezalıya atma sebebini ve süresini belirlemek için aşağıdaki listeden bir **Jail Sebebi** seçin:`
                        },
                        { type: 14, spacing: 1, divider: true },
                        {
                            type: 1,
                            components: [menuRow.components[0].toJSON()]
                        }
                    ]
                }
            ]
        };

        return message.reply(v2Payload);
    },
};