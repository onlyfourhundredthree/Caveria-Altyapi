const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");
const { V2PanelBuilder } = require("../../Core/Builders/V2PanelBuilder");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const OneOnOneAssignment = require("../../Core/Database/OneOnOneAssignment");
const OneOnOneRecord = require("../../Core/Database/OneOnOneRecord");
const OneOnOneSettings = require("../../Core/Database/OneOnOneSettings");
const OneOnOneSession = require("../../Core/Database/OneOnOneSession");
const StaffPrivateNote = require("../../Core/Database/StaffPrivateNote");

function sanitizeChannelName(str) {
    if (!str) return "";
    const charMap = { 'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u' };
    return str.split('').map(c => charMap[c] || c).join('').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').toLowerCase();
}

const RANK_TEMPLATES = [
    `### 🐣 **{RANK_NAME}**\n\n> **"Yetki basamaklarındaki ilk adımın kutlu olsun. Unutma, en büyük binalar en sağlam temeller üzerine kurulur."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n> \n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`5 Saat\` | **Genel Saat:** \`10 Saat\` | **Mesaj:** \`150 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 1\`\n> *(Limiti aşarsan her ek vasıf çarpanından -0.2x kesinti yapılır.)*\n>\n> **🛡️ ROL TALİMATLARI**\n> * ✅ **YAP:** Üzerindeki **@🔨﹒Warn Yetkisi** ile kuralları ihlal edenleri önce uyar, sonra işlem yap.\n> * ❌ **YAPMA:** Warn yetkini "Bak yetkim var" diyerek ego tatmini için kullanma.\n> * 😉 **NOT:** Yetkili sohbetindeki ihbarların artık kanıtsız kabul ediliyor, bu güveni sarsma!`,
    `### 🎤 **{RANK_NAME}**\n\n> **"Tebrikler, artık ses odalarının huzuru senin dudaklarının arasında. Mikrofonuna sağlık!"**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`10 Saat\` | **Genel Saat:** \`20 Saat\` | **Mesaj:** \`250 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 1\`\n>\n> **🔊 ROL TALİMATLARI**\n> * ✅ **YAP:** **@Sesli Mute** yetkinle odalarda bas yapanları sustur. \`ceza-tablosu\` senin rehberindir.\n> * ❌ **YAPMA:** Kendi arkadaş grubuna tolerans gösterme, adalet herkes içindir.\n> * 😉 **NOT:** Sorumluluk rollerine (Gacha, Ses vb.) başvurarak çarpanını hemen yükseltebilirsin.`,
    `### ⌨️ **{RANK_NAME}**\n\n> **"Üst yetkili olmana ramak kaldı. Parmakların klavyede adalet dağıtmak için hazır mı?"**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`12 Saat\` | **Genel Saat:** \`25 Saat\` | **Mesaj:** \`300 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 1\`\n>\n> **💬 ROL TALİMATLARI**\n> * ✅ **YAP:** Artık **@Yazılı Mute** atabilirsin. Mesaj düzenleme yetkini reklam ve ağır küfürleri temizlemek için kullan.\n> * ❌ **YAPMA:** Birinin mesajını eğlence amaçlı değiştirme, ciddiyetini koru.`,
    `### 🔨 **{RANK_NAME}**\n\n> **"Üst Yetkili kadrosuna hoş geldin. Artık sadece bakmıyor, bizzat müdahale ediyorsun."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`20 Saat\` | **Genel Saat:** \`40 Saat\` | **Mesaj:** \`400 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 3\`\n>\n> **🚀 ROL TALİMATLARI**\n> * ✅ **YAP:** **@Taşıma Yetkisi** ile odaları düzene sok. Yanlış odadaki üyeleri nazikçe taşı.\n> * ❌ **YAPMA:** İnsanları troll amaçlı odadan odaya sektirme, bot loglarını kirletme.`,
    `### ⛓️ **{RANK_NAME}**\n\n> **"Yerin yedi kat altından gelen o yetki artık senin ellerinde. Gardiyanlık zor iştir."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`25 Saat\` | **Genel Saat:** \`45 Saat\` | **Mesaj:** \`450 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 3\`\n>\n> **⛓️ ROL TALİMATLARI**\n> * ✅ **YAP:** **@🔨﹒Jail Yetkisi** ile ağır ihlalleri Cezalıya yolla. Öncesinde yönetime bilgi ver.\n> * ❌ **YAPMA:** Jail yetkini ego savaşına dönüştürme, adalet için kullan.`,
    `### 🚫 **{RANK_NAME}**\n\n> **"Ban yetkisi... Caveria'nın en keskin kılıcı. Bu kılıcı taşımak her yiğidin harcı değildir."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`30 Saat\` | **Genel Saat:** \`50 Saat\` | **Mesaj:** \`500 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 3\`\n>\n> **💀 ROL TALİMATLARI**\n> * ✅ **YAP:** **@Ban Yetkisi** ile reklamcıları \`Underworld\`e yolla. Tam ekran SS almak zorunludur.\n> * ❌ **YAPMA:** Kanıtsız ban atma. Elinde kanıt yoksa yetkin ne olursa olsun haksızsın.`,
    `### 🧐 **{RANK_NAME}**\n\n> **"Tebrikler! Artık sunucuda kim ne yapmış daha detaylı görebilecek yaştasın."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`35 Saat\` | **Genel Saat:** \`60 Saat\` | **Mesaj:** \`600 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 4\`\n>\n> **🔎 ROL TALİMATLARI**\n> * ✅ **YAP:** **Denetim Kaydı** erişiminle sunucu işleyişini takip et. Hatalı işlemleri bildir.\n> * ❌ **YAPMA:** Gördüğün özel logları arkadaş ortamlarında "dedikodu" malzemesi yapma.`,
    `### 👑 **{RANK_NAME}**\n\n> **"Yönetim öncesi son adıma geldin. Üslubun ve duruşun artık daha da gözler önünde."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`35 Saat\` | **Genel Saat:** \`65 Saat\` | **Mesaj:** \`650 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 4\`\n>\n> **🛡️ ROL TALİMATLARI**\n> * ✅ **YAP:** **@Taşıma Yetkisi (RC)** ile odaların huzurunu koru. Cezalı sürelerini kontrol et.\n> * ❌ **YAPMA:** Otoriteni sesini yükselterek değil, adaletinle sağla.`,
    `### 🔥 **{RANK_NAME}**\n\n> **"Çıkması zor ve çok az kişinin başardığı o kapıdan içeri girdin. Tebrikler Raigen!"**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`40 Saat\` | **Genel Saat:** \`70 Saat\` | **Mesaj:** \`700 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 4\`\n>\n> **🌙 ROL TALİMATLARI**\n> * ✅ **YAP:** Yetkili alımı yapabilir, cezalıları açabilirsin. Liderliklere başvurarak ekibini yönetmeye başla.\n> * ❌ **YAPMA:** Karar verirken aceleci davranma, bir aday olarak her adımın yönetim tarafından izleniyor.\n> * 😉 **NOT:** Gacha, Chat, Partner gibi liderliklerde kendini kanıtlamanın tam vakti!`,
    `### 👑 **{RANK_NAME}**\n\n> **"Artık bir yönetim gölgesisin. Bu rolde sana en az yöneticiler kadar saygı duyulmalı."**\n>\n> 📋 **HAFTALIK ZORUNLU HEDEFLER**\n> ⤷ **Tamamlanması Gereken:** \`{XP} XP\`\n>\n> ⏳ **AKTİFLİK HEDEFİ**\n> ⤷ **Public Ses:** \`40 Saat\` | **Genel Saat:** \`75 Saat\` | **Mesaj:** \`750 Adet\`\n>\n> ⚡ **VASIF & ÇARPAN SİSTEMİ**\n> ⤷ **Sorumluluk:** \`%5 İndirim\` | \`1.1x XP\`\n> ⤷ **Denetleyicilik:** \`%10 İndirim\` | \`1.2x XP\`\n> ⤷ **Liderlik:** \`%20 İndirim\` | \`1.3x XP\`\n> ⚠️ **LİMİT:** \`Bu rolün sorumluluk limiti = 4\`\n>\n> **🔱 ROL TALİMATLARI**\n> * ✅ **YAP:** Sunucu içerisindeki neredeyse tüm konularla ilgilenme yetkisine sahipsin. Rol yönet yetkini dikkatli kullan.\n> * ❌ **YAPMA:** Üst yönetim kanallarını görebiliyor olman seni "dokunulmaz" yapmaz, sorumluluğun artık daha ağır.\n> * 😉 **NOT:** Bu aşamadan sonra tek bir adımın kaldı: Gerçek Yönetim. Başarılar dileriz.`
];

class OneOnOneService {
    static getCurrentWeekKey() {
        return moment().tz("Europe/Istanbul").format("YYYY-[W]WW");
    }

    static async syncSecondaryServerManager(guild, managerID) {
        try {
            const { secondaryClient, SECONDARY_GUILD_ID } = require("../../Core/Clients/SecondaryClient");
            const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
            if (!secondaryClient.isReady()) return;

            const secGuild = secondaryClient.guilds.cache.get(SECONDARY_GUILD_ID);
            if (!secGuild) return;

            const assignment = await OneOnOneAssignment.findOne({ guildID: guild.id, managerID });
            const teamMemberIDs = assignment ? assignment.assignedMemberIDs : [];

            const managerMember = await guild.members.fetch(managerID).catch(() => null);
            const managerName = managerMember ? managerMember.user.username : managerID;
            const categoryName = `Yönetici: ${managerName}`;

            // Find or create category
            let category = secGuild.channels.cache.find(c => c.type === 4 && c.name === categoryName);
            if (!category) {
                category = await secGuild.channels.create({
                    name: categoryName,
                    type: 4 // ChannelType.GuildCategory
                });
            }

            const allRanks = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
            if (!allRanks.length) return;

            // Fetch all staff members and their ranks
            const staffList = [];
            for (const mID of teamMemberIDs) {
                const staffMember = await guild.members.fetch(mID).catch(() => null);
                if (!staffMember) continue;
                
                let rankIndex = -1;
                for (let i = allRanks.length - 1; i >= 0; i--) {
                    if (staffMember.roles.cache.has(allRanks[i].roleID)) {
                        rankIndex = i;
                        break;
                    }
                }

                if (rankIndex >= 1 && rankIndex <= 10) {
                    staffList.push({ staffMember, rankIndex, rankData: allRanks[rankIndex] });
                }
            }

            const layoutList = [];
            
            // Generate channels for ALL 10 ranks (indices 1 to 10)
            const maxRankIndex = Math.min(10, allRanks.length - 1);
            for (let rankIndex = 1; rankIndex <= maxRankIndex; rankIndex++) {
                const rankData = allRanks[rankIndex];
                if (!rankData) continue;

                const rankChannelName = sanitizeChannelName(rankData.rankName) || `${rankIndex}-yetki`;

                // Add Rank Channel
                layoutList.push({
                    name: rankChannelName,
                    type: "rank",
                    rankData: rankData,
                    rankIndex: rankIndex
                });

                // Add Member Channels if present
                const rankMembers = membersByRank.get(rankIndex) || [];
                for (const memberData of rankMembers) {
                    const safeMemberName = sanitizeChannelName(memberData.staffMember.user.username);
                    layoutList.push({
                        name: safeMemberName,
                        type: "member",
                        rankData: rankData,
                        rankIndex: rankIndex,
                        memberID: memberData.staffMember.id
                    });
                }
            }

            // Add Not Defteri Channel at the end
            layoutList.push({
                name: "not-defteri",
                type: "notebook"
            });

            const expectedChannelIDs = new Set();
            let currentPosition = 0;

            for (const layoutItem of layoutList) {
                let textChannel = null;
                if (layoutItem.type === "member") {
                    // Search for member's channel across secondary guild to preserve channel and history during transfer!
                    textChannel = secGuild.channels.cache.find(c => c.type === 0 && c.name === layoutItem.name);
                    if (textChannel && textChannel.parentId !== category.id) {
                        await textChannel.setParent(category.id).catch(() => {});
                    }
                } else {
                    textChannel = secGuild.channels.cache.find(c => c.parentId === category.id && c.name === layoutItem.name);
                }
                
                if (!textChannel) {
                    textChannel = await secGuild.channels.create({
                        name: layoutItem.name,
                        type: 0, // ChannelType.GuildText
                        parent: category.id,
                        position: currentPosition
                    });
                } else {
                    if (textChannel.position !== currentPosition) {
                        await textChannel.setPosition(currentPosition).catch(() => {});
                    }
                }
                currentPosition++;
                expectedChannelIDs.add(textChannel.id);

                if (layoutItem.type !== "notebook") {
                    const messages = await textChannel.messages.fetch({ limit: 5 });
                    const botMessages = messages.filter(m => m.author.id === secondaryClient.user.id);
                    
                    if (botMessages.size === 0) {
                        // Use rankIndex - 1 because rankIndex goes from 1 to 10
                        let messageContent = RANK_TEMPLATES[layoutItem.rankIndex - 1] || RANK_TEMPLATES[0];
                        messageContent = messageContent
                            .replace(/{RANK_NAME}/g, layoutItem.rankData.rankName)
                            .replace(/{XP}/g, layoutItem.rankData.requiredXP || 1200);

                        await textChannel.send({ content: messageContent });
                    }
                }
            }

            // Cleanup channels that are no longer needed
            const allCategoryChannels = secGuild.channels.cache.filter(c => c.parentId === category.id);
            for (const [, channel] of allCategoryChannels) {
                if (!expectedChannelIDs.has(channel.id)) {
                    await channel.delete().catch(() => {});
                }
            }

        } catch (err) {
            console.error("[OneOnOneService] syncSecondaryServerManager Hata:", err);
        }
    }

    static async getSettings(guildID) {
        let settings = await OneOnOneSettings.findOne({ guildID });
        if (!settings) {
            const defaultRole = ConfigManager.get("Roles.OneOnOneManager") || ConfigManager.get("Roles.Responsibilities.EventManage") || "";
            settings = new OneOnOneSettings({
                guildID,
                managerRoleId: defaultRole,
                managerRoleIds: defaultRole ? [defaultRole] : [],
                maxQuotaPerManager: 5,
                reportChannelId: ConfigManager.get("Channels.EventLog") || "",
                enabled: true
            });
            await settings.save().catch(() => {});
        }
        return settings;
    }

    static async hasPermission(member, permissionType = "manager") {
        if (!member || !member.guild) return false;
        const isOwner = ConfigManager.isOwner(member);
        const isAdmin = member.permissions ? member.permissions.has("Administrator") : false;

        if (isOwner || isAdmin) return true;

        const settings = await this.getSettings(member.guild.id);
        const managerRoleIds = (settings.managerRoleIds && settings.managerRoleIds.length > 0)
            ? settings.managerRoleIds
            : (settings.managerRoleId ? [settings.managerRoleId] : []);

        const hasManagerRole = managerRoleIds.some(rId => member.roles.cache.has(rId));

        if (permissionType === "admin") {
            return isOwner || isAdmin;
        }
        return hasManagerRole;
    }

    static async renderMainDashboard(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        if (!guild || !member) return;

        const isAdmin = await this.hasPermission(member, "admin");
        const isManager = await this.hasPermission(member, "manager");

        if (isAdmin) {
            return this.renderAdminPanel(interactionOrMessage);
        } else if (isManager) {
            return this.renderManagerPanel(interactionOrMessage);
        } else {
            const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
            const allRanks = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
            let isStaff = false;
            for (let i = allRanks.length - 1; i >= 0; i--) {
                if (member.roles.cache.has(allRanks[i].roleID)) {
                    // Check if between 2nd and 11th rank
                    if (i >= 1 && i <= 10) {
                        isStaff = true;
                    }
                    break;
                }
            }

            if (isStaff) {
                return this.renderStaffDashboard(interactionOrMessage);
            } else {
                const errorMsg = "❌ Bu komutu sadece 1E1 Yöneticileri, Üst Yönetim veya Yetkili ekibi kullanabilir.";
                if (interactionOrMessage.author) {
                    return interactionOrMessage.reply({ content: errorMsg }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
                } else {
                    return interactionOrMessage.reply({ content: errorMsg, flags: [MessageFlags.Ephemeral] });
                }
            }
        }
    }

    static async renderStaffDashboard(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const uid = member.id;
        const weekKey = this.getCurrentWeekKey();

        const assignment = await OneOnOneAssignment.findOne({ guildID: guild.id, assignedMemberIDs: uid });
        const managerID = assignment ? assignment.managerID : null;

        const allRecords = await OneOnOneRecord.find({ guildID: guild.id, memberID: uid }).sort({ completedAt: -1 });
        const thisWeekRecord = allRecords.find(r => r.weekKey === weekKey);

        let avgScore = "0.0";
        if (allRecords.length > 0) {
            const sum = allRecords.reduce((acc, r) => acc + (r.performanceScore || 5), 0);
            avgScore = (sum / allRecords.length).toFixed(1);
        }

        const scoreStars = "⭐".repeat(Math.round(parseFloat(avgScore)));

        const panel = new V2PanelBuilder();
        panel.addAccessory(
            member.user.displayAvatarURL({ dynamic: true }),
            `> ## 👤 1E1 Yetkili Paneli\n> -# Hafta: \`${weekKey}\` | Yetkili: <@${uid}>`
        );
        panel.addDivider(1);

        const managerText = managerID ? `<@${managerID}>` : "*Atanmadı*";
        panel.addText(`### 📋 Ekip Bilgisi\n> - **Bağlı Olduğunuz Yönetici:** ${managerText}`);
        
        panel.addDivider(1);

        const settings = await this.getSettings(guild.id);
        const rewardXP = settings.rewardXP || 250;

        const thisWeekStatus = thisWeekRecord ? `✅ Tamamlandı (${thisWeekRecord.generalStatus}) — +${rewardXP} XP Kazandınız!` : `⏳ Bekliyor — Tamamlandığında +${rewardXP} XP`;
        panel.addText(`### 📊 Performans & Görev Özeti\n> - **Bu Haftalık 1E1 Görevi:** \`${thisWeekStatus}\`\n> - **Genel Puan Ortalaması:** \`${avgScore} / 5.0\` ${scoreStars}\n> - **Toplam Görüşme Sayısı:** \`${allRecords.length}\` adet`);

        const v2Components = panel.toJSON();
        const isMsg = !!interactionOrMessage.author;

        if (isMsg) {
            return interactionOrMessage.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
        } else {
            if (interactionOrMessage.replied || interactionOrMessage.deferred) {
                return interactionOrMessage.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } else {
                return interactionOrMessage.update({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {
                    return interactionOrMessage.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                });
            }
        }
    }

    static async renderQueryPanel(interactionOrMessage, targetMember) {
        const guild = interactionOrMessage.guild;
        const targetID = targetMember.id;
        const isMsg = !!interactionOrMessage.author;

        const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
        const allRanks = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
        
        let targetRankIndex = -1;
        for (let i = allRanks.length - 1; i >= 0; i--) {
            if (targetMember.roles.cache.has(allRanks[i].roleID)) {
                targetRankIndex = i;
                break;
            }
        }

        const isManager = targetRankIndex >= 11 || targetMember.permissions.has("Administrator");
        
        const panel = new V2PanelBuilder();
        panel.addAccessory(
            targetMember.user.displayAvatarURL({ dynamic: true }),
            `> ## 🔍 1E1 Sorgulama Paneli\n> -# Sorgulanan: **${targetMember.displayName}** (<@${targetID}>)`
        );
        panel.addDivider(1);

        if (isManager) {
            const assignment = await OneOnOneAssignment.findOne({ guildID: guild.id, managerID: targetID });
            const teamSize = assignment ? assignment.assignedMemberIDs.length : 0;
            
            panel.addText(`### 👑 Yönetici Bilgileri\n> - **Ekibindeki Yetkili Sayısı:** \`${teamSize}\` kişi`);
        } else {
            const assignment = await OneOnOneAssignment.findOne({ guildID: guild.id, assignedMemberIDs: targetID });
            const managerID = assignment ? assignment.managerID : null;
            const managerText = managerID ? `<@${managerID}>` : "*Atanmadı*";

            const allRecords = await OneOnOneRecord.find({ guildID: guild.id, memberID: targetID });
            let avgScore = "0.0";
            if (allRecords.length > 0) {
                const sum = allRecords.reduce((acc, r) => acc + (r.performanceScore || 5), 0);
                avgScore = (sum / allRecords.length).toFixed(1);
            }
            const scoreStars = "⭐".repeat(Math.round(parseFloat(avgScore)));

            panel.addText(`### 👤 Yetkili Bilgileri\n> - **Bağlı Olduğu Yönetici:** ${managerText}\n> - **Genel Puan Ortalaması:** \`${avgScore} / 5.0\` ${scoreStars}\n> - **Toplam Görüşme Sayısı:** \`${allRecords.length}\` adet`);
        }

        const v2Components = panel.toJSON();

        if (isMsg) {
            return interactionOrMessage.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
        } else {
            if (interactionOrMessage.replied || interactionOrMessage.deferred) {
                return interactionOrMessage.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } else {
                return interactionOrMessage.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            }
        }
    }

    static async renderManagerPanel(interactionOrMessage, options = {}) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const uid = member.id;
        const weekKey = this.getCurrentWeekKey();
        const settings = await this.getSettings(guild.id);

        const assignment = await OneOnOneAssignment.findOne({ guildID: guild.id, managerID: uid });
        const teamMemberIDs = assignment ? assignment.assignedMemberIDs : [];

        const records = await OneOnOneRecord.find({
            guildID: guild.id,
            weekKey: weekKey,
            managerID: uid
        });

        const completedMap = new Map();
        records.forEach(r => completedMap.set(r.memberID, r));

        const openFollowUps = await OneOnOneRecord.find({
            guildID: guild.id,
            managerID: uid,
            "followUp.required": true,
            "followUp.status": { $in: ["Açık", "Devam Ediyor"] }
        });

        // Canlı Oturum Kontrolü
        const activeSession = await OneOnOneSession.findOne({ guildID: guild.id, managerID: uid });

        const panel = new V2PanelBuilder();
        const emojis = ConfigManager.get("Emojis") || {};

        panel.addText(`> ## 📋 1E1 Yönetici Takip Paneli\n> -# Hafta: \`${weekKey}\` | Sorumlu Yetkili Sayısı: **${teamMemberIDs.length} / ${settings.maxQuotaPerManager}**`);
        panel.addDivider(1);

        if (activeSession) {
            const elapsedMins = Math.max(1, Math.round((Date.now() - activeSession.startTime.getTime()) / 60000));
            panel.addText(`### 🎙️ Canlı 1E1 Görüşmesi Devam Ediyor\n> - **Yetkili:** <@${activeSession.memberID}>\n> - **Kanal:** <#${activeSession.channelID}>\n> - **Süre:** \`${elapsedMins}\` dakikadır sürdürülüyor\n\n*Görüşmeyi tamamladığınızda aşağıdaki 'Görüşmeyi Bitir & Rapor Gir' butonuna basarak raporu oluşturabilirsiniz.*`);
            panel.addDivider(1);
        }

        let teamStatusText = "";
        if (teamMemberIDs.length === 0) {
            teamStatusText = "*⚠️ Henüz tarafınıza atanmış bir yetkili bulunmuyor. Ekip ataması için üst yönetim ile iletişime geçebilirsiniz.*";
        } else {
            const lines = [];
            for (const mID of teamMemberIDs) {
                const rec = completedMap.get(mID);
                const isDone = !!rec;
                const icon = isDone ? (emojis.toji_onay || "✅") : (emojis.maravilha_bekleme || "⏳");
                const voiceStr = (isDone && rec.voiceDurationMinutes > 0) ? ` \`(${rec.voiceDurationMinutes} dk sesli)\`` : "";
                const stars = (isDone && rec.performanceScore) ? ` ${"⭐".repeat(rec.performanceScore)}` : "";
                const statusStr = isDone ? `\`(${rec.generalStatus})\`${stars}${voiceStr}` : "`Bekliyor`";
                lines.push(`> ${icon} <@${mID}> — ${statusStr}`);
            }
            teamStatusText = lines.join("\n");
        }

        const completedCount = teamMemberIDs.filter(mID => completedMap.has(mID)).length;
        const totalCount = teamMemberIDs.length;

        panel.addText(`### 📊 Bu Haftaki Görüşme Durumu (\`${completedCount} / ${totalCount}\` Tamamlandı)\n${teamStatusText}`);
        panel.addDivider(1);

        const btnRow = new ActionRowBuilder();

        if (activeSession) {
            btnRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`1e1_btn_session_finish_${uid}`)
                    .setLabel("Görüşmeyi Bitir & Rapor Gir")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("⏹️")
            );
        } else if (teamMemberIDs.length > 0) {
            btnRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`1e1_btn_session_start_${uid}`)
                    .setLabel("Canlı Sesli 1E1 Başlat")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("🎙️"),
                new ButtonBuilder()
                    .setCustomId(`1e1_btn_record_modal_open_${uid}`)
                    .setLabel("Manuel Rapor Gir")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📝")
            );
        }

        btnRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`1e1_btn_staff_notes_${uid}`)
                .setLabel("Yetkili Notları & Karnesi")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("📓"),
            new ButtonBuilder()
                .setCustomId(`1e1_btn_manager_history_${uid}`)
                .setLabel("Geçmiş Raporlar")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("📚")
        );

        if (await this.hasPermission(member, "admin")) {
            btnRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`1e1_btn_switch_admin_${uid}`)
                    .setLabel("Yönetim Paneli")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("👑")
            );
        }

        panel.addActionRow(btnRow);

        const v2Components = panel.toJSON();
        const isMsg = !!interactionOrMessage.author;

        if (isMsg) {
            return interactionOrMessage.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
        } else {
            if (interactionOrMessage.replied || interactionOrMessage.deferred) {
                return interactionOrMessage.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } else {
                return interactionOrMessage.update({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {
                    return interactionOrMessage.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                });
            }
        }
    }

    static async renderAdminPanel(interactionOrMessage, options = {}) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;
        const uid = member.id;
        const weekKey = this.getCurrentWeekKey();
        const settings = await this.getSettings(guild.id);

        const allAssignments = await OneOnOneAssignment.find({ guildID: guild.id });
        const totalManagers = allAssignments.length;

        let totalStaff = 0;
        allAssignments.forEach(a => totalStaff += a.assignedMemberIDs.length);

        const currentWeekRecords = await OneOnOneRecord.find({
            guildID: guild.id,
            weekKey: weekKey
        });

        const completedCount = currentWeekRecords.length;
        const completionRate = totalStaff > 0 ? Math.round((completedCount / totalStaff) * 100) : 0;

        const openFollowUpsCount = await OneOnOneRecord.countDocuments({
            guildID: guild.id,
            "followUp.required": true,
            "followUp.status": { $in: ["Açık", "Devam Ediyor"] }
        });

        const activeSessionsCount = await OneOnOneSession.countDocuments({ guildID: guild.id });

        const panel = new V2PanelBuilder();
        const emojis = ConfigManager.get("Emojis") || {};

        const roleIds = (settings.managerRoleIds && settings.managerRoleIds.length > 0)
            ? settings.managerRoleIds
            : (settings.managerRoleId ? [settings.managerRoleId] : []);

        const managerRoleStr = roleIds.length > 0
            ? roleIds.map(rId => `<@&${rId}>`).join(", ")
            : "*Belirlenmedi*";

        panel.addText(`> ## 👑 1E1 Yönetim Genel Paneli\n> -# Hafta: \`${weekKey}\` | 1E1 Yöneticileri Rolleri: ${managerRoleStr}`);
        panel.addDivider(1);

        panel.addText(`### 📈 Haftalık Genel İlerleme (%${completionRate})\n> - **Tamamlanan Görüşmeler:** \`${completedCount} / ${totalStaff}\`\n> - **Şu An Canlı Görüşmede Olan:** \`${activeSessionsCount}\` yönetici\n> - **Maksimum Kota / Yönetici:** \`${settings.maxQuotaPerManager}\` yetkili`);

        panel.addDivider(1);

        const managerOverviewLines = [];
        if (allAssignments.length === 0) {
            managerOverviewLines.push("*Henüz ekibi olan yönetici bulunmuyor. Aşağıdaki 'Yetkili Ata (Modal)' butonu ile ekip kurabilirsiniz.*");
        } else {
            for (const assign of allAssignments) {
                const mRecords = currentWeekRecords.filter(r => r.managerID === assign.managerID);
                const mTotal = assign.assignedMemberIDs.length;
                const mDone = mRecords.length;
                const icon = mDone === mTotal && mTotal > 0 ? (emojis.toji_onay || "✅") : (emojis.maravilha_bekleme || "⏳");
                
                const membersStr = assign.assignedMemberIDs.length > 0
                    ? assign.assignedMemberIDs.map(mID => `<@${mID}>`).join(", ")
                    : "*Henüz yetkili atanmadı*";

                managerOverviewLines.push(`> ${icon} <@${assign.managerID}> (\`${mDone}/${mTotal}\` tamamlandı):\n> ⤷ **Ekip:** ${membersStr}`);
            }
        }
        panel.addText(`### 👥 Yönetici Ekip Durumları & Üye Listeleri\n${managerOverviewLines.join("\n")}`);

        panel.addDivider(1);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`1e1_btn_admin_assign_modal_${uid}`)
                .setLabel("Yetkili Ata (Modal)")
                .setStyle(ButtonStyle.Success)
                .setEmoji("➕"),
            new ButtonBuilder()
                .setCustomId(`1e1_btn_admin_transfer_modal_${uid}`)
                .setLabel("Yetkili Taşı")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔄"),
            new ButtonBuilder()
                .setCustomId(`1e1_btn_admin_manager_analysis_${uid}`)
                .setLabel("Yönetici Analizleri")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("📊"),
            new ButtonBuilder()
                .setCustomId(`1e1_btn_admin_settings_modal_${uid}`)
                .setLabel("Sistem Ayarları")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("⚙️"),
            new ButtonBuilder()
                .setCustomId(`1e1_btn_switch_manager_${uid}`)
                .setLabel("Yönetici Panelim")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("📋")
        );

        panel.addActionRow(row1);

        const v2Components = panel.toJSON();
        const isMsg = !!interactionOrMessage.author;

        if (isMsg) {
            return interactionOrMessage.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
        } else {
            if (interactionOrMessage.replied || interactionOrMessage.deferred) {
                return interactionOrMessage.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } else {
                return interactionOrMessage.update({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {
                    return interactionOrMessage.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                });
            }
        }
    }

    static async renderManagerAnalysisPanel(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const weekKey = this.getCurrentWeekKey();
        const assignments = await OneOnOneAssignment.find({ guildID: guild.id });
        const allRecords = await OneOnOneRecord.find({ guildID: guild.id });

        const panel = new V2PanelBuilder();
        panel.addText(`> ## 📊 1E1 Yönetici Performans & Aktiflik Analizi\n> -# Hafta: \`${weekKey}\` | Toplam Yönetici Sayısı: **${assignments.length}**`);
        panel.addDivider(1);

        if (assignments.length === 0) {
            panel.addText("*Henüz ekibi olan yönetici bulunmuyor.*");
        } else {
            const lines = [];
            for (const assign of assignments) {
                const managerMember = await guild.members.fetch(assign.managerID).catch(() => null);
                const managerName = managerMember ? managerMember.displayName : `ID: ${assign.managerID}`;
                
                const managerRecords = allRecords.filter(r => r.managerID === assign.managerID);
                const thisWeekRecords = managerRecords.filter(r => r.weekKey === weekKey);

                const teamSize = assign.assignedMemberIDs.length;
                const completedThisWeek = thisWeekRecords.length;
                const totalCompletedAllTime = managerRecords.length;

                let avgScore = "0.0";
                if (managerRecords.length > 0) {
                    const sum = managerRecords.reduce((acc, r) => acc + (r.performanceScore || 5), 0);
                    avgScore = (sum / managerRecords.length).toFixed(1);
                }

                const rate = teamSize > 0 ? Math.round((completedThisWeek / teamSize) * 100) : 0;
                const statusBadge = rate === 100 ? "🟢 %100" : (rate > 0 ? `🟡 %${rate}` : "🔴 %0");

                lines.push(`> **${managerName}** (<@${assign.managerID}>)\n> - **Ekip Sayısı:** \`${teamSize}\` yetkili | **Bu Haftaki İlerleme:** \`${completedThisWeek}/${teamSize}\` (${statusBadge})\n> - **Toplam Tamamlanan 1E1:** \`${totalCompletedAllTime}\` adet | **Verdiği Ort. Puan:** \`${avgScore} ⭐\``);
            }
            panel.addText(lines.join("\n\n"));
        }

        panel.addDivider(1);

        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`1e1_btn_switch_admin_${interactionOrMessage.member.id}`)
                .setLabel("Geri Dön")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("⬅️")
        );

        panel.addActionRow(btnRow);

        const v2Components = panel.toJSON();
        const isMsg = !!interactionOrMessage.author;

        if (isMsg) {
            return interactionOrMessage.channel.send({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
        } else {
            if (interactionOrMessage.replied || interactionOrMessage.deferred) {
                return interactionOrMessage.editReply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            } else {
                return interactionOrMessage.update({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {
                    return interactionOrMessage.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                });
            }
        }
    }

    static async renderStaffCard(interaction, memberID) {
        const guild = interaction.guild;
        const allRecords = await OneOnOneRecord.find({ guildID: guild.id, memberID: memberID }).sort({ completedAt: -1 });
        const privateNotes = await StaffPrivateNote.find({ guildID: guild.id, memberID: memberID }).sort({ createdAt: -1 });

        const member = await guild.members.fetch(memberID).catch(() => null);
        const name = member ? member.displayName : `ID: ${memberID}`;
        const avatar = member ? member.user.displayAvatarURL({ dynamic: true }) : guild.iconURL();

        let avgScore = "0.0";
        if (allRecords.length > 0) {
            const sum = allRecords.reduce((acc, r) => acc + (r.performanceScore || 5), 0);
            avgScore = (sum / allRecords.length).toFixed(1);
        }

        const scoreStars = "⭐".repeat(Math.round(parseFloat(avgScore)));

        const panel = new V2PanelBuilder();
        panel.addAccessory(
            avatar,
            `> ## 📓 Yetkili Performans Karnesi & Özel Defter\n> -# Yetkili: **${name}** (<@${memberID}>)`
        );
        panel.addDivider(1);

        panel.addText(`### 📊 Performans Değerlendirme Karnesi\n> - **Puan Ortalaması:** \`${avgScore} / 5.0\` ${scoreStars}\n> - **Toplam Görüşme Sayısı:** \`${allRecords.length}\` adet 1E1`);

        if (privateNotes.length > 0) {
            panel.addDivider(1);
            const noteLines = privateNotes.map(n => `> 🔒 **[${moment(n.createdAt).format("DD.MM.YYYY")}]** <@${n.authorID}>: ${n.note}`);
            panel.addText(`### 🔒 Yöneticiye Özel Gizli Notlar (${privateNotes.length})\n${noteLines.join("\n")}`);
        } else {
            panel.addDivider(1);
            panel.addText(`### 🔒 Yöneticiye Özel Gizli Notlar\n*Henüz bu yetkili hakkında alınmış gizli bir yönetici notu bulunmuyor.*`);
        }

        panel.addDivider(1);

        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`1e1_btn_add_private_note_modal_${memberID}`)
                .setLabel("Gizli Not Ekle (Modal)")
                .setStyle(ButtonStyle.Success)
                .setEmoji("📝"),
            new ButtonBuilder()
                .setCustomId(`1e1_btn_switch_manager_${interaction.user.id}`)
                .setLabel("Geri Dön")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("⬅️")
        );

        panel.addActionRow(btnRow);

        return interaction.editReply({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] });
    }

    static async logRecordToChannel(guild, record) {
        try {
            const settings = await this.getSettings(guild.id);
            const channelID = settings.reportChannelId || ConfigManager.get("Channels.EventLog");
            if (!channelID) return;

            const channel = guild.channels.cache.get(channelID);
            if (!channel || !channel.isTextBased()) return;

            const managerMember = await guild.members.fetch(record.managerID).catch(() => null);
            const managerAvatar = managerMember ? managerMember.user.displayAvatarURL({ dynamic: true }) : guild.iconURL();

            const statusEmojiMap = {
                "Çok İyi": "🌟",
                "İyi": "✅",
                "Normal": "🔹",
                "Sorunlu": "⚠️",
                "Kritik": "🚨"
            };
            const statusIcon = statusEmojiMap[record.generalStatus] || "🔹";
            const starsStr = "⭐".repeat(record.performanceScore || 5);

            const voiceVerificationStr = record.voiceVerified
                ? `🎙️ **Ses Kanalı Görüşme Süresi:** \`${record.voiceDurationMinutes} Dakika\` (Doğrulandı)`
                : (record.voiceDurationMinutes > 0 ? `⏱️ **Görüşme Süresi:** \`${record.voiceDurationMinutes} Dakika\`` : "");

            const panel = new V2PanelBuilder();
            panel.addAccessory(
                managerAvatar,
                `> ## 📝 Yeni 1E1 Görüşme Raporu\n> -# Hafta: \`${record.weekKey}\` | Sorumlu Yönetici: <@${record.managerID}>`
            );
            panel.addDivider(1);

            panel.addText(`**Yetkili:** <@${record.memberID}>\n**Genel Durum:** ${statusIcon} **${record.generalStatus}**\n**Performans Puanı:** ${starsStr} \`(${record.performanceScore || 5} / 5)\`\n${voiceVerificationStr ? voiceVerificationStr + "\n" : ""}\n**Yetkili Hakkında Değerlendirme / Durum:**\n> ${record.staffCondition.replace(/\n/g, "\n> ")}`);

            if (record.managerNote) {
                panel.addDivider(1);
                panel.addText(`**🔒 Yöneticiye Özel Gizli Değerlendirme Notu:**\n> ${record.managerNote.replace(/\n/g, "\n> ")}`);
            }

            if (record.problem && record.problem.exists && record.problem.content) {
                panel.addDivider(1);
                panel.addText(`**⚠️ Bildirilen Sorun:**\n> ${record.problem.content.replace(/\n/g, "\n> ")}`);
            }

            if (record.suggestion) {
                panel.addText(`**💡 Yetkilinin Önerisi / İstekleri:**\n> ${record.suggestion.replace(/\n/g, "\n> ")}`);
            }

            panel.addDivider(1);
            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`1e1_btn_view_staff_card_${record.memberID}`)
                    .setLabel("Yetkilinin Karnesini Gör")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("📓")
            );
            panel.addActionRow(btnRow);

            await channel.send({ components: panel.toJSON(), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
        } catch (e) {
            console.error("[OneOnOneService] logRecordToChannel Error:", e);
        }
    }

    static async onMemberLeave(member) {
        try {
            if (!member || !member.guild) return;
            const guildID = member.guild.id;
            const memberID = member.id;

            const assignments = await OneOnOneAssignment.find({ guildID, assignedMemberIDs: memberID });
            for (const assign of assignments) {
                assign.assignedMemberIDs = assign.assignedMemberIDs.filter(id => id !== memberID);
                assign.history.push({
                    memberID: memberID,
                    action: "auto_unassigned_left_server",
                    date: new Date(),
                    changedBy: "SYSTEM"
                });
                await assign.save();
                await this.syncSecondaryServerManager(member.guild, assign.managerID);
            }
        } catch (err) {
            console.error("[OneOnOneService] onMemberLeave Error:", err);
        }
    }

    static async onMemberUpdate(oldMember, newMember) {
        try {
            if (!newMember || !newMember.guild) return;
            const guild = newMember.guild;
            const memberID = newMember.id;

            const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
            const allRanks = await StaffRoleSystem.find({ guildID: guild.id, active: true }).sort({ requiredXP: 1 });
            if (!allRanks.length) return;

            let hasEligibleRank = false;
            for (let i = 1; i <= Math.min(10, allRanks.length - 1); i++) {
                if (newMember.roles.cache.has(allRanks[i].roleID)) {
                    hasEligibleRank = true;
                    break;
                }
            }

            if (!hasEligibleRank) {
                const assignments = await OneOnOneAssignment.find({ guildID: guild.id, assignedMemberIDs: memberID });
                for (const assign of assignments) {
                    assign.assignedMemberIDs = assign.assignedMemberIDs.filter(id => id !== memberID);
                    assign.history.push({
                        memberID: memberID,
                        action: "auto_unassigned_deranked",
                        date: new Date(),
                        changedBy: "SYSTEM"
                    });
                    await assign.save();
                    await this.syncSecondaryServerManager(guild, assign.managerID);
                }
            }
        } catch (err) {
            console.error("[OneOnOneService] onMemberUpdate Error:", err);
        }
    }
}

module.exports = OneOnOneService;
