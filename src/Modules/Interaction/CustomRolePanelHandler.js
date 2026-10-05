const { PermissionsBitField, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, TextInputStyle, StringSelectMenuBuilder, ChannelType } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const { V2ModalBuilder } = require("../../Core/Builders/V2ModalBuilder");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const CustomRoleCommand = require("../../Core/Database/CustomRoleCommand");

// Wizard state memory
const pendingCommands = new Map();

module.exports = async (interaction) => {
    const emojis = ConfigManager.get("Emojis") || {};
    const iptal = emojis.toji_iptal || "❌";
    const onay = emojis.toji_onay || "✅";
    const spark = emojis.toji_sparkles || "✦";

    if (interaction.customId && interaction.customId.startsWith("crc_")) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const panel = new V2PanelBuilder().addText(`> ${iptal} Bu paneli kullanabilmek için **Yönetici** yetkisine ihtiyacınız var.`);
            return interaction.reply({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral], components: panel.toJSON() }).catch(()=>{});
        }
    }

    if (interaction.isButton() && interaction.customId === "crc_cancel") {
        pendingCommands.delete(interaction.user.id);
        const panel = new V2PanelBuilder().addText(`> ${iptal} Komut oluşturma işlemi iptal edildi.`);
        return interaction.update({ components: panel.toJSON() }).catch(()=>{});
    }

    // --- Aşama 1: ALL-IN-ONE MODAL ---
    if (interaction.isButton() && interaction.customId === "crc_create") {
        const modal = new V2ModalBuilder()
            .setCustomId("crc_create_modal")
            .setTitle("Yeni Komut Oluştur")
            .addTextInput({
                customId: "cmd_name",
                label: "Komut Adı (Boşluksuz)",
                placeholder: "Örn: vip, yetkili, kayit",
                style: TextInputStyle.Short,
                required: true,
                maxLength: 20
            })
            .addRoleSelect({
                customId: "roles_to_give",
                label: "Verilecek Hedef Roller",
                placeholder: "Maksimum 5 rol seçin...",
                minValues: 1,
                maxValues: 5,
                required: true
            })
            .addRoleSelect({
                customId: "allowed_roles",
                label: "Komutu Kullanabilecek Yetkili Roller",
                placeholder: "Maksimum 10 yetkili rolü seçin...",
                minValues: 1,
                maxValues: 10,
                required: true
            })
            .addChannelSelect({
                customId: "log_channel",
                label: "Log Kanalı",
                placeholder: "Komutun loglanacağı kanalı seçin...",
                minValues: 1,
                maxValues: 1,
                channelTypes: [ChannelType.GuildText],
                required: true
            })
            .addTextInput({
                customId: "global_limit",
                label: "Sunucu Kotası (Sınırsız ise 0 girin)",
                placeholder: "Örn: 10 Veya 0",
                value: "0",
                style: TextInputStyle.Short,
                required: true
            });

        return interaction.showModal(modal.build()).catch((err) => {
            console.error("Modal gosterilirken hata olustu:", err);
            interaction.reply({ content: `API Hatası:\n\`\`\`js\n${err.message}\n\`\`\``, ephemeral: true }).catch(()=>{});
        });
    }

    // --- Aşama 2: Modal Onayı ve Sınırların Alınması ---
    if (interaction.isModalSubmit() && interaction.customId === "crc_create_modal") {
        const cmdName = interaction.fields.getTextInputValue("cmd_name").trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "");
        const globalLimitRaw = interaction.fields.getTextInputValue("global_limit");

        let globalLimit = 0;
        if (!isNaN(parseInt(globalLimitRaw))) globalLimit = parseInt(globalLimitRaw);

        let rolesToGive = [];
        let allowedRoles = [];
        let logChannel = "";

        try {
            // LabelBuilder wrapper format for Discord.js custom forks
            // fields inside interaction.fields often map directly to customId
            const rolesToGiveField = interaction.fields.fields.get("roles_to_give");
            if (rolesToGiveField && rolesToGiveField.values) rolesToGive = rolesToGiveField.values;
            
            const allowedRolesField = interaction.fields.fields.get("allowed_roles");
            if (allowedRolesField && allowedRolesField.values) allowedRoles = allowedRolesField.values;
            
            const logChannelField = interaction.fields.fields.get("log_channel");
            if (logChannelField && logChannelField.values) logChannel = logChannelField.values[0];
        } catch(e) {
            console.error(e);
        }

        if (rolesToGive.length === 0 || allowedRoles.length === 0) {
            const panel = new V2PanelBuilder().addText(`> ${iptal} Modalda rolleri veya kanalı geçerli şekilde seçemedik (API Parse hatası).`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("crc_cancel").setLabel("İptal Et").setStyle(ButtonStyle.Danger));
            return interaction.update({ flags: [MessageFlags.IsComponentsV2], components: [...panel.toJSON(), row.toJSON()] }).catch(()=>{});
        }

        const existing = await CustomRoleCommand.findOne({ guildID: interaction.guild.id, commandName: cmdName });
        if (existing) {
            const panel = new V2PanelBuilder().addText(`> ${iptal} \`.${cmdName}\` isimli komut zaten mevcut!`);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("crc_cancel").setLabel("İptal Et").setStyle(ButtonStyle.Danger));
            return interaction.update({ flags: [MessageFlags.IsComponentsV2], components: [...panel.toJSON(), row.toJSON()] }).catch(()=>{});
        }

        pendingCommands.set(interaction.user.id, {
            cmdName, globalLimit, rolesToGive, allowedRoles, logChannel
        });

        const panel = new V2PanelBuilder()
            .addAccessory(interaction.user.displayAvatarURL({dynamic:true}), `> ## ${spark} Kurulum Tamamlandı!\n> Lütfen seçtiğiniz **${allowedRoles.length} adet** yetkili için kotaları belirlemek üzere aşağıdaki butona basınız.`)
            .addDivider(1)
            .addText(`**Komut:** \`.${cmdName}\`\n**Sunucu Kotası:** ${globalLimit > 0 ? globalLimit : "Sınırsız"}`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("crc_step5_btn").setLabel("Yetkili Kotalarını Ayarla").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("crc_cancel").setLabel("İptal Et").setStyle(ButtonStyle.Danger)
        );
        
        return interaction.update({ flags: [MessageFlags.IsComponentsV2], components: [...panel.toJSON(), row.toJSON()] }).catch(()=>{});
    }

    // --- Aşama 3: Kotalar Modalı ---
    if (interaction.isButton() && interaction.customId === "crc_step5_btn") {
        const state = pendingCommands.get(interaction.user.id);
        if (!state) return interaction.deferUpdate().catch(()=>{});

        const modal = new V2ModalBuilder()
            .setCustomId("crc_modal_step5")
            .setTitle(`Kotaları Belirle (${state.allowedRoles.length} Rol)`)
            .addTextInput({
                customId: "role_limits",
                label: `Sınırları virgülle yazın (Örn: 4,3,2)`,
                placeholder: "Sırasıyla her rol için limit (0 = sınırsız)",
                value: state.allowedRoles.map(()=>"0").join(","),
                style: TextInputStyle.Short,
                required: true
            });

        return interaction.showModal(modal.build()).catch(()=>{});
    }

    if (interaction.isModalSubmit() && interaction.customId === "crc_modal_step5") {
        const state = pendingCommands.get(interaction.user.id);
        if (!state) return;

        const roleLimitsRaw = interaction.fields.getTextInputValue("role_limits");
        const limitsArray = roleLimitsRaw.split(",").map(x => parseInt(x.trim())).filter(x => !isNaN(x));

        const roleLimits = [];
        for (let i = 0; i < state.allowedRoles.length; i++) {
            const roleId = state.allowedRoles[i];
            const limit = limitsArray[i] !== undefined ? limitsArray[i] : 0;
            roleLimits.push({ roleID: roleId, limit: limit });
        }

        await CustomRoleCommand.create({
            guildID: interaction.guild.id,
            commandName: state.cmdName,
            rolesToGive: state.rolesToGive,
            roleLimits: roleLimits,
            allowedRoles: state.allowedRoles,
            globalLimit: state.globalLimit,
            logChannelID: state.logChannel,
            createdBy: interaction.user.id
        });

        pendingCommands.delete(interaction.user.id);

        const panel = new V2PanelBuilder()
            .addAccessory(interaction.user.displayAvatarURL({dynamic:true}), `> ## ${onay} Komut Başarıyla Oluşturuldu!\n> \`.${state.cmdName}\` komutu kullanıma hazırdır.`)
            .addDivider(1)
            .addText(`**Hedef Roller:** ${state.rolesToGive.map(r=>`<@&${r}>`).join(", ")}\n**Kullanacak Yetkililer ve Kotaları:**\n${roleLimits.map(x=>`<@&${x.roleID}>: ${x.limit > 0 ? x.limit + " Kişi" : "Sınırsız"}`).join("\n")}\n**Log Kanalı:** <#${state.logChannel}>\n**Sunucu Kotası:** ${state.globalLimit > 0 ? state.globalLimit : "Sınırsız"}`);

        return interaction.update({ flags: [MessageFlags.IsComponentsV2], components: panel.toJSON() }).catch(()=>{});
    }

    // Listeleme / Silme
    if (interaction.isButton() && interaction.customId === "crc_list") {
        const commands = await CustomRoleCommand.find({ guildID: interaction.guild.id });
        if (!commands || commands.length === 0) {
            const panel = new V2PanelBuilder().addText(`> ${iptal} Sunucuda ayarlanmış hiçbir özel komut bulunmuyor.`);
            const cancelRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("crc_cancel").setLabel("Geri Dön").setStyle(ButtonStyle.Danger));
            return interaction.update({ components: [...panel.toJSON(), cancelRow.toJSON()] }).catch(()=>{});
        }
        
        const options = commands.map(c => ({
            label: `.${c.commandName}`,
            description: `Global Kota: ${c.globalLimit > 0 ? c.globalLimit : "Sınırsız"} | Roller: ${c.rolesToGive.length}`,
            value: c.commandName
        }));

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId("crc_delete_select").setPlaceholder("Silmek istediğiniz komutu seçin...").addOptions(options.slice(0, 25))
        );
        const cancelRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("crc_cancel").setLabel("İptal Et").setStyle(ButtonStyle.Danger));

        const panelData = {
            flags: [MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## ${spark} Özel Komutları Yönet\nAşağıdaki menüden veritabanından kalıcı olarak silmek istediğiniz komutu seçebilirsiniz:` },
                    { type: 14, divider: true, spacing: 1 },
                    selectRow.toJSON(),
                    cancelRow.toJSON()
                ]
            }]
        };
        return interaction.update(panelData).catch(()=>{});
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "crc_delete_select") {
        const cmdName = interaction.values[0];
        await CustomRoleCommand.deleteOne({ guildID: interaction.guild.id, commandName: cmdName });
        const panel = new V2PanelBuilder().addText(`> ${onay} \`.${cmdName}\` özel rol komutu veritabanından kalıcı olarak silindi!`);
        return interaction.update({ components: panel.toJSON() }).catch(()=>{});
    }
};
