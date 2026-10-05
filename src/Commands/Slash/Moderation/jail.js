const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require("discord.js");
const ms = require("ms");
const ModerationService = require("../../../Services/Moderation/ModerationService");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("jail")
        .setDescription("Kullanıcıyı karantinaya atıp tüm kanallardan men eder.")
        .addUserOption(option => 
            option.setName("kullanıcı")
                .setDescription("Jail atılacak kullanıcıyı seçin")
                .setRequired(true))
        .addStringOption(option => 
            option.setName("süre")
                .setDescription("Jail süresi (örn: 1h, 30m, 1d)")
                .setRequired(false))
        .addStringOption(option => 
            option.setName("sebep")
                .setDescription("Jail sebebini belirtin")
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        const duration = interaction.options.getString("süre");
        const reason = interaction.options.getString("sebep");
        const isOwner = ConfigManager.isOwner(interaction.member);

        if (isOwner && duration && reason) {
            const parsed = ms(duration);
            if (!parsed || parsed < 1000) {
                return interaction.reply({ content: "❌ Geçersiz süre formatı. Örn: `1h`, `30m`, `1d`", flags: [MessageFlags.Ephemeral] });
            }
            return await ModerationService.handleJail(interaction, targetUser, reason, duration);
        }

        const allReasons = ConfigManager.get("PunishmentReasons") || [];
        const jailReasons = allReasons.filter(r => r && r.type === 3);

        if (jailReasons.length === 0) {
            if (!duration) {
                return interaction.reply({ content: "❌ Lütfen bir jail süresi belirtin. Örn: `/jail kullanıcı:@User süre:1h sebep:Reklam`", flags: [MessageFlags.Ephemeral] });
            }
            const finalReason = reason || "Bir sebep belirtilmemiş.";
            return await ModerationService.handleJail(interaction, targetUser, finalReason, duration);
        }

        const options = jailReasons.map(r => ({
            label: r.label.substring(0, 100),
            description: `1.İhlal: ${r.date1 || "1d"} | 2.İhlal: ${r.date2 || "3d"} | 3.İhlal: ${r.date3 || "7d"}`.substring(0, 100),
            value: r.value
        }));

        const menuRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`jail_select_reason_${targetUser.id}_${interaction.user.id}`)
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

        return interaction.reply(v2Payload);
    }
};
