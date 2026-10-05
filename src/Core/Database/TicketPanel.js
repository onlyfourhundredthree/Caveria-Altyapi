const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: { type: String, required: true },
    name: { type: String, required: true },
    customId: { type: String, required: true, unique: true },
    categoryId: { type: String, default: "" }, // Kategori ID'si (Taleplerin açılacağı yer)
    questions: [{ question: String }], // Modal'da sorulacak sorular
    staffRoles: { type: [String], default: [] }, // Yetkili Rolleri
    managerRoles: { type: [String], default: [] }, // Kapatma yetkisi olan roller
    panelMessage: { type: String, default: "" }, // Gömülü embed / açıklama
    active: { type: Boolean, default: true }
});

module.exports = mongoose.model("TicketPanel", schema);
