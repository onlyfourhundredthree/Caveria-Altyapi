const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isRoleSelectMenu() && !interaction.isChannelSelectMenu() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("tagban_")) return;

    if (!ConfigManager.isOwner(interaction.member) ) {
        return interaction.reply({ content: "Bu işlemi yapmaya yetkiniz yok.", ephemeral: true });
    }

    const customId = interaction.customId;

    if (customId === "tagban_panel_toggle") {
        const current = ConfigManager.get("TagBan.Enabled");
        await ConfigManager.set("TagBan.Enabled", !current, interaction.user.tag);
        
        await interaction.deferUpdate();
        
        // Re-execute the command to update the menu visually
        const command = interaction.client.commands.get("tagban") || interaction.client.appCommands.get("tagban");
        if (command) {
            interaction.message.delete().catch(()=>{});
            const fakeMessage = { 
                member: interaction.member, 
                author: interaction.user, 
                reply: async (data) => interaction.channel.send(data),
                channel: interaction.channel,
                client: interaction.client
            };
            if(command.execute) command.execute(fakeMessage.client, fakeMessage, []);
        }
        return;
    }

    if (customId === "tagban_panel_action") {
        const current = ConfigManager.get("TagBan.Action") || "rol";
        const newAction = current === "ban" ? "rol" : "ban";
        await ConfigManager.set("TagBan.Action", newAction, interaction.user.tag);
        
        await interaction.deferUpdate();
        
        const command = interaction.client.commands.get("tagban") || interaction.client.appCommands.get("tagban");
        if (command) {
            interaction.message.delete().catch(()=>{});
            const fakeMessage = { 
                member: interaction.member, 
                author: interaction.user, 
                reply: async (data) => interaction.channel.send(data),
                channel: interaction.channel,
                client: interaction.client
            };
            if(command.execute) command.execute(fakeMessage.client, fakeMessage, []);
        }
        return;
    }

    if (customId === "tagban_panel_roleselect") {
        const roleId = interaction.values[0];
        await ConfigManager.set("TagBan.BannedTagRole", roleId, interaction.user.tag);
        return interaction.reply({ content: `✅ Yasaklı tag taşıyanlara verilecek rol <@&${roleId}> olarak ayarlandı.`, ephemeral: true });
    }

    if (customId === "tagban_panel_channelselect") {
        const channelId = interaction.values[0];
        await ConfigManager.set("TagBan.LogChannel", channelId, interaction.user.tag);
        return interaction.reply({ content: `✅ Yasaklı tag işlemleri <#${channelId}> kanalına loglanacak.`, ephemeral: true });
    }

    if (customId === "tagban_panel_manage") {
        let bannedIDs = ConfigManager.get("TagBan.BannedGuildIDs") || [];
        let bannedNames = ConfigManager.get("TagBan.BannedGuildNames") || {};
        
        let modified = false;
        const cleanIDs = [];
        bannedIDs.forEach(id => {
            let cleanId = id.replace(/[`'\s]/g, "");
            if (cleanId !== id) modified = true;
            if (!cleanIDs.includes(cleanId)) cleanIDs.push(cleanId);
        });
        
        const cleanNames = {};
        for (const [key, value] of Object.entries(bannedNames)) {
            let cleanKey = key.replace(/[`'\s]/g, "");
            if (cleanKey !== key) modified = true;
            cleanNames[cleanKey] = value;
        }

        if (modified) {
            bannedIDs = cleanIDs;
            bannedNames = cleanNames;
            await ConfigManager.set("TagBan.BannedGuildIDs", cleanIDs, interaction.user.tag);
            await ConfigManager.set("TagBan.BannedGuildNames", cleanNames, interaction.user.tag);
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const nokta = emojis.toji_nokta || "•";
        const iptal = emojis.toji_iptal || "❌";
        
        let listText = "";
        if (bannedIDs.length === 0) {
            listText = `> ${iptal} **Yasaklı Sunucu Bulunmuyor**\n> -# Şu anda sisteme eklenmiş herhangi bir yasaklı sunucu (tag) bulunmuyor.`;
        } else {
            listText = `> ### ${emojis.toji_hubsparkles || "✨"} Yasaklı Sunucular Listesi\n`;
            bannedIDs.forEach(id => {
                const name = bannedNames[id] || "Bilinmeyen Sunucu";
                listText += `> ${nokta} **${name}** (\`${id}\`)\n`;
            });
            listText += `> \n> -# ${emojis.toji_hubsparkles || "✨"} **Yeni Sunucu Eklemek İçin:** Aşağıdaki butonları kullanarak işlem yapabilirsiniz.`;
        }

        const v2 = [{
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: interaction.guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png" }
                    },
                    components: [
                        { type: 10, content: `# ${nokta} TagBan Yönetimi` }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: listText },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, custom_id: "tagban_add_server", label: "Sunucu Ekle", style: 3 },
                        { type: 2, custom_id: "tagban_remove_server", label: "Sunucu Kaldır", style: 4, disabled: bannedIDs.length === 0 }
                    ]
                }
            ]
        }];

        return interaction.reply({ flags: [32768, 64], components: v2 });
    }

    if (customId === "tagban_add_server") {
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        const modal = new ModalBuilder()
            .setCustomId("tagban_add_modal")
            .setTitle("Yasaklı Sunucu Ekle");

        const idInput = new TextInputBuilder()
            .setCustomId("tagban_id_input")
            .setLabel("Sunucu ID'si veya Davet Linki")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const nameInput = new TextInputBuilder()
            .setCustomId("tagban_name_input")
            .setLabel("Sunucu Adı")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(idInput), new ActionRowBuilder().addComponents(nameInput));
        return interaction.showModal(modal);
    }

    if (customId === "tagban_remove_server") {
        const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
        const modal = new ModalBuilder()
            .setCustomId("tagban_remove_modal")
            .setTitle("Yasaklı Sunucu Kaldır");

        const idInput = new TextInputBuilder()
            .setCustomId("tagban_id_input")
            .setLabel("Kaldırılacak Sunucu ID'si")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(idInput));
        return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && customId === "tagban_add_modal") {
        await interaction.deferReply({ ephemeral: true });
        
        let guildId = interaction.fields.getTextInputValue("tagban_id_input").replace(/[`'\s]/g, "");
        let providedName = interaction.fields.getTextInputValue("tagban_name_input") || "";
        let guildName = providedName || "Bilinmeyen Sunucu";

        const inviteMatch = guildId.match(/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/i);
        if (inviteMatch && inviteMatch[1]) {
            try {
                const invite = await interaction.client.fetchInvite(inviteMatch[1]).catch(() => null);
                if (invite && invite.guild) {
                    guildId = invite.guild.id;
                    if (!providedName) guildName = invite.guild.name;
                } else {
                    return interaction.editReply({ content: "⚠️ Geçersiz davet linki." });
                }
            } catch (err) {
                return interaction.editReply({ content: "⚠️ Davet linki çözülemedi." });
            }
        } else if (!/^\d{17,19}$/.test(guildId)) {
            return interaction.editReply({ content: "⚠️ Lütfen geçerli bir davet linki veya sunucu ID'si giriniz." });
        }

        const bannedIDs = ConfigManager.get("TagBan.BannedGuildIDs") || [];
        if (bannedIDs.includes(guildId)) {
            return interaction.editReply({ content: "⚠️ Bu sunucu zaten yasaklı listesinde bulunuyor." });
        }

        bannedIDs.push(guildId);
        await ConfigManager.set("TagBan.BannedGuildIDs", bannedIDs, interaction.user.tag);

        const bannedNames = ConfigManager.get("TagBan.BannedGuildNames") || {};
        bannedNames[guildId] = guildName;
        await ConfigManager.set("TagBan.BannedGuildNames", bannedNames, interaction.user.tag);

        return interaction.editReply({ content: `✅ **${guildName}** (\`${guildId}\`) yasaklı sunucular listesine eklendi.` });
    }

    if (interaction.isModalSubmit() && customId === "tagban_remove_modal") {
        await interaction.deferReply({ ephemeral: true });
        
        const guildId = interaction.fields.getTextInputValue("tagban_id_input").replace(/[`'\s]/g, "");
        let bannedIDs = ConfigManager.get("TagBan.BannedGuildIDs") || [];
        
        if (!bannedIDs.includes(guildId)) {
            return interaction.editReply({ content: "⚠️ Bu ID'ye sahip bir sunucu yasaklı listesinde bulunamadı." });
        }

        bannedIDs = bannedIDs.filter(id => id !== guildId);
        await ConfigManager.set("TagBan.BannedGuildIDs", bannedIDs, interaction.user.tag);

        const bannedNames = ConfigManager.get("TagBan.BannedGuildNames") || {};
        const removedName = bannedNames[guildId] || "Bilinmeyen Sunucu";
        delete bannedNames[guildId];
        await ConfigManager.set("TagBan.BannedGuildNames", bannedNames, interaction.user.tag);

        return interaction.editReply({ content: `✅ **${removedName}** (\`${guildId}\`) yasaklı sunucular listesinden çıkarıldı.` });
    }
};
