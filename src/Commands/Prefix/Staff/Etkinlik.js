const EventService = require("../../../Services/Moderation/EventService");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    name: "etkinlik",
    aliases: ["event", "etkinlikler"],
    category: "Staff",
    description: "Etkinlik Ana Yönetim Panelini açar.",
    
    async execute(client, message, args) {
        // Ana Menüyü Çağır (Service)
        return EventService.renderMainMenu(message);
    }
};
