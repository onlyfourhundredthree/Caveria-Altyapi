const mongoose = require("mongoose");

const eventTemplateSchema = new mongoose.Schema({
    TemplateName: { type: String, required: true }, // Örn: "Vampir Köylü"
    EventName: { type: String, default: null },
    EventDescription: { type: String, default: null },
    AnnouncementText: { type: String, default: null },
    CoverImage: { type: String, default: null },
    MainChannel: { type: String, default: null },
    SubChannels: { type: Array, default: [] },
    CreatorID: { type: String, required: true }, // Şablonu kimin oluşturduğu bilgisi
    CreatedAt: { type: Number, default: () => Date.now() }
});

module.exports = mongoose.model("EventTemplate", eventTemplateSchema);
