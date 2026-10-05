const { ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const EcoAyarService = require("../../Services/Developers/EcoAyarService");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");

module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("ecoayar_")) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    const isAdmin = interaction.member.permissions.has("Administrator");
    if (!isOwner && !isAdmin) return interaction.reply({ content: "Bu işlem için yetkiniz yok.", flags: [64] });

    const cid = interaction.customId;

    if (cid === "ecoayar_menu") {
        const val = interaction.values[0];

        if (val === "log") {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId("ecoayar_set_log").setPlaceholder("Log Kanalı Seçin").setChannelTypes(ChannelType.GuildText)
            );
            const panel = new V2PanelBuilder().addText("> " + "Lütfen bir log kanalı seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }
        
        if (val === "market") {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId("ecoayar_set_market").setPlaceholder("Market Kanalı Seçin").setChannelTypes(ChannelType.GuildText)
            );
            const panel = new V2PanelBuilder().addText("> " + "Lütfen bir market kanalı seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }
        
        if (val === "admin") {
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder().setCustomId("ecoayar_set_admin").setPlaceholder("Yetkili Rolleri Seçin (En fazla 10)").setMinValues(1).setMaxValues(10)
            );
            const panel = new V2PanelBuilder().addText("> " + "Lütfen Ekonomi yetkili rollerini seçin. (Seçtikleriniz eskilerin üzerine yazılır)");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }

        if (val === "gain") {
            const config = ConfigManager.get("Economy") || {};
            const modal = new ModalBuilder().setCustomId("ecoayar_modal_gain").setTitle("Kazanım Oranları");
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("daily").setLabel("Günlük Min-Max (Örn: 100-500)").setStyle(TextInputStyle.Short).setValue(`${config.DailyMin || 100}-${config.DailyMax || 500}`).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("chat").setLabel("Mesaj Min-Max (Örn: 1-5)").setStyle(TextInputStyle.Short).setValue(`${config.ChatMin || 1}-${config.ChatMax || 5}`).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("voice").setLabel("Ses Min-Max (Örn: 5-15)").setStyle(TextInputStyle.Short).setValue(`${config.VoiceMin || 5}-${config.VoiceMax || 15}`).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("levelcoin").setLabel("Seviye Başı Coin Ödülü (Örn: 100)").setStyle(TextInputStyle.Short).setValue(`${config.LevelCoin || 100}`).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (val === "penalty") {
            const config = ConfigManager.get("Economy") || {};
            const modal = new ModalBuilder().setCustomId("ecoayar_modal_penalty").setTitle("Ceza Kesintileri");
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("mute").setLabel("Mute Kesintisi").setStyle(TextInputStyle.Short).setValue(`${config.MutePenalty || 50}`).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("jail").setLabel("Jail Kesintisi").setStyle(TextInputStyle.Short).setValue(`${config.JailPenalty || 200}`).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("ban").setLabel("Ban Kesintisi").setStyle(TextInputStyle.Short).setValue(`${config.BanPenalty || 1000}`).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        if (val === "name") {
            const config = ConfigManager.get("Economy") || {};
            const modal = new ModalBuilder().setCustomId("ecoayar_modal_name").setTitle("Para Birimi");
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Para Birimi Adı").setStyle(TextInputStyle.Short).setValue(`${config.CoinName || "Coin"}`).setRequired(true))
            );
            return interaction.showModal(modal);
        }
    }

    if (cid === "ecoayar_set_log") {
        await ConfigManager.updateNested("Economy", "LogChannel", interaction.values[0], interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }
    
    if (cid === "ecoayar_set_market") {
        await ConfigManager.updateNested("Economy", "MarketChannel", interaction.values[0], interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }
    
    if (cid === "ecoayar_set_admin") {
        await ConfigManager.updateNested("Economy", "AdminRoles", interaction.values, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }

    if (cid === "ecoayar_modal_gain") {
        const daily = interaction.fields.getTextInputValue("daily").split("-");
        const chat = interaction.fields.getTextInputValue("chat").split("-");
        const voice = interaction.fields.getTextInputValue("voice").split("-");
        const levelCoin = parseInt(interaction.fields.getTextInputValue("levelcoin")) || 100;
        
        await ConfigManager.updateNested("Economy", "DailyMin", parseInt(daily[0]) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "DailyMax", parseInt(daily[1]) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "ChatMin", parseInt(chat[0]) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "ChatMax", parseInt(chat[1]) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "VoiceMin", parseInt(voice[0]) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "VoiceMax", parseInt(voice[1]) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "LevelCoin", levelCoin, interaction.user.tag);
        
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }
    
    if (cid === "ecoayar_modal_penalty") {
        await ConfigManager.updateNested("Economy", "MutePenalty", parseInt(interaction.fields.getTextInputValue("mute")) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "JailPenalty", parseInt(interaction.fields.getTextInputValue("jail")) || 0, interaction.user.tag);
        await ConfigManager.updateNested("Economy", "BanPenalty", parseInt(interaction.fields.getTextInputValue("ban")) || 0, interaction.user.tag);
        
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }
    
    if (cid === "ecoayar_modal_name") {
        await ConfigManager.updateNested("Economy", "CoinName", interaction.fields.getTextInputValue("name"), interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }

    if (cid === "ecoayar_sifirla") {
        await ConfigManager.set("Economy", {}, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return EcoAyarService.execute(interaction);
    }
    
    if (cid === "ecoayar_yenile") {
        await interaction.deferUpdate();
        return EcoAyarService.execute(interaction);
    }
};
