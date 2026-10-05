const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");
const EventService = require("../../../Services/Moderation/EventService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("etkinlik")
        .setDescription("Etkinlik Ana Yönetim Panelini açar."),

    async execute(interaction, client) {
        // Ana Menüyü Çağır (Service)
        return EventService.renderMainMenu(interaction);
    }
};
