const ConfigManager = require("../../Core/Handlers/ConfigManager");
const { MessageFlags } = require("discord.js");

class AfService {
    static async execute(context) {
        const isInteraction = !!context.user;
        const member = isInteraction ? context.member : context.member;

        if (!ConfigManager.isOwner(member)) {
            const errObj = { 
                flags: [MessageFlags.IsComponentsV2],
                components: [{ type: 17, components: [{ type: 10, content: `> ℹ️ Bu komutu kullanmaya yetkiniz yok.` }] }]
            };
            if (isInteraction) return context.reply({ ...errObj, ephemeral: true });
            return context.reply(errObj).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const emojis = ConfigManager.get("Emojis") || {};
        const info = emojis.toji_info || "";
        const timeEmoji = emojis.toji_time || "";
        const createEmoji = emojis.toji_create || "";
        const nokEmoji = emojis.toji_nokta || "";

        const parseEmj = (str) => {
            if (!str) return undefined;
            const match = str.match(/<a?:([a-zA-Z0-9_]+):(\d+)>/);
            if (match) return { name: match[1], id: match[2], animated: str.startsWith('<a:') };
            return undefined;
        };

        const selectRow = {
            type: 1,
            components: [
                {
                    type: 5,
                    custom_id: "af_user_select",
                    placeholder: "Kişisel Af İçin Kullanıcı Seçin",
                    min_values: 1,
                    max_values: 25
                }
            ]
        };

        const bulkSelectRow = {
            type: 1,
            components: [
                {
                    type: 3,
                    custom_id: "af_bulk_select",
                    placeholder: "Gelişmiş Toplu Af Seçenekleri",
                    options: [
                        { label: "Sadece Jail (X Süreden Az)", value: "jail_less", emoji: parseEmj(timeEmoji) },
                        { label: "Sadece Jail (X Süreden Fazla)", value: "jail_more", emoji: parseEmj(timeEmoji) },
                        { label: "Sadece Underworld (X Süreden Az)", value: "underworld_less", emoji: parseEmj(timeEmoji) },
                        { label: "Sadece Underworld (X Süreden Fazla)", value: "underworld_more", emoji: parseEmj(timeEmoji) },
                        { label: "Her İki Ceza İçin (X Süreden Az)", value: "all_less", emoji: parseEmj(info) },
                        { label: "Her İki Ceza İçin (X Süreden Fazla)", value: "all_more", emoji: parseEmj(info) },
                        { label: "Kalıcı/Süresiz Cezası Olanlar", value: "all_perm", emoji: parseEmj(createEmoji) }
                    ]
                }
            ]
        };

        const buttonRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: "af_no_data",
                    label: "Verisi Olmayanları Kurtar",
                    style: 2,
                    emoji: parseEmj(createEmoji)
                },
                {
                    type: 2,
                    custom_id: "af_mass_pardon",
                    label: "Tüm Cezaları Kaldır (Genel Af)",
                    style: 4
                }
            ]
        };

        const v2Components = [{
            type: 17,
            components: [
                {
                    type: 10,
                    content: `## ${info} Ceza Affı ve Yönetim Paneli\nBu panel üzerinden sunucudaki aktif cezaları (**Jail**, **Underworld**) yönetebilir ve kaldırabilirsiniz. Lütfen yapacağınız işlemin kapsamını dikkatlice seçin.\n\n` +
                             `> ${nokEmoji} **Kişisel Af (Kullanıcı Seçimi):** Belirli kullanıcıları seçerek yalnızca onların aktif cezalarını kaldırabilirsiniz.\n` +
                             `> ${nokEmoji} **Gelişmiş Toplu Af:** Belirli bir ceza türünü veya süresini filtreleyerek toplu olarak affedebilirsiniz.\n` +
                             `> ${nokEmoji} **Kayıp Veri Kurtarma:** Veritabanı kaydı silinmiş ancak hala cezalı rolünde kalmış üyeleri temizler.\n` +
                             `> ${nokEmoji} **Tam Kapsamlı Af:** Sunucudaki tüm cezaları geri döndürülemez şekilde, tamamen sıfırlar.`
                },
                { type: 14, divider: true, spacing: 1 },
                selectRow,
                { type: 14, divider: true, spacing: 1 },
                bulkSelectRow,
                { type: 14, divider: true, spacing: 1 },
                buttonRow
            ]
        }];

        return context.reply({ components: v2Components, flags: [MessageFlags.IsComponentsV2] });
    }
}

module.exports = AfService;
