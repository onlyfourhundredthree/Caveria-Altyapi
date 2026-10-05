const { MessageFlags } = require("discord.js");
const RoleButton = require("../../Core/Database/RoleButton");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("rolebtn_")) return;

    // rolebtn_ prefixinden sonrasını (customId'yi) al
    const rawId = interaction.customId.replace("rolebtn_", "");

    // Veritabanından kuralı bul
    const roleBtnData = await RoleButton.findOne({ guildID: interaction.guild.id, customId: rawId });

    if (!roleBtnData) {
        return interaction.reply({ content: "❌ Bu buton yapılandırılmamış veya silinmiş. Lütfen yetkililere bildirin.", flags: [MessageFlags.Ephemeral] });
    }

    const role = interaction.guild.roles.cache.get(roleBtnData.roleId);
    if (!role) {
        return interaction.reply({ content: "❌ İşlem yapılacak rol sunucuda bulunamadı (silinmiş olabilir).", flags: [MessageFlags.Ephemeral] });
    }

    // Bot yetki kontrolü
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
        return interaction.reply({ content: `❌ Benim yetkim **${role.name}** rolünü düzenlemeye yetmiyor. Rolümü yukarı taşımalısınız.`, flags: [MessageFlags.Ephemeral] });
    }

    const member = interaction.member;
    const hasRole = member.roles.cache.has(role.id);
    const action = roleBtnData.actionType;
    const customMessage = roleBtnData.successMessage;

    const emojis = ConfigManager.get("Emojis") || {};
    const onayEmoji = emojis.toji_onay || "✅";
    const iptalEmoji = emojis.toji_iptal || "❌";
    
    // İşlem mantığı
    try {
        if (action === "give") {
            if (hasRole) {
                return interaction.reply({ content: `${iptalEmoji} Zaten **${role.name}** rolüne sahipsiniz.`, flags: [MessageFlags.Ephemeral] });
            }
            await member.roles.add(role.id, "Role Button ile eklendi.");
            const replyText = customMessage ? customMessage : "Rol başarıyla size **verildi**.";
            return interaction.reply({ content: `${onayEmoji} ${replyText}`, flags: [MessageFlags.Ephemeral] });
        } 
        else if (action === "take") {
            if (!hasRole) {
                return interaction.reply({ content: `${iptalEmoji} Zaten **${role.name}** rolüne sahip değilsiniz.`, flags: [MessageFlags.Ephemeral] });
            }
            await member.roles.remove(role.id, "Role Button ile alındı.");
            const replyText = customMessage ? customMessage : "Rol başarıyla sizden **alındı**.";
            return interaction.reply({ content: `${onayEmoji} ${replyText}`, flags: [MessageFlags.Ephemeral] });
        }
        else if (action === "toggle") {
            if (hasRole) {
                await member.roles.remove(role.id, "Role Button (Toggle) ile alındı.");
                const replyText = customMessage ? customMessage : "Rol başarıyla sizden **alındı**.";
                return interaction.reply({ content: `${onayEmoji} ${replyText}`, flags: [MessageFlags.Ephemeral] });
            } else {
                await member.roles.add(role.id, "Role Button (Toggle) ile eklendi.");
                const replyText = customMessage ? customMessage : "Rol başarıyla size **verildi**.";
                return interaction.reply({ content: `${onayEmoji} ${replyText}`, flags: [MessageFlags.Ephemeral] });
            }
        }
    } catch (error) {
        console.error(`[RoleButtonHandler] Hata:`, error);
        return interaction.reply({ content: `${iptalEmoji} İşleminizi gerçekleştirirken bir hata oluştu.`, flags: [MessageFlags.Ephemeral] });
    }
};

module.exports.conf = {
    name: "interactionCreate"
};
