const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const RiotManager = require("../../Core/Handlers/RiotManager");
const RiotAccount = require("../../Core/Database/RiotAccount");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

const REQUIRED_ICON_ID = 7;
const REQUIRED_VALO_CARD_ID = "9fb348bc-41a0-91ad-8a3e-818035c4e561";
const REQUIRED_VALO_TITLE_ID = "d13e579c-435e-44d4-cec2-6eae5a3c5ed4";

const apiCooldowns = new Map();
function checkCooldown(key, seconds) {
    const now = Date.now();
    const expiry = apiCooldowns.get(key);
    if (expiry && now < expiry) return Math.ceil((expiry - now) / 1000);
    apiCooldowns.set(key, now + seconds * 1000);
    return 0;
}

module.exports = async (interaction) => {
    const { customId, user } = interaction;
    if (!customId) return;

    if (interaction.isStringSelectMenu() && customId === "game_select_platform") {
        const selected = interaction.values[0];
        const gameType = selected.replace("game_", "");

        const existingAcc = await RiotAccount.findOne({ userId: user.id, gameType, isVerified: true });
        if (existingAcc) {
            return interaction.reply({ content: `⚠️ Lütfen sistemde devam etmeden önce **${gameType === "lol" ? "League of Legends" : "VALORANT"}** hesabınızın bağlantısını "Hesaplarım" butonu üzerinden kesin.`, ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_${selected}`)
            .setTitle(selected === "game_lol" ? "League of Legends Bağla" : "VALORANT Bağla");

        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId("riot_id_input")
                .setLabel("Riot ID (İsim#Etiket)")
                .setPlaceholder("Örn: Oyuncu#TR1")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ));

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && customId.startsWith("modal_game_")) {
        const gameType = customId.replace("modal_game_", "");
        const riotId = interaction.fields.getTextInputValue("riot_id_input");

        if (!riotId.includes("#")) {
            return await interaction.reply({ content: "Hata: Adınızı **İsim#Etiket** formatında girmelisiniz.", ephemeral: true });
        }

        const cd = checkCooldown(`${user.id}_get_account`, 10);
        if (cd > 0) return interaction.reply({ content: `⏳ Çok hızlı işlem yapıyorsunuz. Riot API rate-limit sınırına takılmamak için lütfen **${cd} saniye** bekleyin.`, ephemeral: true });

        const [gameName, tagLine] = riotId.split("#");
        const account = await RiotManager.getAccountInfo(gameName, tagLine);
        if (account === "RATE_LIMIT") {
            return await interaction.reply({ content: "⚠️ Riot sunucuları şu an çok yoğun (Rate Limit aşıldı). Lütfen 1-2 dakika bekleyip tekrar deneyin.", ephemeral: true });
        }

        if (!account) {
            return await interaction.reply({ content: "Hata: Riot sistemlerinde bu ID'ye ait hesap bulunamadı.", ephemeral: true });
        }

        await RiotAccount.findOneAndUpdate(
            { userId: user.id, gameType: gameType },
            { puuid: account.puuid, gameName: account.gameName, tagLine: account.tagLine, riotId: `${account.gameName}#${account.tagLine}`, isVerified: false },
            { upsert: true }
        );

        const emojis = ConfigManager.get("Emojis") || {};
        const onayId = (emojis.toji_onay?.match(/\d+/) || [""])[0];
        const infoEmoji = emojis.toji_info || "📌";
        const lolEmoji = emojis.riot_lol || "🛡️";
        const valoEmoji = emojis.riot_valo || "🔫";

        if (gameType === "lol") {
            const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${REQUIRED_ICON_ID}.jpg`;
            const componentsV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: { type: 11, media: { url: iconUrl } },
                            components: [
                                { type: 10, content: `## ${lolEmoji} Hesabını Doğrulama Zamanı!\n\`${account.gameName}#${account.tagLine}\` hesabını başarıyla bulduk. Sistemimize entegre edebilmemiz için küçük bir güvenlik adımımız var.` }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `### ${infoEmoji} Adım Adım Doğrulama\n1. **League of Legends** istemcisini açın.\n2. Profilinize girip **Simgeler** bölümünü açın.\n3. Yan tarafta görseli bulunan **Klasik Gül (Rose)** avatarını bularak profil simgeniz yapın.\n4. Kaydettikten sonra aşağıdaki butona tıklayın!\n\n> *Not: İşlem sonrası avatarınızı dilediğiniz gibi değiştirebilirsiniz. (API güncellemesi biraz zaman alabilir, hata alırsanız bekleyip tekrar basın)*`
                        },
                        {
                            type: 1,
                            components: [{ type: 2, custom_id: "verify_lol_avatar", label: "Hesabımı Doğrula!", style: 3, emoji: onayId ? { id: onayId } : undefined }]
                        }
                    ]
                }
            ];
            await interaction.reply({ components: componentsV2, flags: [MessageFlags.IsComponentsV2], ephemeral: true });
        }
        else if (gameType === "valo") {
            const cardUrl = `https://media.valorant-api.com/playercards/${REQUIRED_VALO_CARD_ID}/largeart.png`;
            const componentsV2 = [
                {
                    type: 17,
                    components: [
                        {
                            type: 9,
                            accessory: { type: 11, media: { url: cardUrl } },
                            components: [
                                { type: 10, content: `## ${valoEmoji} Hesabını Doğrulama Zamanı!\n\`${account.gameName}#${account.tagLine}\` hesabını başarıyla bulduk. Sistemimize entegre edebilmemiz için küçük bir güvenlik adımımız var.` }
                            ]
                        },
                        { type: 14, divider: true, spacing: 1 },
                        {
                            type: 10,
                            content: `### ${infoEmoji} Adım Adım Doğrulama\n1. **VALORANT** oyununa giriş yapın.\n2. **Koleksiyon** sekmesine girip **Oyuncu Kartı** bölümünden standart **VALORANT Kartı**'nı kuşanın.\n3. **Ünvanlar** bölümüne girip **"Ünvan Yok"** seçeneğini işaretli bırakın.\n4. **Önemli:** Kart ve ünvan değişikliğinin API'ye yansıması için herhangi bir modda **1 maç** tamamlamanız gerekmektedir.\n5. İşlemleri tamamladıktan sonra aşağıdaki butona tıklayın!\n\n> *Not: Doğrulamadan sonra kartınızı/ünvanınızı eski haline getirebilirsiniz. (Hata alırsanız ve maçı tamamladıysanız 15-20 saniye bekleyip tekrar basın)*`
                        },
                        {
                            type: 1,
                            components: [{ type: 2, custom_id: "verify_valo_card", label: "Hesabımı Doğrula!", style: 3, emoji: onayId ? { id: onayId } : undefined }]
                        }
                    ]
                }
            ];
            await interaction.reply({ components: componentsV2, flags: [MessageFlags.IsComponentsV2], ephemeral: true });
        }
    }

    if (customId === "verify_lol_avatar") {
        const cd = checkCooldown(`${user.id}_verify_lol`, 5);
        if (cd > 0) return interaction.reply({ content: `⏳ Doğrulama işlemlerini çok hızlı yapıyorsunuz. Lütfen **${cd} saniye** daha bekleyip tekrar deneyin.`, ephemeral: true });

        await interaction.deferUpdate(); 
        const acc = await RiotAccount.findOne({ userId: user.id, gameType: "lol" });
        if (!acc) return await interaction.followUp({ content: "Veritabanında kayıt bulunamadı.", ephemeral: true });

        const currentIconId = await RiotManager.getSummonerIconId(acc.puuid);
        if (currentIconId === "RATE_LIMIT") return interaction.followUp({ content: "⚠️ Riot sunucuları şu an çok yoğun (Rate Limit). Lütfen 1-2 dakika bekleyip tekrar deneyiniz.", ephemeral: true });

        if (currentIconId === REQUIRED_ICON_ID) {
            await RiotAccount.updateOne({ userId: user.id, gameType: "lol" }, { isVerified: true });
            return await showAccountsPanel(interaction, user);
        } else {
            const wrongIconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${currentIconId}.jpg`;
            const comp = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: wrongIconUrl } },
                        components: [{ type: 10, content: `### ❌ Doğrulama Başarısız!\nSistemde güncel olarak tespit edilen profil simgeniz yanda görülmektedir (ID: \`${currentIconId}\`).\nLütfen **Klasik Gül** simgesini (ID: \`${REQUIRED_ICON_ID}\`) seçtiğinizden emin olun.\n\n*(Eğer değiştirdiyseniz Riot sunucularının güncellenmesi 10-30 saniye sürebilir, lütfen bekleyip tekrar butona basın.)*` }]
                    }
                ]
            }];
            return await interaction.followUp({ components: comp, flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }
    }

    if (customId === "verify_valo_card") {
        const cd = checkCooldown(`${user.id}_verify_valo`, 10);
        if (cd > 0) return interaction.reply({ content: `⏳ API limitlerini korumak için lütfen doğrulama işlemleriniz arasında **${cd} saniye** bekleyin.`, ephemeral: true });

        await interaction.deferUpdate();
        const acc = await RiotAccount.findOne({ userId: user.id, gameType: "valo" });
        if (!acc) return await interaction.followUp({ content: "Veritabanında kayıt bulunamadı.", ephemeral: true });

        const playerInfo = await RiotManager.getValoPlayerCard(acc.gameName, acc.tagLine);
        if (playerInfo === "RATE_LIMIT") return interaction.followUp({ content: "⚠️ API sunucuları şu an API limitinden dolayı işlem yapamıyor (Rate Limit). Lütfen 1-2 dakika bekleyip tekrar deneyiniz.", ephemeral: true });

        if (playerInfo && playerInfo.card === REQUIRED_VALO_CARD_ID && playerInfo.title === REQUIRED_VALO_TITLE_ID) {
            await RiotAccount.updateOne({ userId: user.id, gameType: "valo" }, { isVerified: true });
            return await showAccountsPanel(interaction, user);
        } else {
            const wrongCardUrl = playerInfo && playerInfo.card ? `https://media.valorant-api.com/playercards/${playerInfo.card}/smallart.png` : "https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/smallart.png";
            const currentId = playerInfo ? playerInfo.card : "Bilinmiyor";
            const currentTitle = playerInfo ? playerInfo.title : "Bilinmiyor";

            const comp = [{
                type: 17,
                components: [
                    {
                        type: 9,
                        accessory: { type: 11, media: { url: wrongCardUrl } },
                        components: [{ type: 10, content: `### ❌ Doğrulama Başarısız!\nSistemde takılı olarak tespit edilen güncel oyuncu kartınız yanda görülmektedir (ID: \`${currentId}\`). (Ünvan ID: \`${currentTitle}\`)\n\nLütfen ayarlardan **Standart VALORANT Kartını** KUŞANDIĞINIZDAN ve Ünvan Olarak **"Ünvan Yok"** SEÇTİĞİNİZDEN emin olun.\n\n**Ayrıca:** Değişiklikleri yaptıktan sonra API'nin güncellenmesi için herhangi bir modda **1 maç** oynamış olmanız gerekmektedir.\n\n*(Eğer bunları yaptıysanız Riot sunucularının güncellenmesi biraz zaman alabilir, bekleyip tekrar deneyin.)*` }]
                    }
                ]
            }];
            return await interaction.followUp({ components: comp, flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] });
        }
    }

    if (customId === "game_manage_accounts") {
        return await showAccountsPanel(interaction, user);
    }

    if (customId.startsWith("disconnect_game_")) {
        const typeToRemove = customId.replace("disconnect_game_", "");
        await RiotAccount.deleteOne({ userId: user.id, gameType: typeToRemove });
        return await showAccountsPanel(interaction, user);
    }
};

async function showAccountsPanel(interaction, user) {
    const emojis = ConfigManager.get("Emojis") || {};
    const trashId = (emojis.riot_trash?.match(/\d+/) || [""])[0];
    const clipboardId = (emojis.riot_clipboard?.match(/\d+/) || [""])[0];

    const verifiedAccounts = await RiotAccount.find({ userId: user.id, isVerified: true });

    if (verifiedAccounts.length === 0) {
        const emptyMsg = {
            components: [{
                type: 17,
                components: [
                    { type: 10, content: `## ${emojis.riot_clipboard || "📋"} Bağlı Hesaplarınız\n\nSisteme bağlı ve doğrulanmış hiçbir oyun hesabınız bulunmuyor. Yeni bir hesap bağlamak için ana menüden seçim yapabilirsiniz.` }
                ]
            }],
            flags: [MessageFlags.IsComponentsV2]
        };

        if (interaction.deferred) return await interaction.editReply(emptyMsg);
        if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.message && interaction.message.flags && interaction.message.flags.has(MessageFlags.Ephemeral)) {
            return await interaction.update(emptyMsg);
        }
        return await interaction.reply({ ...emptyMsg, ephemeral: true });
    }

    let contentStr = `## ${emojis.riot_clipboard || "📋"} Yönetim Paneli\n\nAşağıda hesaplarınıza ait güncel bilgiler doğrultusunda oyun istatistikleriniz listelenmektedir:\n`;
    const actionComponents = [];

    for (const acc of verifiedAccounts) {
        if (acc.gameType === "lol") {
            const lol = await RiotManager.getLolRank(acc.puuid);
            const soloTier = lol && lol.solo !== "Unranked" ? lol.solo.split(" ")[0].toLowerCase() : "unranked";
            const flexTier = lol && lol.flex !== "Unranked" ? lol.flex.split(" ")[0].toLowerCase() : "unranked";

            const soloEmoji = emojis[`riot_lol_${soloTier}`] || emojis.riot_unranked || "";
            const flexEmoji = emojis[`riot_lol_${flexTier}`] || emojis.riot_unranked || "";

            contentStr += `\n### ${emojis.riot_lol || "⚔️"} League of Legends\n**Riot ID:** \`${acc.riotId}\`\n**Dereceli (Tek/Çift):** ${soloEmoji} \`${lol && lol.solo ? lol.solo : "Unranked"}\`\n**Dereceli (Esnek):** ${flexEmoji} \`${lol && lol.flex ? lol.flex : "Unranked"}\`\n`;

            actionComponents.push({
                type: 2,
                custom_id: "disconnect_game_lol",
                label: "LoL Hesabını Çıkar",
                style: 4,
                emoji: trashId ? { id: trashId } : undefined
            });
        } else if (acc.gameType === "valo") {
            const valo = await RiotManager.getValoRank(acc.gameName, acc.tagLine);
            const valoTier = valo && valo.tier !== "Unrated" ? valo.tier.split(" ")[0].toLowerCase() : "unranked";
            const valoEmoji = emojis[`riot_valo_${valoTier}`] || emojis.riot_unranked || "";

            contentStr += `\n### ${emojis.riot_valo || "🔫"} VALORANT\n**Riot ID:** \`${acc.riotId}\`\n**Mevcut Kademe:** ${valoEmoji} \`${valo ? valo.tier : "Unranked"}\`\n`;

            actionComponents.push({
                type: 2,
                custom_id: "disconnect_game_valo",
                label: "Valorant Hesabını Çıkar",
                style: 4,
                emoji: trashId ? { id: trashId } : undefined
            });
        }
    }

    const componentsV2 = [{
        type: 17,
        components: [
            { type: 10, content: contentStr },
            { type: 14, divider: true, spacing: 1 },
            {
                type: 1,
                components: actionComponents
            }
        ]
    }];

    if (interaction.deferred) {
        await interaction.editReply({ components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    } else if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.message && interaction.message.flags && interaction.message.flags.has(MessageFlags.Ephemeral)) {
        await interaction.update({ components: componentsV2, flags: [MessageFlags.IsComponentsV2] });
    } else {
        await interaction.reply({ components: componentsV2, flags: [MessageFlags.IsComponentsV2], ephemeral: true });
    }
}
