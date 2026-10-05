const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const Punitives = require("../../../Core/Database/Punitives");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("forceban")
        .setDescription("Kullanıcıyı sunucudan uzaklaştırmanızı sağlar.")
        .addStringOption(option =>
            option.setName("id")
                .setDescription("Kullanıcıyı sunucudan uzaklaştırmanızı sağlar.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("sebep")
                .setDescription("Kullanıcıyı sunucudan uzaklaştırmanızı sağlar.")
                .setRequired(false)),

    async execute(interaction) {
        const { member, guild, options, user: author } = interaction;
        const targetId = options.getString("id");
        const reason = options.getString("sebep") || "Sebep belirtilmedi.";

        if (!ConfigManager.isOwner(member)) {
            return interaction.reply({ content: "Bu komutu kullanmaya yetkiniz yok (Sadece Kurucular).", flags: [MessageFlags.Ephemeral] });
        }

        if (targetId === author.id) return interaction.reply({ content: "Kendinize işlem uygulayamazsınız.", flags: [MessageFlags.Ephemeral] });

        try {
            const forcebanData = await Punitives.findOne({ Member: targetId, Type: "Kalkmaz Yasaklama", Active: true });
            const user = await interaction.client.users.fetch(targetId).catch(() => null);

            if (forcebanData) {
                await Punitives.updateOne({ No: forcebanData.No }, { $set: { Active: false, Expried: Date.now(), Remover: author.id } });
                await guild.members.unban(targetId).catch(() => { });

                const emojis = ConfigManager.get("Emojis") || {};
                const successEmoji = emojis.toji_onay || "🟢";
                const responseLayout = [
                    {
                        type: 17,
                        components: [
                            {
                                type: 10,
                                content: `> ${successEmoji} **${user ? user.tag : targetId}** kullanıcısının forceban yasağı kaldırıldı.`
                            }
                        ]
                    }
                ];
                return interaction.reply({ flags: [MessageFlags.IsComponentsV2], components: responseLayout });
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: "İşlem sırasında bir hata oluştu.", flags: [MessageFlags.Ephemeral] });
        }
    }
};
