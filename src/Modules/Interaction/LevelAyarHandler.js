const { ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const { V2ModalBuilder } = require("../../Core/Builders/V2ModalBuilder");

function getFieldValues(interaction, customId) {
    try {
        const field = interaction.fields.fields.get(customId);
        if (!field) return [];
        if (Array.isArray(field.values) && field.values.length > 0) return field.values;
        if (field.value) return [field.value];
        return [];
    } catch (e) {
        return [];
    }
}

function getTextInput(interaction, customId) {
    try {
        const textVal = interaction.fields.getTextInputValue(customId);
        if (textVal !== undefined && textVal !== null) return textVal;
    } catch (e) {}
    const fieldVals = getFieldValues(interaction, customId);
    return fieldVals[0] || "";
}
module.exports = async (interaction) => {
    if (!interaction.guild) return;
    if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isAnySelectMenu()) return;
    if (!interaction.customId || !interaction.customId.startsWith("levelayar_")) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    if (!isOwner) {
        return interaction.reply({ content: "Yetkiniz yok.", flags: [MessageFlags.Ephemeral] });
    }


    const LevelAyarService = require("../../Services/Developers/LevelAyarService");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
    const guild = interaction.guild;
    const cid = interaction.customId;

    if (cid === "levelayar_refresh") {
        await interaction.deferUpdate();
        return LevelAyarService.execute(interaction);
    }

    if (cid === "levelayar_menu") {
        const val = interaction.values[0];
        const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require("discord.js");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
        if (val === "msglog") {
            const row = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("levelayar_set_msglog").setPlaceholder("Mesaj Level Log Kanalı").setChannelTypes(ChannelType.GuildText));
            const panel = new V2PanelBuilder().addText("> " + "Mesaj level atlamalarının düşeceği kanalı seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] });
        }
        if (val === "voicelog") {
            const row = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("levelayar_set_voicelog").setPlaceholder("Ses Level Log Kanalı").setChannelTypes(ChannelType.GuildText));
            const panel = new V2PanelBuilder().addText("> " + "Ses level atlamalarının düşeceği kanalı seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] });
        }
    }

    if (cid === "levelayar_set_msglog") {
        await interaction.deferUpdate().catch(()=>{});
        await ConfigManager.updateNested("Channels", "MessageLevelLog", interaction.values[0], interaction.user.tag);
        return LevelAyarService.execute(interaction);
    }

    if (cid === "levelayar_set_voicelog") {
        await interaction.deferUpdate().catch(()=>{});
        await ConfigManager.updateNested("Channels", "VoiceLevelLog", interaction.values[0], interaction.user.tag);
        return LevelAyarService.execute(interaction);
    }
    if (cid === "levelayar_add") {
        const modalBuilder = new V2ModalBuilder()
            .setCustomId("levelayar_modal_add")
            .setTitle("Level Rol Ekle")
            .addRoleSelect({
                customId: "role_id",
                label: "Eklenecek Rol",
                placeholder: "Lütfen eklenecek rolü seçin...",
                required: true
            })
            .addTextInput({
                customId: "msg_level",
                label: "Mesaj Leveli (Boş Bırakılabilir)",
                placeholder: "Örn: 5",
                style: TextInputStyle.Short,
                required: false
            })
            .addTextInput({
                customId: "voice_level",
                label: "Ses Leveli (Boş Bırakılabilir)",
                placeholder: "Örn: 10",
                style: TextInputStyle.Short,
                required: false
            });

        return interaction.showModal(modalBuilder.build());
    }

    if (cid === "levelayar_modal_add") {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const roleIds = getFieldValues(interaction, "role_id");
        const roleId = roleIds[0] || null;
        
        if (!roleId) {
            return interaction.editReply({ content: "Rol seçimi yapılamadı. İşlem iptal edildi." });
        }

        const msgLevelStr = getTextInput(interaction, "msg_level").trim();
        const voiceLevelStr = getTextInput(interaction, "voice_level").trim();

        if (!msgLevelStr && !voiceLevelStr) {
            return interaction.editReply({ content: "Herhangi bir level değeri girmediniz. İşlem iptal edildi." });
        }

        let responseMessage = `<@&${roleId}> rolü için güncellemeler:\n`;

        if (msgLevelStr) {
            const level = parseInt(msgLevelStr);
            if (!isNaN(level) && level >= 0) {
                const currentRanks = ConfigManager.get("Roles.MessageRanks") || [];
                if (currentRanks.some(r => r.Level === level)) {
                    responseMessage += `- **Mesaj:** Level \`${level}\` için zaten başka bir rol var!\n`;
                } else if (currentRanks.some(r => (r.Role || r.role || r.roleID) === roleId)) {
                    responseMessage += `- **Mesaj:** Bu rol zaten kayıtlı!\n`;
                } else {
                    const newRanks = [...currentRanks, { Level: level, Role: roleId }].sort((a, b) => a.Level - b.Level);
                    await ConfigManager.updateNested("Roles", "MessageRanks", newRanks, interaction.user.tag);
                    responseMessage += `- **Mesaj:** Level \`${level}\` başarıyla eklendi.\n`;
                }
            } else {
                responseMessage += `- **Mesaj:** Geçersiz bir level numarası girdiniz.\n`;
            }
        }

        if (voiceLevelStr) {
            const level = parseInt(voiceLevelStr);
            if (!isNaN(level) && level >= 0) {
                const currentRanks = ConfigManager.get("Roles.VoiceRanks") || [];
                if (currentRanks.some(r => r.Level === level)) {
                    responseMessage += `- **Ses:** Level \`${level}\` için zaten başka bir rol var!\n`;
                } else if (currentRanks.some(r => (r.Role || r.role || r.roleID) === roleId)) {
                    responseMessage += `- **Ses:** Bu rol zaten kayıtlı!\n`;
                } else {
                    const newRanks = [...currentRanks, { Level: level, Role: roleId }].sort((a, b) => a.Level - b.Level);
                    await ConfigManager.updateNested("Roles", "VoiceRanks", newRanks, interaction.user.tag);
                    responseMessage += `- **Ses:** Level \`${level}\` başarıyla eklendi.\n`;
                }
            } else {
                responseMessage += `- **Ses:** Geçersiz bir level numarası girdiniz.\n`;
            }
        }

        return interaction.editReply({ content: responseMessage });
    }

    if (cid === "levelayar_reset") {
        await interaction.deferUpdate();
        await ConfigManager.updateNested("Roles", "MessageRanks", [], interaction.user.tag);
        await ConfigManager.updateNested("Roles", "VoiceRanks", [], interaction.user.tag);
        
        return interaction.editReply({
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [{ type: 10, content: `Tüm level rolleri sıfırlandı.` }]
            }]
        });
    }

    if (cid === "levelayar_delete") {
        const msgRanks = ConfigManager.get("Roles.MessageRanks") || [];
        const voiceRanks = ConfigManager.get("Roles.VoiceRanks") || [];

        const uniqueRoles = new Map();
        
        for (const r of msgRanks) {
            const id = r.Role || r.role || r.roleID || "BİLİNMEYEN_ROL";
            uniqueRoles.set(id, { id, msgLevel: r.Level, voiceLevel: null });
        }
        
        for (const r of voiceRanks) {
            const id = r.Role || r.role || r.roleID || "BİLİNMEYEN_ROL";
            if (uniqueRoles.has(id)) {
                uniqueRoles.get(id).voiceLevel = r.Level;
            } else {
                uniqueRoles.set(id, { id, msgLevel: null, voiceLevel: r.Level });
            }
        }

        if (uniqueRoles.size === 0) {
            return interaction.reply({ content: "Silinecek kayıt yok.", flags: [MessageFlags.Ephemeral] });
        }

        const options = Array.from(uniqueRoles.values()).slice(0, 25).map(rData => {
            const role = guild.roles.cache.get(rData.id);
            const descParts = [];
            if (rData.msgLevel !== null) descParts.push(`Mesaj Lvl: ${rData.msgLevel}`);
            if (rData.voiceLevel !== null) descParts.push(`Ses Lvl: ${rData.voiceLevel}`);

            return {
                label: role ? role.name : String(rData.id),
                description: descParts.join(" | "),
                value: String(rData.id)
            };
        });

        return interaction.reply({
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `### Silmek istediğiniz rolü seçin:\nSeçtiğiniz rol hem ses hem de mesaj level ayarlarından tamamen kaldırılacaktır.` },
                    { type: 1, components: [{ type: 3, custom_id: "levelayar_do_delete", placeholder: "Sistemden tamamen silinecek rolü seçin...", options }] }
                ]
            }]
        });
    }

    if (cid === "levelayar_do_delete") {
        await interaction.deferUpdate();
        const selectedRoleId = interaction.values[0];

        const msgRanks = ConfigManager.get("Roles.MessageRanks") || [];
        const voiceRanks = ConfigManager.get("Roles.VoiceRanks") || [];

        const newMsgRanks = msgRanks.filter(r => (r.Role || r.role || r.roleID || "BİLİNMEYEN_ROL") !== selectedRoleId);
        const newVoiceRanks = voiceRanks.filter(r => (r.Role || r.role || r.roleID || "BİLİNMEYEN_ROL") !== selectedRoleId);

        await ConfigManager.updateNested("Roles", "MessageRanks", newMsgRanks, interaction.user.tag);
        await ConfigManager.updateNested("Roles", "VoiceRanks", newVoiceRanks, interaction.user.tag);

        return interaction.editReply({
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
            components: [{
                type: 17,
                components: [{ type: 10, content: `<@&${selectedRoleId}> rolü hem mesaj hem de ses level sisteminden kaldırıldı.` }]
            }]
        });
    }
};
