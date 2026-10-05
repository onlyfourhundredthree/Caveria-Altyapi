const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    if (interaction.isButton() && (interaction.customId.startsWith("claim_chat_") || interaction.customId.startsWith("claim_voice_"))) {
        const dropChannelId = ConfigManager.get("Channels.ClaimLog");
        
        if (dropChannelId && interaction.channelId !== dropChannelId) {
            return interaction.reply({ content: "❌ Bu işlem sadece <#" + dropChannelId + "> kanalında gerçekleştirilebilir.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        const parts = interaction.customId.split("_");
        const claimType = parts[1].toUpperCase(); // CHAT or VOICE
        const targetID = parts[2];

        if (!["VOICE", "CHAT"].includes(claimType)) return;

        const targetMember = interaction.guild.members.cache.get(targetID);
        if (!targetMember) {
            return interaction.reply({ content: "❌ Claimlemeye çalıştığınız üye sunucuda bulunamadı.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        const voiceRoles = ConfigManager.get("Roles.Responsibilities.Voice") || [];
        const voiceManagerRoles = ConfigManager.get("Roles.Responsibilities.VoiceManager") || [];
        const chatRoles = ConfigManager.get("Roles.Responsibilities.Chat") || [];
        const chatManagerRoles = ConfigManager.get("Roles.Responsibilities.ChatManager") || [];

        const hasVoiceRole = [].concat(voiceRoles, voiceManagerRoles).some(r => interaction.member.roles.cache.has(r));
        const hasChatRole = [].concat(chatRoles, chatManagerRoles).some(r => interaction.member.roles.cache.has(r));

        if (!hasVoiceRole && !hasChatRole) {
            return interaction.reply({ content: "❌ Bu işlemi gerçekleştirmek için **Chat Sorumlusu / Chat Lideri** veya **Ses Sorumlusu / Ses Lideri** rolüne sahip olmalısın.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        if (claimType === "VOICE" && !hasVoiceRole) {
            return interaction.reply({ content: "🔇 **Ses Claimi** alabilmek için **Ses Sorumlusu** veya **Ses Lideri** rolüne sahip olmalısın.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        if (claimType === "CHAT" && !hasChatRole) {
            return interaction.reply({ content: "💬 **Chat Claimi** alabilmek için **Chat Sorumlusu** veya **Chat Lideri** rolüne sahip olmalısın.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        try {
            const result = await InviteClaimManager.claimMember(interaction.guild, interaction.member, targetMember, claimType);

            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.reason}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }

            const typeLabel = claimType === "VOICE" ? "Ses" : "Chat";
            await interaction.reply({ content: `✅ ${targetMember} başarıyla **${typeLabel}** claimlendi! Üye aktiflik gösterdikçe hesabınıza anlık olarak XP eklenecektir.`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            
            // Edit the message buttons to disable the clicked one if possible
            try {
                const components = interaction.message.components;
                const newComponents = components.map(c => {
                    if (c.type === 17 && c.components) {
                        return {
                            ...c,
                            components: c.components.map(inner => {
                                if (inner.type === 1 && inner.components) {
                                    return {
                                        ...inner,
                                        components: inner.components.map(btn => {
                                            if (btn.custom_id === interaction.customId) {
                                                return { 
                                                    ...btn, 
                                                    disabled: true, 
                                                    label: `👤 ${interaction.user.username} Üstlendi`, 
                                                    style: 3 
                                                };
                                            }
                                            return btn;
                                        })
                                    };
                                }
                                return inner;
                            })
                        };
                    }
                    return c;
                });
                await interaction.message.edit({ components: newComponents }).catch(() => {});
            } catch (e) {}

        } catch (err) {
            console.error("Claim Interaction Error:", err);
            await interaction.reply({ content: "❌ Claim işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }

    if (interaction.isButton() && interaction.customId.startsWith("claim_release_")) {
        const claimId = interaction.customId.replace("claim_release_", "");

        try {
            const result = await InviteClaimManager.releaseClaim(claimId, interaction.member, "Kullanıcı tarafından bırakıldı");
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.reason}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
            await interaction.reply({ content: "✅ Claim başarıyla bırakıldı.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        } catch (err) {
            console.error("Claim Release Error:", err);
            await interaction.reply({ content: "❌ Claim bırakılırken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }

    if (interaction.isButton() && interaction.customId.startsWith("claim_transfer_")) {
        const claimId = interaction.customId.replace("claim_transfer_", "");

        const modal = new ModalBuilder()
            .setCustomId(`claim_transfer_modal_${claimId}`)
            .setTitle("Claim Devret");

        const userInput = new TextInputBuilder()
            .setCustomId("transfer_user_id")
            .setLabel("Devredeceğiniz yetkilinin ID'si")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Kullanıcı ID'sini girin")
            .setRequired(true)
            .setMaxLength(30);

        const reasonInput = new TextInputBuilder()
            .setCustomId("transfer_reason")
            .setLabel("Devretme Sebebi")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Sebep girin (opsiyonel)")
            .setRequired(false)
            .setMaxLength(100);

        modal.addComponents(
            new ActionRowBuilder().addComponents(userInput),
            new ActionRowBuilder().addComponents(reasonInput)
        );

        await interaction.showModal(modal).catch(() => {});
    }

    if (interaction.isButton() && interaction.customId.startsWith("claim_close_")) {
        const claimId = interaction.customId.replace("claim_close_", "");

        try {
            const result = await InviteClaimManager.closeClaim(claimId, interaction.member, "Kullanıcı tarafından kapatıldı");
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.reason}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
            await interaction.reply({ content: "✅ Claim başarıyla kapatıldı.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        } catch (err) {
            console.error("Claim Close Error:", err);
            await interaction.reply({ content: "❌ Claim kapatılırken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("claim_transfer_modal_")) {
        const claimId = interaction.customId.replace("claim_transfer_modal_", "");
        const newClaimerID = interaction.fields.getTextInputValue("transfer_user_id").trim();
        const reason = interaction.fields.getTextInputValue("transfer_reason")?.trim() || "Belirtilmedi";

        try {
            const result = await InviteClaimManager.transferClaim(claimId, interaction.member, newClaimerID);
            if (!result.success) {
                return interaction.reply({ content: `❌ ${result.reason}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
            }
            await interaction.reply({ content: `✅ Claim başarıyla <@${newClaimerID}> yetkilisine devredildi.\n> **Sebep:** ${reason}`, flags: [MessageFlags.Ephemeral] }).catch(() => {});
        } catch (err) {
            console.error("Claim Transfer Error:", err);
            await interaction.reply({ content: "❌ Claim devredilirken bir hata oluştu.", flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }
    }
};
