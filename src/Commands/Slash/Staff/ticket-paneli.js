const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const TicketPanel = require("../../../Core/Database/TicketPanel");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-paneli")
        .setDescription("Yeni bir destek talebi paneli oluşturur ve yönetir.")
        .addSubcommand(sub => 
            sub.setName("oluştur")
            .setDescription("Yeni bir ticket paneli oluşturur.")
            .addStringOption(o => o.setName("ad").setDescription("Panelin adı (örn: Şikayet Talebi)").setRequired(true))
            .addStringOption(o => o.setName("custom_id").setDescription("Sistemsel benzersiz ID (örn: sikayet)").setRequired(true))
            .addChannelOption(o => o.setName("kategori").setDescription("Ticketların açılacağı kategori").setRequired(true))
            .addStringOption(o => o.setName("sorular").setDescription("Modalda sorulacak sorular (| ile ayırın)").setRequired(false))
            .addStringOption(o => o.setName("yetkili_rolleri").setDescription("Görebilecek roller (Virgülle ayırın, ID girin)").setRequired(false))
            .addStringOption(o => o.setName("kapatma_rolleri").setDescription("Kapatabilecek roller (Virgülle ayırın, ID girin)").setRequired(false))
            .addStringOption(o => o.setName("mesaj").setDescription("Butonun üstünde yazacak açıklama").setRequired(false))
        )
        .addSubcommand(sub => 
            sub.setName("gönder")
            .setDescription("Oluşturulan ticket panelini mevcut kanala gönderir.")
            .addStringOption(o => o.setName("custom_id").setDescription("Gönderilecek panelin ID'si").setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName("sil")
            .setDescription("Mevcut bir ticket panelini siler.")
            .addStringOption(o => o.setName("custom_id").setDescription("Silinecek panelin ID'si").setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName("liste")
            .setDescription("Mevcut ticket panellerini listeler.")
        ),

    async execute(interaction) {
        if (!ConfigManager.isOwner(interaction.member) && !interaction.member.permissions.has("Administrator")) {
            return interaction.reply({ content: "Bu komutu kullanmak için yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "oluştur") {
            const name = interaction.options.getString("ad");
            const customId = interaction.options.getString("custom_id").toLowerCase().replace(/\s+/g, "_");
            const category = interaction.options.getChannel("kategori");
            const questionsStr = interaction.options.getString("sorular") || "Lütfen sorununuzu kısaca anlatın.";
            const staffRolesStr = interaction.options.getString("yetkili_rolleri") || "";
            const managerRolesStr = interaction.options.getString("kapatma_rolleri") || "";
            const panelMessage = interaction.options.getString("mesaj") || `> ## ${ConfigManager.get("Emojis.toji_ticket") || "🎫"} ${name}\n> -# Destek talebi oluşturmak için aşağıdaki butona tıklayabilirsiniz.`;

            if (category.type !== 4) { // 4 is GuildCategory
                return interaction.reply({ content: "❌ Lütfen geçerli bir kategori seçin.", flags: [MessageFlags.Ephemeral] });
            }

            const existing = await TicketPanel.findOne({ customId });
            if (existing) {
                return interaction.reply({ content: `❌ \`${customId}\` ID'sine sahip bir panel zaten var.`, flags: [MessageFlags.Ephemeral] });
            }

            const questions = questionsStr.split("|").map(q => ({ question: q.trim() })).filter(q => q.question);
            const staffRoles = staffRolesStr.split(",").map(r => r.trim()).filter(r => r);
            const managerRoles = managerRolesStr.split(",").map(r => r.trim()).filter(r => r);

            await TicketPanel.create({
                guildID: interaction.guild.id,
                name,
                customId,
                categoryId: category.id,
                questions,
                staffRoles,
                managerRoles,
                panelMessage
            });

            return interaction.reply({
                content: `✅ **${name}** ticket paneli başarıyla oluşturuldu!\n\n📋 **Panel ID:** \`${customId}\`\n📂 **Kategori:** <#${category.id}>\n👥 **Yetkililer:** ${staffRoles.length} rol\n❓ **Soru Sayısı:** ${questions.length}`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        if (subcommand === "gönder") {
            const customId = interaction.options.getString("custom_id");
            const panel = await TicketPanel.findOne({ customId, guildID: interaction.guild.id });

            if (!panel) {
                return interaction.reply({ content: "❌ Belirtilen ID'ye sahip bir panel bulunamadı.", flags: [MessageFlags.Ephemeral] });
            }

            const v2Components = [
                {
                    type: 17,
                    components: [
                        { type: 10, content: panel.panelMessage },
                        {
                            type: 1,
                            components: [
                                { type: 2, custom_id: `ticket_start_${panel.customId}`, label: panel.name + " Oluştur", style: 3, emoji: { name: "🎫" } }
                            ]
                        }
                    ]
                }
            ];

            await interaction.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
            return interaction.reply({ content: "✅ Panel başarıyla gönderildi.", flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === "sil") {
            const customId = interaction.options.getString("custom_id");
            const deleted = await TicketPanel.findOneAndDelete({ customId, guildID: interaction.guild.id });

            if (!deleted) {
                return interaction.reply({ content: "❌ Belirtilen ID'ye sahip bir panel bulunamadı.", flags: [MessageFlags.Ephemeral] });
            }

            return interaction.reply({ content: `✅ \`${customId}\` ID'li panel silindi.`, flags: [MessageFlags.Ephemeral] });
        }

        if (subcommand === "liste") {
            const panels = await TicketPanel.find({ guildID: interaction.guild.id });

            if (panels.length === 0) {
                return interaction.reply({ content: "❌ Sunucuda oluşturulmuş hiçbir ticket paneli bulunmuyor.", flags: [MessageFlags.Ephemeral] });
            }

            const list = panels.map((p, i) => `**${i + 1}.** ${p.name} (\`${p.customId}\`) - Kategori: <#${p.categoryId}>`).join("\n");
            
            return interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [{
                    type: 17,
                    components: [{ type: 10, content: `> ## 🎫 Ticket Panelleri\n${list}` }]
                }]
            });
        }
    }
};

