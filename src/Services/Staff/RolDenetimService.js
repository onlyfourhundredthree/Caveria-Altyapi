const { PermissionsBitField, ComponentType, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class RolDenetimService {
    static async execute(context, targetRoleResolvable) {
        const isInteraction = !!context.user;
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;
        const guild = context.guild;

        const statsStaffs = ConfigManager.get("Roles.StatsStaffs") || [];
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !statsStaffs.some(r => member.roles.cache.has(r)) && !ConfigManager.isOwner(member)) {
            const errObj = { content: "Yetkiniz yetersiz.", ephemeral: true };
            if (isInteraction) return context.reply(errObj);
            return;
        }

        let role;
        if (typeof targetRoleResolvable === 'string') {
            role = guild.roles.cache.get(targetRoleResolvable);
        } else {
            role = targetRoleResolvable;
        }

        if (!role) {
            const err = "Bir rol belirtmelisiniz!";
            if (isInteraction) return context.reply({ content: err, ephemeral: true });
            return context.reply(err);
        }

        const members = role.members;
        if (members.size === 0) {
            const err = "Bu rolde hiç üye bulunmuyor.";
            if (isInteraction) return context.reply({ content: err, ephemeral: true });
            return context.reply(err);
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const { toji_user, toji_bluestar, toji_voice, toji_sign, toji_nokta, toji_sparkly } = emojis;
        const guildIcon = guild.iconURL({ dynamic: true, size: 512 });

        const totalMembers = members.size;
        const activeMembers = members.filter(m => m.presence && ["online", "dnd", "idle"].includes(m.presence.status)).size;
        const inVoice = members.filter(m => m.voice.channel).size;
        const notInVoice = totalMembers - inVoice;
        const activeNotInVoice = members.filter(m => m.presence && ["online", "dnd", "idle"].includes(m.presence.status) && !m.voice.channel).size;

        const mainContent = `> ## ${toji_sparkly || ""} ${role.name} Rol Denetimi\n` +
            `> ${toji_user || (toji_nokta || "•")} **Toplam Üye:** \`${totalMembers}\`\n` +
            `> ${toji_bluestar || (toji_nokta || "•")} **Aktif Üye:** \`${activeMembers}\`\n` +
            `> ${toji_voice || (toji_nokta || "•")} **Seste Olan:** \`${inVoice}\`\n` +
            `> ${toji_sign || (toji_nokta || "•")} **Seste Olmayan:** \`${notInVoice}\`\n` +
            `> ${toji_nokta || "•"} **Aktif & Seste Olmayan:** \`${activeNotInVoice}\``;

        const initialComponents = [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: guildIcon } },
                        components: [{ type: 10, content: mainContent }]
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "role_audit_select_prefix",
                                placeholder: "Listelemek istediğiniz grubu seçin",
                                options: [
                                    { label: "Tüm Üyeler", value: "total" },
                                    { label: "Aktif Üyeler", value: "active" },
                                    { label: "Seste Olanlar", value: "inVoice" },
                                    { label: "Seste Olmayanlar", value: "notInVoice" },
                                    { label: "Aktif & Seste Olmayanlar", value: "activeNotInVoice" }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        const sendObj = {
            flags: [MessageFlags.IsComponentsV2],
            components: initialComponents,
            fetchReply: true
        };
        
        let mainMsg;
        if (isInteraction) {
            mainMsg = await context.reply(sendObj);
            mainMsg = await context.fetchReply();
        } else {
            mainMsg = await context.reply(sendObj);
        }

        const collector = mainMsg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 120000
        });

        const splitMessage = (text, maxLength = 1900) => {
            const parts = [];
            while (text.length > 0) {
                if (text.length <= maxLength) { parts.push(text); break; }
                let sliceIndex = text.lastIndexOf("\n", maxLength);
                if (sliceIndex === -1) sliceIndex = maxLength;
                parts.push(text.slice(0, sliceIndex));
                text = text.slice(sliceIndex).trim();
            }
            return parts;
        };

        collector.on("collect", async (i) => {
            if (i.user.id !== author.id) {
                return i.reply({ content: "Bu işlemi sadece komutu kullanan kişi gerçekleştirebilir.", ephemeral: true });
            }

            await i.deferReply({ ephemeral: true });

            let list = "";
            let title = "";
            switch (i.values[0]) {
                case "total":
                    title = "Tüm Üyeler";
                    list = members.map(m => `${m} (\`${m.id}\`)`).join("\n");
                    break;
                case "active":
                    title = "Aktif Üyeler";
                    list = members.filter(m => m.presence && ["online", "dnd", "idle"].includes(m.presence.status)).map(m => `${m} (\`${m.id}\`)`).join("\n");
                    break;
                case "inVoice":
                    title = "Seste Olanlar";
                    list = members.filter(m => m.voice.channel).map(m => `${m} (\`${m.id}\`)`).join("\n");
                    break;
                case "notInVoice":
                    title = "Seste Olmayanlar";
                    list = members.filter(m => !m.voice.channel).map(m => `${m} (\`${m.id}\`)`).join("\n");
                    break;
                case "activeNotInVoice":
                    title = "Aktif & Seste Olmayanlar";
                    list = members.filter(m => m.presence && ["online", "dnd", "idle"].includes(m.presence.status) && !m.voice.channel).map(m => `${m} (\`${m.id}\`)`).join("\n");
                    break;
            }

            if (!list) list = "Üye bulunamadı.";

            const parts = splitMessage(list);
            for (let j = 0; j < parts.length; j++) {
                const resultsComponents = [{
                    type: 17,
                    components: [{
                        type: 10,
                        content: j === 0 ? `### ${toji_sparkly || ""} ${role.name} - ${title}\n${parts[j]}` : parts[j]
                    }]
                }];

                await i.followUp({
                    flags: [MessageFlags.IsComponentsV2],
                    components: resultsComponents,
                    ephemeral: true
                });
            }
        });

        collector.on("end", () => {
            mainMsg.edit({ components: [] }).catch(() => { });
        });
    }
}

module.exports = RolDenetimService;
