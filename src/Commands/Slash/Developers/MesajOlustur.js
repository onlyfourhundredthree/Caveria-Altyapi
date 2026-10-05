const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const MessageBuilderCache = require("../../../Core/Handlers/MessageBuilderCache");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

function buildDashboard(userId, userObj) {
    const draft = MessageBuilderCache.getDraft(userId);
    const emojis = ConfigManager.get("Emojis") || {};
    const spark = emojis.toji_sparkles || "";
    
    const components = [
        {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `## ${spark} Mesaj Oluşturucu Paneli\n> **Durum:** ${draft.editMode ? `Düzenleme Modu (${draft.editMessageId})` : "Yeni Mesaj Oluşturuluyor"}\n> **Bileşen Sayısı:** \`${draft.components.length}\`\n\nAşağıdaki butonları kullanarak mesaja bileşen (Metin, Bölüm, Buton vb.) ekleyebilir veya düzenleyebilirsiniz.`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: MessageBuilderCache.getComponentSummary(userId)
                }
            ]
        }
    ];

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("mb_add_component").setLabel("Bileşen Ekle").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("mb_edit_component").setLabel("Bileşen Düzenle").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("mb_delete_component").setLabel("Bileşen Sil").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("mb_container_color").setLabel("Renk Ayarla").setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("mb_move_up").setLabel("Yukarı").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mb_move_down").setLabel("Aşağı").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mb_code_export").setLabel("V2 Kodu Al").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("mb_clear").setLabel("Sıfırla").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("mb_send").setLabel(draft.editMode ? "Güncelle" : "Kanala Gönder").setStyle(ButtonStyle.Success)
    );

    components[0].components.push(row1.toJSON(), row2.toJSON());
    if (draft.containerColor !== null) components[0].accent_color = draft.containerColor;

    return { flags: [MessageFlags.IsComponentsV2], components };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mesaj")
        .setDescription("V2 Panel sistemi ile gelişmiş mesaj oluşturun veya düzenleyin.")
        .addSubcommand(sub =>
            sub.setName("oluştur")
            .setDescription("Yeni bir mesaj oluşturma paneli başlatır.")
        )
        .addSubcommand(sub =>
            sub.setName("düzenle")
            .setDescription("Mevcut bir mesajı düzenleme paneli başlatır.")
            .addStringOption(opt => opt.setName("mesaj_id").setDescription("Düzenlenecek mesajın ID'si").setRequired(true))
        ),

    buildDashboard,

    async execute(interaction) {
        const isOwner = ConfigManager.isOwner(interaction.member);
        if (!isOwner && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Bu paneli açmak için yeterli yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const subcommand = interaction.options.getSubcommand();
        let messageId = null;

        MessageBuilderCache.clearDraft(interaction.user.id);
        const draft = MessageBuilderCache.getDraft(interaction.user.id);
        draft.channelId = interaction.channel.id;

        if (subcommand === "düzenle") {
            messageId = interaction.options.getString("mesaj_id");
            try {
                const msg = await interaction.channel.messages.fetch(messageId);
                if (!msg) return interaction.reply({ content: "Mesaj bulunamadı! Lütfen ID'yi kontrol edin ve komutu mesajın bulunduğu kanalda kullanın.", flags: [MessageFlags.Ephemeral] });
                
                const loaded = MessageBuilderCache.loadFromMessage(interaction.user.id, msg);
                if (!loaded) return interaction.reply({ content: "Bu mesaj V2 Panel formatında değil, bu yüzden düzenlenemez.", flags: [MessageFlags.Ephemeral] });

                draft.editMode = true;
                draft.editMessageId = messageId;
                draft.editMessageChannelId = interaction.channel.id;
            } catch (e) {
                return interaction.reply({ content: "Mesaj bulunamadı! Komutu mesajın bulunduğu kanalda kullandığınızdan emin olun.", flags: [MessageFlags.Ephemeral] });
            }
        }

        const dashboardPayload = buildDashboard(interaction.user.id, interaction.user);
        const previewPayload = MessageBuilderCache.buildPayload(interaction.user.id) || { content: "*(Önizleme: Henüz bileşen eklenmedi)*", components: [] };
        
        await interaction.reply({ content: "Mesaj oluşturucu başlatılıyor...", flags: [MessageFlags.Ephemeral] });
        
        const previewMsg = await interaction.channel.send(previewPayload);
        const dashboardMsg = await interaction.channel.send(dashboardPayload);

        draft.previewId = previewMsg.id;
        draft.dashboardId = dashboardMsg.id;
    }
};
