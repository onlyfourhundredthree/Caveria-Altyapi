const { PermissionsBitField } = require("discord.js");
const ConfigManager = require("../Core/Handlers/ConfigManager");
const PermanentRoom = require("../Core/Database/PermanentRoom");
const PermanentRoomProfile = require("../Core/Database/PermanentRoomProfile");

class PermanentRoomService {
    static async getDashboardPayload(client, member, forceMode = null) {
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator) || ConfigManager.isOwner(member);
        const myRoom = await PermanentRoom.findOne({ ownerID: member.id, status: "ACTIVE" });

        if (forceMode === "ADMIN" && isAdmin) {
            return await this.getAdminPanelPayload(client, member);
        }
        if (forceMode === "OWNER" && myRoom) {
            return await this.getOwnerPanelPayload(client, member, myRoom);
        }

        if (isAdmin && myRoom) {
            return this.getSelectionPayload();
        } else if (isAdmin) {
            return await this.getAdminPanelPayload(client, member);
        } else if (myRoom) {
            return await this.getOwnerPanelPayload(client, member, myRoom);
        } else {
            return await this.getDefaultPanelPayload(client);
        }
    }

    static getSelectionPayload() {
        const emojis = ConfigManager.get("Emojis") || {};
        const hub = emojis.toji_hubsparkles || "✨";
        const star = emojis.toji_sparkly || "⭐";

        const container = {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `### ${hub} **Kalıcı Oda Yönetim Merkezi**\n> -# Hesabınız hem **Sunucu Yöneticisi** yetkisine hem de **Aktif Bir Ekibe** sahip. Lütfen işlem yapmak istediğiniz paneli seçin.`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 1,
                    components: [
                        { type: 2, custom_id: "poda_select_admin", label: "Admin Yönetim Paneli", style: 4, emoji: { name: "🛠️" } },
                        { type: 2, custom_id: "poda_select_owner", label: "Oda Sahibi Paneli", style: 1, emoji: { name: "🏠" } }
                    ]
                }
            ]
        };

        return { components: [container], flags: 32768 };
    }

    static async getAdminPanelPayload(client, member) {
        const rooms = await PermanentRoom.find({});
        const top5 = await PermanentRoom.find({ status: "ACTIVE" }).sort({ weeklyVoiceTime: -1 }).limit(5);
        
        const topString = top5.length > 0
            ? top5.map((r, i) => `${i + 1}. ${r.channelName || "İsimsiz"} (${Math.floor((r.weeklyVoiceTime || 0) / 3600000)}s)`).join("\n")
            : "Aktif veri yok.";

        const container = {
            type: 17,
            components: [
                { type: 10, content: `## **Kalıcı Oda Yönetim Merkezi (Admin)**` },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: `### **Sunucu İstatistikleri**\n> Toplam Kayıtlı Oda: \`${rooms.length}\`` },
                { type: 10, content: `### **En Aktif Ekipler (Haftalık)**\n\`\`\`${topString}\`\`\`` },
                { type: 14, divider: true, spacing: 1 }
            ]
        };

        if (rooms.length > 0) {
            const options = rooms.slice(0, 25).map(room => ({
                label: room.channelName || "İsimsiz Oda",
                value: room._id.toString(),
                description: `Oda Sahibi ID: ${room.ownerID}`
            }));

            container.components.push({
                type: 1,
                components: [
                    {
                        type: 3,
                        custom_id: "POD_ADMIN_ROOM_SELECT",
                        options: options,
                        placeholder: "Yönetmek için bir oda seçin...",
                        min_values: 1,
                        max_values: 1,
                        disabled: false
                    }
                ]
            });
        } else {
            container.components.push({ type: 10, content: "*Sistemde kayıtlı oda bulunmuyor.*" });
        }

        const myRoom = await PermanentRoom.findOne({ ownerID: member.id, status: "ACTIVE" });
        if (myRoom) {
            container.components.push({
                type: 1,
                components: [
                    { type: 2, custom_id: "poda_go_back", label: "Geri Dön", style: 2, emoji: { name: "⬅️" } }
                ]
            });
        }

        return { components: [container], flags: 32768 };
    }

    static async getOwnerPanelPayload(client, member, roomData) {
        const emojis = ConfigManager.get("Emojis") || {};
        const dot = emojis.toji_nokta || "•";
        
        let profileText = `Yok`;
        let limitText = `Yok`;
        let roomLockState = `Yok`;

        const guild = client.guilds.cache.get(roomData.guildID);
        const voiceChannel = guild ? guild.channels.cache.get(roomData.channelID) : null;
        
        if (voiceChannel) {
            limitText = voiceChannel.userLimit ? `${voiceChannel.userLimit} Kişi` : "Limitsiz";
            const lockPerm = voiceChannel.permissionOverwrites.cache.get(guild.id);
            const isLockedNow = lockPerm && lockPerm.deny.has("Connect");
            
            const userProfile = await PermanentRoomProfile.findOne({ userId: roomData.ownerID });
            const adminStatusNow = userProfile && userProfile.profiles.length > 0 ? userProfile.profiles[0].adminEntryControl : false;

            if (!isLockedNow) {
                roomLockState = "Herkese Açık";
            } else if (isLockedNow && !adminStatusNow) {
                roomLockState = "Kilitli (Sadece Üyeler & Yetkililer)";
            } else {
                roomLockState = "Admin Korumalı (Girişler Sahibine Sorulur)";
            }
            
            const profile = userProfile && userProfile.profiles.length > 0 ? userProfile.profiles[0] : null;
            if (profile) profileText = `${profile.profileName}`;
        }

        const container = {
            type: 17,
            components: [
                {
                    type: 9,
                    accessory: {
                        type: 11,
                        media: { url: member.user.displayAvatarURL({ dynamic: true, size: 1024 }) }
                    },
                    components: [
                        {
                            type: 10,
                            content: `## **Oda Kontrol Paneli**\n-# **${roomData.channelName || "Oda"}** isimli kalıcı odanın gelişmiş ayarlarını buradan yönetebilirsiniz.`
                        }
                    ]
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 10,
                    content: `### **Oda Detayları**\n` +
                        `> ${dot} **Oda Durumu:** \`${roomLockState}\`\n` +
                        `> ${dot} **Kişi Limiti:** \`${limitText}\`\n` +
                        `> ${dot} **Geçerli Profil:** \`${profileText}\`\n` +
                        `> ${dot} **Ekip Rolü:** ${roomData.teamRoleID ? `<@&${roomData.teamRoleID}>` : "`Yok`"}`
                },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 9,
                    accessory: { type: 2, custom_id: "POD_BTN_RENAME", label: "Oda İsmi Değiştir", style: 2, emoji: { name: "📝" } },
                    components: [{ type: 10, content: `**İsim Değişikliği:**\nOdalarınızın adını güncelleyebilirsiniz.` }]
                },
                {
                    type: 9,
                    accessory: { type: 2, custom_id: "POD_BTN_LIMIT", label: "Oda Limiti Belirle", style: 2, emoji: { name: "👥" } },
                    components: [{ type: 10, content: `**Limit Ayarı:**\nOdaya girebilecek maksimum kişi sayısını ayarlayın.` }]
                },
                {
                    type: 9,
                    accessory: { type: 2, custom_id: "POD_BTN_LOCK", label: "Oda Kilidini Değiştir", style: 4, emoji: { name: "🔒" } },
                    components: [{ type: 10, content: `**Erişim Yönetimi:**\nOdayı kilitleyebilir veya admin koruması açabilirsiniz.` }]
                },
                {
                    type: 9,
                    accessory: { type: 2, custom_id: "POD_BTN_CAMERA", label: "Kamera İzni Ayarla", style: 3, emoji: { name: "📷" } },
                    components: [{ type: 10, content: `**Görüntü Ayarı:**\nOdada kamera veya ekran paylaşımını açıp kapatın.` }]
                },
                {
                    type: 9,
                    accessory: { type: 2, custom_id: "POD_BTN_ROLE", label: "Ekip Rolünü Yönet", style: 1, emoji: { name: "🎭" } },
                    components: [{ type: 10, content: `**Ekip Rolü:**\nEkibinize özel discord rolü oluşturun ve yönetin.` }]
                },
                {
                    type: 1,
                    components: [
                        { type: 5, custom_id: "POD_MEMBER_ADD", placeholder: "Odaya yeni üyeler ekleyin...", max_values: 15 },
                    ]
                },
                {
                    type: 1,
                    components: [
                        { type: 5, custom_id: "POD_MEMBER_REMOVE", placeholder: "Odadan mevcut üyeleri çıkartın...", max_values: 15 },
                    ]
                }
            ]
        };

        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator) || ConfigManager.isOwner(member);
        if (isAdmin) {
            container.components.push({
                type: 1,
                components: [
                    { type: 2, custom_id: "poda_go_back", label: "Geri Dön", style: 2, emoji: { name: "⬅️" } }
                ]
            });
        }

        return { components: [container], flags: 32768 };
    }

    static async getDefaultPanelPayload(client) {
        const emojis = ConfigManager.get("Emojis") || {};
        const settings = ConfigManager.get("PermanentRoomSettings") || {
            "MinMembers": 4,
            "MinWeeklyVoice": 60,
            "TeamRoleEnabled": false
        };

        const applyEmoji = { name: "📨" };

        const headerText = `> ## ${emojis.toji_hubsparkles || "✨"} **Kalıcı Oda Sistemi!**\n> Sunucumuzda ekiplere özel **Kalıcı Oda** imkanı sunulmaktadır. Başvuru yapmadan önce lütfen şartları okuyunuz:\n\n` +
            `> ### ${emojis.toji_bluestar || "✨"} **Kalıcı Oda Kuralları:** \n` +
            `> -# \` 1 \` **Kalıcı oda ekip halinde açılır, tek kişiye açılmaz.**\n` +
            `> -# \` 2 \` **Şartlar sağlanmazsa oda önce kilitlenir, ardından silinir.**\n` +
            `> -# \` 3 \` **Kalıcı oda bir ayrıcalıktır ve aktiflikler sürekli takip edilir.**\n`;

        const detailText = `> ### ${emojis.toji_sparkly || "✨"} **Oda Gereksinimleri:** \n` +
            `> -# \` 1 \` **Minimum Üye Sayısı:** \`${settings.MinMembers} Kişi\`\n` +
            `> -# \` 2 \` **Minimum Haftalık Ses Akifliği:** \`${settings.MinWeeklyVoice} Saat\`\n` +
            (settings.TeamRoleEnabled ? `> -# \` 3 \` **Özel Ekip Rolü:** \`Aktif\`\n` : `> -# \` 3 \` **Özel Ekip Rolü:** \`Devre Dışı\`\n`);

        const container = {
            type: 17,
            components: [
                { type: 10, content: headerText },
                { type: 14, divider: true, spacing: 1 },
                { type: 10, content: detailText },
                { type: 14, divider: true, spacing: 1 },
                {
                    type: 9,
                    accessory: {
                        type: 2,
                        style: 3,
                        custom_id: "poda_apply",
                        label: "Başvuru Yap",
                        emoji: applyEmoji
                    },
                    components: [
                        { type: 10, content: "-# Kalıcı oda başvurusunu yandaki butondan yapabilirsiniz." }
                    ]
                }
            ]
        };

        return { components: [container], flags: 32768 };
    }
}

module.exports = PermanentRoomService;
