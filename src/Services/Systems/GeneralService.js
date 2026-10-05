const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

class GeneralService {
    /**
     * Mesajları ikili mimariye uygun atar.
     */
    static async sendV2Message(ctx, options) {
        const isSlash = ctx.commandName ? true : false;
        const payload = { ...options };

        if (isSlash) {
            if (ctx.deferred) return await ctx.editReply(payload);
            return await ctx.reply(payload);
        } else {
            return await ctx.reply(payload);
        }
    }

    static getMergedCommands(client) {
        const merged = new Map();

        if (client.commands) {
            client.commands.forEach(cmd => {
                if (!cmd.conf) return;
                
                let name = cmd.conf.name?.toLowerCase();
                let aliases = cmd.conf.aliases || [];
                
                if (cmd.conf.usages && cmd.conf.usages.length > 0) {
                    name = cmd.conf.usages[0].toLowerCase();
                    aliases = cmd.conf.usages.slice(1);
                }

                if (!name) return;

                merged.set(name, {
                    name: name,
                    description: cmd.conf.description || cmd.conf.help || "Açıklama belirtilmemiş.",
                    category: cmd.conf.category || "Diğer",
                    usage: cmd.conf.usage || null,
                    hasPrefix: true,
                    hasSlash: false,
                    aliases: aliases
                });
            });
        }

        if (client.slashcommands) {
            client.slashcommands.forEach(cmd => {
                const name = cmd.data?.name?.toLowerCase();
                if (!name) return;
                
                const cat = cmd.category || cmd.conf?.category || "Diğer";
                
                if (merged.has(name)) {
                    merged.get(name).hasSlash = true;
                    if (merged.get(name).description === "Açıklama belirtilmemiş." && cmd.data.description) {
                        merged.get(name).description = cmd.data.description;
                    }
                } else {
                    merged.set(name, {
                        name: name,
                        description: cmd.data.description || "Açıklama belirtilmemiş.",
                        category: cat,
                        hasPrefix: false,
                        hasSlash: true,
                        aliases: []
                    });
                }
            });
        }
        return Array.from(merged.values());
    }

    static async handleHelp(ctx) {
        const client = ctx.client;
        const mergedCommands = this.getMergedCommands(client);
        const categories = {};

        const allowedCategories = ["owners", "moderation", "staff", "stats", "fun", "users"];

        mergedCommands.forEach(cmd => {
            const cat = cmd.category.toLowerCase();
            if (allowedCategories.includes(cat)) {
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(cmd);
            }
        });

        const categoryNames = Object.keys(categories).sort();
        const options = categoryNames.map(cat => ({
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} komutları.`,
            value: cat,
            emoji: "📌"
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("help_menu")
            .setPlaceholder("Bir komut kategorisi seçiniz...")
            .addOptions(options);

        // Menüyü Type 1 içine alıyoruz
        const v2Payload = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `> ## 📌 Yardım Paneli\n> -# Bot üzerindeki tüm komutlara menüden göz atabilirsiniz.\n> -# Sistemde kayıtlı toplam **${mergedCommands.length}** komut bulunmaktadır.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 1,
                        components: [selectMenu]
                    }
                ]
            }
        ];

        await this.sendV2Message(ctx, { 
            components: v2Payload, 
            flags: [MessageFlags.IsComponentsV2]
        });
    }

    static async sendSayStats(ctx, guild, user) {
        let members;
        if (guild.memberCount !== guild.members.cache.size) {
            members = await guild.members.fetch();
        } else {
            members = guild.members.cache;
        }

        const totalMembers = guild.memberCount;
        
        // Aktif (çevrimiçi) üye sayısı (cache üzerinden yaklaşık, presence bilgisi discord api den geliyorsa)
        const onlineMembers = members.filter(m => m.presence && m.presence.status !== "offline").size;
        
        // Seste olan üyeler
        const voiceMembers = members.filter(m => m.voice.channel).size;
        
        // Taglı üyeler (Rol üzerinden)
        let taggedMembers = 0;
        const tagRoleID = ConfigManager.get("Roles.Tag");
        if (tagRoleID && guild.roles.cache.has(tagRoleID)) {
            taggedMembers = guild.roles.cache.get(tagRoleID).members.size;
        } else {
            // Role yoksa tag taşıyan member sayısı
            taggedMembers = members.filter(m => m.roles.cache.has(tagRoleID)).size;
        }

        const v2Payload = [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `> ## ${(ConfigManager.get("Emojis.toji_info") || "📊")} Sunucu İstatistikleri\n> -# Anlık olarak güncel sunucu istatistikleri aşağıda belirtilmiştir.`
                    },
                    { type: 14, divider: true, spacing: 1 },
                    {
                        type: 10,
                        content: `> **👥 Toplam Üye:** \`${totalMembers}\`\n> **🟢 Aktif Üye:** \`${onlineMembers}\`\n> **🔊 Sesteki Üye:** \`${voiceMembers}\`\n> **${(ConfigManager.get("Emojis.toji_user") || "🏷️")} Taglı Üye:** \`${taggedMembers}\``
                    }
                ]
            }
        ];

        await this.sendV2Message(ctx, {
            components: v2Payload,
            flags: [MessageFlags.IsComponentsV2]
        });
    }

    static async sendAvatar(client, ctx, targetUser, author) {
        const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });
        
        const payload = {
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: {
                                type: 2,
                                style: 5,
                                label: "Tarayıcıda Aç",
                                url: avatarUrl
                            },
                            components: [
                                {
                                    type: 10,
                                    content: `> ## 🖼️ Avatar Görüntüleyici\n> -# <@${targetUser.id}> adlı kullanıcının avatarı aşağıda yer almaktadır.`
                                }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 12,
                            items: [{ media: { url: avatarUrl } }]
                        }
                    ]
                }
            ],
            flags: [MessageFlags.IsComponentsV2]
        };
        await this.sendV2Message(ctx, payload);
    }

    static async handleAfk(ctx, args, targetMember, author) {
        const AfkModel = require("../../Core/Database/AFK");
        
        let target = author;
        let reason = args.join(" ");

        if (targetMember && author.permissions && author.permissions.has("Administrator")) {
            target = targetMember.user || targetMember;
            reason = args.slice(1).join(" ");
        } else if (targetMember) {
            target = targetMember.user || targetMember;
        }

        reason = reason || "Şu an AFK'yım, en kısa sürede döneceğim.";

        await AfkModel.findOneAndUpdate(
            { userID: target.id },
            { reason, date: Date.now() },
            { upsert: true }
        );

        const currentName = target.displayName || target.username || target.globalName;
        if (target.manageable && currentName && !currentName.includes("[AFK]")) {
            await target.setNickname(`[AFK] ${currentName.substring(0, 26)}`).catch(() => {});
        }

        const payload = {
            components: [
                {
                    type: 17,
                    components: [
                        {
                            type: 10,
                            content: `> ## 💤 AFK Modu\n> -# <@${target.id}> başarıyla **AFK** moduna geçiş yaptı.\n> -# Sebep: **${reason}**`
                        }
                    ]
                }
            ],
            flags: [MessageFlags.IsComponentsV2]
        };

        await this.sendV2Message(ctx, payload);
    }
}

module.exports = GeneralService;
