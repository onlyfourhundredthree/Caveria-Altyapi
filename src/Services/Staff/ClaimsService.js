const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const MemberClaim = require("../../Core/Database/MemberClaim");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const InviteClaimManager = require("../../Core/Handlers/InviteClaimManager");

class ClaimsService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const voiceRoles = ConfigManager.get("Roles.Responsibilities.Voice") || [];
        const voiceManagerRoles = ConfigManager.get("Roles.Responsibilities.VoiceManager") || [];
        const chatRoles = ConfigManager.get("Roles.Responsibilities.Chat") || [];
        const chatManagerRoles = ConfigManager.get("Roles.Responsibilities.ChatManager") || [];

        const hasVoiceRole = [].concat(voiceRoles, voiceManagerRoles).some(r => member.roles.cache.has(r));
        const hasChatRole = [].concat(chatRoles, chatManagerRoles).some(r => member.roles.cache.has(r));

        if (!hasVoiceRole && !hasChatRole) {
            const errObj = { content: "❌ Bu komutu kullanabilmek için **Ses Sorumlusu / Ses Lideri** veya **Chat Sorumlusu / Chat Lideri** rolüne sahip olmalısın." };
            if (isInteraction) return context.reply(errObj);
            return context.reply(errObj);
        }

        const query = {
            guildID: guild.id,
            claimerID: author.id,
            status: "ACTIVE"
        };

        if (hasVoiceRole && !hasChatRole) {
            query.$or = [{ claimType: "VOICE" }, { claimType: null }];
        } else if (!hasVoiceRole && hasChatRole) {
            query.$or = [{ claimType: "CHAT" }, { claimType: null }];
        }

        const activeClaims = await MemberClaim.find(query);

        if (activeClaims.length === 0) {
            const emptyObj = { content: "📭 Aktif claiminiz bulunmuyor." };
            if (isInteraction) return context.reply(emptyObj);
            return context.reply(emptyObj);
        }

        const settings = await InviteClaimManager.getSettings(guild.id);

        const buildClaimList = (claims, maxVoice, maxMessages) => {
            return claims.map((claim, index) => {
                const cMember = guild.members.cache.get(claim.claimedID);
                const mention = cMember ? cMember.toString() : `<@${claim.claimedID}>`;
                const progress = !claim.claimType
                    ? `Ses: \`${claim.voiceMinutes}/${maxVoice}\` dk | Mesaj: \`${claim.messageCount}/${maxMessages}\` adet`
                    : (claim.claimType === "VOICE"
                        ? `Ses: \`${claim.voiceMinutes}/${maxVoice}\` dk | XP: \`${claim.voiceMinutes * settings.xpPerMinute}\``
                        : `Mesaj: \`${claim.messageCount}/${maxMessages}\` adet | XP: \`${claim.messageCount * settings.xpPerMessage}\``);
                return `> **${index + 1}. Üye:** ${mention}\n> **İlerleme:** ${progress}\n> **Başlangıç:** <t:${Math.floor(claim.date.getTime() / 1000)}:R>`;
            }).join("\n> \n");
        };

        const voiceClaims = activeClaims.filter(c => !c.claimType || c.claimType === "VOICE");
        const chatClaims = activeClaims.filter(c => c.claimType === "CHAT");

        const panel = new V2PanelBuilder()
            .addAccessory(author.displayAvatarURL(), `> ## Aktif Claimleriniz\n> -# Aşağıda sorumluluğunuzda olan aktif claimleri görüyorsunuz.`)
            .addDivider(1);

        let addedVoice = false;
        if (voiceClaims.length > 0 && (hasVoiceRole || (!hasVoiceRole && !hasChatRole))) {
            panel.addText(`> ### 🔊 **Ses Claimleri** (${voiceClaims.length})\n${buildClaimList(voiceClaims, settings.maxVoiceLimit, settings.maxMessageLimit)}`);
            addedVoice = true;
        }

        if (chatClaims.length > 0 && (hasChatRole || (!hasVoiceRole && !hasChatRole))) {
            if (addedVoice) panel.addDivider(1);
            panel.addText(`> ### 💬 **Chat Claimleri** (${chatClaims.length})\n${buildClaimList(chatClaims, settings.maxVoiceLimit, settings.maxMessageLimit)}`);
        }

        const allClaims = [...voiceClaims, ...chatClaims];
        const maxButtons = Math.min(allClaims.length, 5);

        for (let i = 0; i < maxButtons; i++) {
            const claim = allClaims[i];
            const cMember = guild.members.cache.get(claim.claimedID);
            const label = cMember ? cMember.user.username.substring(0, 15) : "Üye";

            panel.addActionRow(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`claim_release_${claim._id}`).setLabel(`${label} - Bırak`).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`claim_transfer_${claim._id}`).setLabel(`${label} - Devret`).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`claim_close_${claim._id}`).setLabel(`${label} - Kapat`).setStyle(ButtonStyle.Secondary)
            ));
        }

        if (allClaims.length > 5) {
            panel.addText(`> -# *5'ten fazla aktif claiminiz olduğu için sadece ilk 5'i için işlem butonları gösterilmiştir. Diğer claimlerinizi yönetmek için bazılarını bırakın.*`);
        }

        const replyObj = { components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] };
        if (isInteraction) {
            return context.reply(replyObj);
        } else {
            return context.reply(replyObj);
        }
    }
}

module.exports = ClaimsService;
