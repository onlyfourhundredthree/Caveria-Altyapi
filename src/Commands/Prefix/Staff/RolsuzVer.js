const { PermissionsBitField, MessageFlags } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

module.exports = {
    conf: {
        usages: ["rolsüz-ver", "rolsuz-ver", "rolsuzver-sistemi", "rolsuzver"],
        description: "Üye rolü olmayan ve cezası bulunmayan herkese üye rolü verir.",
        category: "Staff",
        usage: ".rolsuzver"
    },

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !ConfigManager.isOwner(message.author.id)) {
            return message.reply({ content: "Bu komutu kullanmak için yeterli yetkiye sahip değilsin.", flags: [MessageFlags.Ephemeral] });
        }

        const memberRoleID = ConfigManager.get("Roles.Member");
        if (!memberRoleID) {
            return message.reply({ content: "Sistemde `Roles.Member` ayarlı değil. Lütfen kurulumdan üye rolünü ayarlayın." });
        }

        const jailRole = ConfigManager.get("Roles.Jailed");
        const underworldRole = ConfigManager.get("Roles.Underworld");
        const suspectRole = ConfigManager.get("Roles.Suspect");
        const bannedTagRole = ConfigManager.get("Roles.BannedTag");

        const msg = await message.reply({ content: "Sunucudaki üyeler taranıyor, lütfen bekleyin..." });

        await message.guild.members.fetch();

        const targetMembers = message.guild.members.cache.filter(m => {
            if (m.user.bot) return false;
            if (m.roles.cache.has(memberRoleID)) return false;
            
            if (jailRole && m.roles.cache.has(jailRole)) return false;
            if (underworldRole && m.roles.cache.has(underworldRole)) return false;
            if (suspectRole && m.roles.cache.has(suspectRole)) return false;
            if (bannedTagRole && m.roles.cache.has(bannedTagRole)) return false;
            
            return true;
        });

        if (targetMembers.size === 0) {
            return msg.edit({ content: "Sunucuda üye rolü verilecek uygun kimse bulunamadı (Tüm cezasız üyelerde rol zaten var)." });
        }

        await msg.edit({ content: `Toplam **${targetMembers.size}** kişiye üye rolü verilmeye başlanıyor. Bu işlem biraz sürebilir...` });

        let count = 0;
        let errorCount = 0;

        for (const [id, member] of targetMembers) {
            try {
                await member.roles.add(memberRoleID);
                count++;
            } catch (err) {
                errorCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await msg.edit({ content: `İşlem tamamlandı! **${count}** kişiye üye rolü verildi. ${errorCount > 0 ? "(`" + errorCount + "` kişiye verilemedi)" : ""}` });
    }
};
