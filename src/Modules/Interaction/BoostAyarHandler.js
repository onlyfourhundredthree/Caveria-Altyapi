const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const BoostAyarService = require("../../Services/Developers/BoostAyarService");

const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
module.exports = async (interaction) => {
    if (!interaction.customId || !interaction.customId.startsWith("boostayar_")) return;

    const isOwner = ConfigManager.isOwner(interaction.member);
    const isAdmin = interaction.member.permissions.has("Administrator");
    if (!isOwner && !isAdmin) return interaction.reply({ content: "Bu işlem için yetkiniz yok.", flags: [64] });

    const cid = interaction.customId;

    if (cid === "boostayar_menu") {
        const val = interaction.values[0];

        if (val === "channel") {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("boostayar_set_channel")
                    .setPlaceholder("Kutlama Kanalı Seçin")
                    .setChannelTypes(ChannelType.GuildText)
            );
            const panel = new V2PanelBuilder().addText("> " + "Boost kutlama kanalını seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }

        if (val === "log") {
            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId("boostayar_set_log")
                    .setPlaceholder("Log Kanalı Seçin")
                    .setChannelTypes(ChannelType.GuildText)
            );
            const panel = new V2PanelBuilder().addText("> " + "Log kanalını seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }

        if (val === "roles") {
            const row = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId("boostayar_set_roles")
                    .setPlaceholder("Ödül Rollerini Seçin")
                    .setMinValues(1)
                    .setMaxValues(10)
            );
            const panel = new V2PanelBuilder().addText("> " + "Boosterların seçebileceği ödül rollerini seçin:");
            panel.addActionRow(row);
            return interaction.update({ components: panel.toJSON() });
        }

        if (val === "message") {
            const modal = new ModalBuilder()
                .setCustomId("boostayar_modal_message")
                .setTitle("Boost Mesajı Ayarla");

            const input = new TextInputBuilder()
                .setCustomId("message")
                .setLabel("Kutlama Mesajı (Değişkenler: {user}, {server})")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue("Sunucuya boost basıldı! Teşekkürler {user}!");

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }

        if (val === "coin") {
            const modal = new ModalBuilder()
                .setCustomId("boostayar_modal_coin")
                .setTitle("Ödül Coin Ayarla");

            const input = new TextInputBuilder()
                .setCustomId("coin")
                .setLabel("Verilecek Coin Miktarı")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue("1000");

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return interaction.showModal(modal);
        }
    }

    if (cid === "boostayar_set_channel") {
        await ConfigManager.updateNested("Boost", "Channel", interaction.values[0], interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }

    if (cid === "boostayar_set_log") {
        await ConfigManager.updateNested("Boost", "LogChannel", interaction.values[0], interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }

    if (cid === "boostayar_set_roles") {
        await ConfigManager.updateNested("Boost", "RewardRoles", interaction.values, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }

    if (cid === "boostayar_modal_message") {
        const msg = interaction.fields.getTextInputValue("message");
        await ConfigManager.updateNested("Boost", "Message", msg, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }

    if (cid === "boostayar_modal_coin") {
        const coin = parseInt(interaction.fields.getTextInputValue("coin"));
        if (!isNaN(coin)) {
            await ConfigManager.updateNested("Boost", "RewardCoin", coin, interaction.user.tag);
        }
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }

    if (cid === "boostayar_sifirla") {
        await ConfigManager.set("Boost", {}, interaction.user.tag);
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }

    if (cid === "boostayar_yenile") {
        await interaction.deferUpdate().catch(()=>{}); return BoostAyarService.execute(interaction);
    }
};

module.exports.conf = {
    name: "interactionCreate"
};
