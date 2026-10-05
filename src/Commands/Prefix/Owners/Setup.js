const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

const DefaultConfig = require("../../../Core/Config/DefaultConfig");

module.exports = {
    conf: {
        usages: ["setup", "ayarlar", "ayar", "config", "config-panel", "settings"],
        description: "Botun veri tabanı bağlantılarını ve sunucu ayarlarını yapılandırma arayüzüdür.",
        category: "Owners",
        usage: ".setup",
        owner: true
    },

    /**
     * @param { import("discord.js").Client } client
     * @param { import("discord.js").Message } message
     * @param { Array<String> } args
     */

    execute: async (client, message, args) => {
        if (!ConfigManager.isOwner(message.member)) {
            return message.reply("Bu komutu kullanmaya yetkin yetmiyor.");
        }

        const PROTECTED_KEYS = ["Moderation", "Owners", "Prefixs", "ClientID", "GuildID", "MongoURL"];
        const operation = args[0] ? args[0].toLowerCase() : null;
        let key = args[1];

        // Validasyon Fonksiyonu: Key DefaultConfig içinde var mı?
        function isValidKey(checkKey) {
            if (!checkKey) return false;

            // Root key kontrolü
            const mainKey = checkKey.split('.')[0];
            if (!Object.prototype.hasOwnProperty.call(DefaultConfig, mainKey) && !PROTECTED_KEYS.includes(mainKey)) {
                return false;
            }

            // Nested key kontrolü
            if (checkKey.includes('.')) {
                const parts = checkKey.split('.');
                const main = parts[0];
                const sub = parts[1];

                if (DefaultConfig[main] && Object.prototype.hasOwnProperty.call(DefaultConfig[main], sub)) {
                    return true;
                }
                return false;
            }

            return true;
        }



        // Access Control for modifications
        if (["set", "push", "pull"].includes(operation)) {
            const mainKey = key ? key.split('.')[0] : null;
            if (PROTECTED_KEYS.includes(mainKey)) {
                return message.reply(`\u274C **${mainKey}** anahtarı korumalıdır ve bu komutla değiştirilemez.`);
            }

            if (!isValidKey(key)) {
                return message.reply(`\u274C **${key}** anahtarı varsayılan yapılandırmada (DefaultConfig) bulunamadı. Yeni anahtar ekleyemezsiniz, sadece mevcut olanları düzenleyebilirsiniz.`);
            }
        }

        if (!operation) {
            const embed = new EmbedBuilder()
                .setTitle("⚙️ Sistem Yapılandırması (Setup)")
                .setDescription("Botun tüm altyapı ayarlarını bu menüden görüntüleyebilir ve değiştirebilirsiniz. Değişiklikler **anında aktif olur**, botu yeniden başlatmanıza gerek yoktur!")
                .addFields(
                    { 
                        name: "📖 Komut Kullanımları", 
                        value: "`.setup list`\n> Tüm ayar kategorilerini interaktif bir menüde listeler.\n\n" +
                               "`.setup get <Ayar.Adı>`\n> Belirli bir ayarın mevcut değerini gösterir.\n> *Örnek: .setup get Roles.JailStaff*\n\n" +
                               "`.setup set <Ayar.Adı> <Değer>`\n> Belirtilen ayarı yeni bir değerle değiştirir. (Birden fazla satır yazmak için `\\n` kullanabilirsiniz.)\n> *Örnek: .setup set Partner.Message Selam\\nNaber*\n\n" +
                               "`.setup push <Ayar.Adı> <Değer>`\n> Bir liste ayarına yeni bir eleman (ID/Rol vs.) ekler.\n> *Örnek: .setup push Roles.MuteStaff @rol*\n\n" +
                               "`.setup pull <Ayar.Adı> <Değer>`\n> Bir liste ayarından belirtilen elemanı siler.\n> *Örnek: .setup pull Roles.MuteStaff @rol*"
                    },
                    {
                        name: "💡 İpuçları",
                        value: "- Rol veya kanal ID'si girmek yerine direkt **etiketleyebilirsiniz**.\n- İç içe ayarlarda `Kategori.AltAyar` şeklinde nokta kullanın (Örn: `Economy.CoinName`).\n- Uzun metinlerde alt satıra geçmek için `\\n` yazmanız yeterlidir."
                    }
                )
                .setColor("#2b2d31")
                .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

            return message.reply({ embeds: [embed] });
        }

        if (operation === "list") {
            const categories = ["Channels", "Roles", "Economy", "Welcome", "WeeklyReward", "ChatGuard", "Boost", "Partner", "Level", "Logs", "AutoStaff", "StaffControl", "TagBan", "Emojis", "Tweet", "BestStaff"];
            const emojisConfig = ConfigManager.get("Emojis");

            const formatValue = (key, value, category) => {
                if (!value && value !== false && value !== 0) return "`" + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Ayarlanmamış`";
                if (Array.isArray(value)) {
                    if (value.length === 0) return "`" + (ConfigManager.get("Emojis.toji_iptal") || "✨") + " Ayarlanmamış`";
                    const isComplexArray = value.some(v => typeof v === 'object' && v !== null && !Array.isArray(v) && v.type !== undefined);
                    if (isComplexArray) return `\`📦 JSON Veri (${value.length} eleman)\``;
                    return value.map(v => formatValue(key, v, category)).join(", ");
                }
                if (typeof value === 'string' && /^\d{17,19}$/.test(value)) {
                    if (category === "Channels" || key.includes("Channel") || key.includes("Log")) return `<#${value}>`;
                    if (category === "Roles" || key.includes("Role") || key.includes("Staff") || key.includes("Tag")) return `<@&${value}>`;
                    return `\`${value}\``;
                }
                if (typeof value === 'object' && value !== null) {
                    const jsonStr = JSON.stringify(value);
                    return jsonStr.length > 100 ? `\`📦 JSON Obje\`` : `\`${jsonStr}\``;
                }
                return `\`${value}\``;
            };

            let allPages = [];
            let categoryMap = {}; // Maps original category index to start index in allPages

            categories.forEach((cat, catIdx) => {
                const data = ConfigManager.get(cat);
                let lines = [];

                if (!data) {
                    lines.push("⚠️ Bu kategoride ayar bulunamadı.");
                } else if (typeof data !== "object") {
                    const value = formatValue(cat, data, cat);
                    lines.push(`**🔹 ${cat}**\n> ${value}\n⚠️ *Tek değer olarak görünüyor.*`);
                } else {
                    Object.entries(data).forEach(([key, value]) => {
                        let itemText = "";
                        const isLeafConfig = (v) => {
                            if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
                            if ((v.label !== undefined && v.value !== undefined) || (v.Label !== undefined && v.Value !== undefined)) return true;
                            if (v.type !== undefined) return true;
                            return false;
                        };

                        if (typeof value === 'object' && !Array.isArray(value) && value !== null && !isLeafConfig(value)) {
                            itemText += `**🔹 ${key}**\n`;
                            Object.entries(value).forEach(([subKey, subValue]) => {
                                const fullKey = `${cat}.${key}.${subKey}`;
                                itemText += `> \`${fullKey}\`: ${formatValue(subKey, subValue, cat)}\n`;
                            });
                        } else {
                            const fullKey = `${cat}.${key}`;
                            itemText += `> \`${fullKey}\`: ${formatValue(key, value, cat)}\n`;
                        }
                        lines.push(itemText);
                    });
                }

                // Chunking logic
                let currentChunk = "";
                let chunks = [];

                for (const line of lines) {
                    if ((currentChunk + line).length > 2000) {
                        chunks.push(currentChunk);
                        currentChunk = line;
                    } else {
                        currentChunk += line;
                    }
                }
                if (currentChunk) chunks.push(currentChunk);
                if (chunks.length === 0) chunks.push("⚠️ Veri yok.");

                categoryMap[catIdx] = allPages.length; // Start index

                chunks.forEach((chunk, i) => {
                    allPages.push({
                        category: cat,
                        description: chunk,
                        page: i + 1,
                        totalPages: chunks.length,
                        catIndex: catIdx
                    });
                });
            });

            let currentPageIndex = 0;

            const generateEmbed = (index) => {
                if (index < 0 || index >= allPages.length) return new EmbedBuilder().setDescription("Hata: Sayfa bulunamadı.");
                const page = allPages[index];
                return new EmbedBuilder()
                    .setTitle(`⚙️ Setup: ${page.category} (${page.page}/${page.totalPages})`)
                    .setColor("Blue")
                    .setDescription(page.description)
                    .setFooter({ text: `Genel Sayfa: ${index + 1}/${allPages.length} • Detaylı bilgi için .setup get` });
            };

            const generateComponents = (index) => {
                const page = allPages[index];

                const selectOptions = categories.map((c, i) => ({
                    label: c,
                    value: categoryMap[i].toString(),
                    default: i === page.catIndex,
                    emoji: "\uD83D\uDCC2"
                }));

                const row1 = new Utils.ActionRowBuilder().addComponents(
                    new Utils.StringSelectMenuBuilder()
                        .setCustomId("setup_category_select")
                        .setPlaceholder("Kategoriye Git")
                        .addOptions(selectOptions)
                );

                const row2 = new Utils.ActionRowBuilder().addComponents(
                    new Utils.ButtonBuilder()
                        .setCustomId("setup_prev")
                        .setLabel("\u2B05\uFE0F Önceki")
                        .setStyle(Utils.ButtonStyle.Primary)
                        .setDisabled(index === 0),
                    new Utils.ButtonBuilder()
                        .setCustomId("setup_next")
                        .setLabel("Sonraki \u27A1\uFE0F")
                        .setStyle(Utils.ButtonStyle.Primary)
                        .setDisabled(index === allPages.length - 1)
                );

                return [row1, row2];
            };

            // We need ActionRowBuilder etc from discord.js
            const Utils = require("discord.js");

            // Initial Send
            await message.reply({
                embeds: [generateEmbed(currentPageIndex)],
                components: generateComponents(currentPageIndex)
            }).then(msg => {
                const collector = msg.createMessageComponentCollector({
                    filter: (i) => i.user.id === message.author.id,
                    time: 300000
                });

                collector.on("collect", async (i) => {
                    if (i.customId === "setup_prev") currentPageIndex--;
                    if (i.customId === "setup_next") currentPageIndex++;
                    if (i.customId === "setup_category_select") currentPageIndex = parseInt(i.values[0]);

                    // Safety Clamp
                    if (currentPageIndex < 0) currentPageIndex = 0;
                    if (currentPageIndex >= allPages.length) currentPageIndex = allPages.length - 1;

                    await i.update({
                        embeds: [generateEmbed(currentPageIndex)],
                        components: generateComponents(currentPageIndex)
                    });
                });

                collector.on("end", () => {
                    msg.edit({ components: [], content: "\u200b" }).catch(() => { });
                });
            });

            return;
        }

        if (operation === "get") {
            if (!key) return message.reply("Lütfen bir key belirtin.");
            if (PROTECTED_KEYS.includes(key.split('.')[0])) return message.reply("🚫 Bu veri gizlidir.");

            const value = ConfigManager.get(key);
            return message.reply(`**${key}**: \`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``);
        }

        if (operation === "set") {
            if (!key || !args[2]) return message.reply("Kullanım: .setup set <key> <value>");

            // Replace older role paths with new Responsibilities paths
            if (key === "Roles.PartnerManager") key = "Roles.Responsibilities.PartnerManager";
            if (key === "Roles.TicketStaff") key = "Roles.Responsibilities.TicketStaff";

            // Check for Object Protection
            const defaultConfigValue = ConfigManager.get(key) || DefaultConfig[key];
            if (defaultConfigValue && typeof defaultConfigValue === 'object' && !Array.isArray(defaultConfigValue)) {
                if (!key.includes('.')) {
                    return message.reply(`🚫 **${key}** bir ayar grubudur (kategori). Lütfen değiştirmek istediğiniz alt ayarı belirtin.\nÖrnek: \`.setup set ${key}.<AltAyar> <Değer>\``);
                }
            }

            let value = args.slice(2).join(" ").replace(/\\n/g, '\n');

            // JSON format detection - parse if value looks like JSON
            if ((value.trim().startsWith('{') && value.trim().endsWith('}')) || (value.trim().startsWith('[') && value.trim().endsWith(']'))) {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    return message.reply(`${ConfigManager.get("Emojis.toji_iptal") || "✨"} JSON formatı hatalı: \`${e.message}\``);
                }
            }
            // Basit tip dönüşümleri
            else if (value === "true") value = true;
            else if (value === "false") value = false;
            // ID'lerin number olmasını engellemek için number dönüşümünü kaldırdık.
            // else if (!isNaN(Number(value))) value = Number(value);

            // Mentions varsa ID'lerini al
            if (message.mentions.roles.size > 0) value = message.mentions.roles.first().id;
            if (message.mentions.channels.size > 0) value = message.mentions.channels.first().id;
            if (message.mentions.users.size > 0) value = message.mentions.users.first().id;

            // Nested update mi yoksa root update mi?
            if (key.includes('.')) {
                const [mainKey, ...rest] = key.split('.');
                const nestedPath = rest.join('.');
                await ConfigManager.updateNested(mainKey, nestedPath, value, message.author.tag);
            } else {
                await ConfigManager.set(key, value, message.author.tag);
            }

            const displayValue = typeof value === 'object' ? `📦 JSON (${JSON.stringify(value).length} karakter)` : value;
            return message.reply(`${ConfigManager.get("Emojis.toji_onay") || "✨"} **${key}** başarıyla güncellendi ve **anında aktif edildi** (yeniden başlatmaya gerek yok).\n\`\`\`${displayValue}\`\`\``);
        }

        if (operation === "push") {
            if (!key || !args[2]) return message.reply("Kullanım: .setup push <key> <value> [value2] [value3]...");

            let list = ConfigManager.get(key);

            // Auto-repair: If value is string but should be array (or user is pushing, implying array)
            if (typeof list === 'string') {
                // Split by spaces to recover the array
                list = list.split(/\s+/).filter(item => item.length > 0);
            } else if (!list) {
                list = [];
            }

            if (!Array.isArray(list)) return message.reply(`Bu key bir liste (array) değil. Mevcut değer tipi: ${typeof list}`);

            const valuesToAdd = [];
            // Handle mentions specifically if they exist
            if (message.mentions.roles.size > 0) message.mentions.roles.forEach(r => valuesToAdd.push(r.id));
            else if (message.mentions.channels.size > 0) message.mentions.channels.forEach(c => valuesToAdd.push(c.id));
            else if (message.mentions.users.size > 0) message.mentions.users.forEach(u => valuesToAdd.push(u.id));
            else {
                // Modified logic to handle both JSON and Invite resolution
                const rawArgs = args.slice(2);
                const joinedArgs = rawArgs.join(" ");

                if ((joinedArgs.startsWith("{") && joinedArgs.endsWith("}")) || (joinedArgs.startsWith("[") && joinedArgs.endsWith("]"))) {
                    try {
                        const parsed = JSON.parse(joinedArgs);
                        if (Array.isArray(parsed)) {
                            valuesToAdd.push(...parsed);
                        } else {
                            valuesToAdd.push(parsed);
                        }
                    } catch (e) {
                        return message.reply(`${ConfigManager.get("Emojis.toji_iptal") || "✨"} JSON formatı hatalı: \`${e.message}\``);
                    }
                } else {
                    // Check for invites if key is BannedGuildIDs
                    if (key === "TagBan.BannedGuildIDs") {
                        for (const arg of rawArgs) {
                            const inviteMatch = arg.match(/(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/i);
                            if (inviteMatch && inviteMatch[1]) {
                                try {
                                    const invite = await client.fetchInvite(inviteMatch[1]).catch(() => null);
                                    if (invite && invite.guild) {
                                        valuesToAdd.push(invite.guild.id);
                                        message.channel.send(`🔍 Davet linki çözüldü: **${invite.guild.name}** (\`${invite.guild.id}\`)`);
                                    } else {
                                        message.channel.send(`⚠️ Geçersiz davet linki: \`${arg}\``);
                                    }
                                } catch (err) {
                                    valuesToAdd.push(arg); // Fallback to raw string
                                }
                            } else {
                                valuesToAdd.push(arg);
                            }
                        }
                    } else {
                        valuesToAdd.push(...rawArgs);
                    }
                }
            }

            let addedCount = 0;
            for (const val of valuesToAdd) {
                const alreadyExists = list.some(item => {
                    if (typeof item === 'object' && typeof val === 'object' && item !== null && val !== null) {
                        if (item.id && val.id) return item.id === val.id;
                        if (item.Id && val.Id) return item.Id === val.Id;
                        if (item.value && val.value) return item.value === val.value;
                        if (item.Value && val.Value) return item.Value === val.Value;
                        return JSON.stringify(item) === JSON.stringify(val);
                    }
                    return item === val;
                });

                if (!alreadyExists) {
                    list.push(val);
                    addedCount++;
                }
            }

            if (key.includes('.')) {
                const [mainKey, ...rest] = key.split('.');
                await ConfigManager.updateNested(mainKey, rest.join('.'), list, message.author.tag);
            } else {
                await ConfigManager.set(key, list, message.author.tag);
            }
            return message.reply(`${ConfigManager.get("Emojis.toji_onay") || "✨"} **${key}** listesine **${addedCount}** adet değer eklendi ve **anında aktif edildi**.`);
        }

        if (operation === "pull") {
            if (!key || !args[2]) return message.reply("Kullanım: .setup pull <key> <value>");
            let value = args.slice(2).join(" ");

            // Mentions
            if (message.mentions.roles.size > 0) value = message.mentions.roles.first().id;
            else if (message.mentions.channels.size > 0) value = message.mentions.channels.first().id;
            else if (message.mentions.users.size > 0) value = message.mentions.users.first().id;

            const list = ConfigManager.get(key) || [];
            if (!Array.isArray(list)) return message.reply("Bu key bir liste (array) değil.");

            let newList;
            if (value.toLowerCase() === "all" || value.toLowerCase() === "hepsi") {
                newList = [];
            } else {
                let parsedValue = value;
                if ((value.trim().startsWith('{') && value.trim().endsWith('}')) || (value.trim().startsWith('[') && value.trim().endsWith(']'))) {
                    try {
                        parsedValue = JSON.parse(value);
                    } catch (e) {
                        // Keep as string if parsing fails
                    }
                }

                newList = list.filter(item => {
                    // Match objects
                    if (typeof item === 'object' && typeof parsedValue === 'object' && item !== null && parsedValue !== null) {
                        if (item.id && parsedValue.id) return item.id !== parsedValue.id;
                        if (item.Id && parsedValue.Id) return item.Id !== parsedValue.Id;
                        if (item.value && parsedValue.value) return item.value !== parsedValue.value;
                        if (item.Value && parsedValue.Value) return item.Value !== parsedValue.Value;
                        return JSON.stringify(item) !== JSON.stringify(parsedValue);
                    }

                    // Match if item is object but input is just a string (e.g. searching by ID directly)
                    if (typeof item === 'object' && item !== null && typeof parsedValue === 'string') {
                        if (item.id === parsedValue || item.Id === parsedValue || item.value === parsedValue || item.Value === parsedValue) return false;
                        if (JSON.stringify(item) === parsedValue) return false;
                    }

                    return item !== parsedValue;
                });

                if (newList.length === list.length) return message.reply("Bu değer listede bulunamadı.");
            }

            if (key.includes('.')) {
                const [mainKey, ...rest] = key.split('.');
                await ConfigManager.updateNested(mainKey, rest.join('.'), newList, message.author.tag);
            } else {
                await ConfigManager.set(key, newList, message.author.tag);
            }

            if (value.toLowerCase() === "all" || value.toLowerCase() === "hepsi") {
                return message.reply(`${ConfigManager.get("Emojis.toji_onay") || "✨"} **${key}** listesi tamamen temizlendi ve **anında aktif edildi**.`);
            } else {
                return message.reply(`${ConfigManager.get("Emojis.toji_onay") || "✨"} **${key}** listesinden çıkarıldı: \`${value}\`. Güncel ayarlar **anında aktif edildi**.`);
            }
        }

        return message.reply("Geçersiz işlem.");
    }
};

