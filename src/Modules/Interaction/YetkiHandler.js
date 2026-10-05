const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, RoleSelectMenuBuilder, LabelBuilder } = require("discord.js");
const StaffUser = require("../../Core/Database/StaffUser");
const TaskSettings = require("../../Core/Database/TaskSettings");
const StaffRoleSystem = require("../../Core/Database/StaffRoleSystem");
const StaffGlobalSettings = require("../../Core/Database/StaffGlobalSettings");
const RatingManager = require("../../Core/Handlers/RatingManager");
const MandatoryTaskConfig = require("../../Core/Database/MandatoryTaskConfig");
const ConfigManager = require("../../Core/Handlers/ConfigManager");
const TaskManager = require("../../Core/Handlers/TaskManager");
const moment = require("moment");

const xpmultTempCache = new Map(); 

async function sendPanelUpdate(interaction, mainText, detailSections, buttonRows = [], selectRows = []) {
    const MAX_TEXT = 3500;

    let firstComponents = [{ type: 10, content: mainText }];
    let firstLen = mainText.length;
    let overflowSections = [];

    for (const section of detailSections) {
        if (!section) continue;
        if (firstLen + section.length + 10 <= MAX_TEXT) {
            firstComponents.push({ type: 14, divider: true, spacing: 1 });
            firstComponents.push({ type: 10, content: section });
            firstLen += section.length;
        } else {
            overflowSections.push(section);
        }
    }

    const components = [{ type: 17, components: firstComponents }];
    for (const row of selectRows) components.push(row);
    for (const row of buttonRows) components.push(row);

    const updatePayload = {
        embeds: [],
        components: components,
        flags: MessageFlags.IsComponentsV2
    };

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(updatePayload).catch(() => { });
    } else {
        await interaction.update(updatePayload).catch(() => { });
    }

    if (overflowSections.length > 0) {
        let currentComponents = [];
        let currentLen = 0;

        for (const section of overflowSections) {
            const lines = section.split("\n");
            for (const line of lines) {
                if (currentLen + line.length + 1 > MAX_TEXT && currentComponents.length > 0) {
                    await interaction.followUp({
                        components: [{ type: 17, components: [...currentComponents] }],
                        flags: MessageFlags.IsComponentsV2,
                        ephemeral: true
                    }).catch(() => { });
                    currentComponents = [];
                    currentLen = 0;
                }
                if (currentComponents.length === 0 || currentComponents[currentComponents.length - 1].type !== 10) {
                    currentComponents.push({ type: 10, content: line });
                    currentLen += line.length;
                } else {
                    currentComponents[currentComponents.length - 1].content += "\n" + line;
                    currentLen += line.length + 1;
                }
            }
        }

        if (currentComponents.length > 0) {
            await interaction.followUp({
                components: [{ type: 17, components: currentComponents }],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            }).catch(() => { });
        }
    }
}

const handleInteraction = async (interaction) => {
    try {
        if (!interaction.guild) return;
        const emojis = ConfigManager.get("Emojis") || {};
        const responsibilityMap = {
            "partner": { role: "1396095724155830352", leader: "1396095723195465821", name: "Partner Yetkilisi" },
            "sohbet": { role: "1398046416902951074", leader: "1404782430367514624", name: "Sohbet Yetkilisi" },
            "ses": { role: "1398046411110481981", leader: "1404782642238586940", name: "Ses Yetkilisi" },
            "etkinlik": { role: "1396095733345681490", leader: "1404781988422094898", name: "Etkinlik Yetkilisi" }
        };

        if (interaction.isStringSelectMenu()) {



            if (interaction.customId === "global_stretch_delete_select") {
                const planName = interaction.values[0];
                await StaffGlobalSettings.findOneAndUpdate({ guildID: interaction.guild.id }, { $pull: { stretchPlans: { name: planName } } });
                interaction.reply({ content: "Plan silindi.", flags: MessageFlags.Ephemeral });
                interaction.customId = "panel_global_stretch";
                return handleInteraction(interaction);
            }

            if (interaction.customId === "global_xpmult_delete_select") {
                const roleID = interaction.values[0];
                await StaffGlobalSettings.findOneAndUpdate({ guildID: interaction.guild.id }, { $pull: { xpMultipliers: { roleID } } });
                interaction.reply({ content: "Çarpan silindi.", flags: MessageFlags.Ephemeral });
                interaction.customId = "panel_global_xpmult";
                return handleInteraction(interaction);
            }

            if (interaction.customId.startsWith("rd_stretch_plans_select_")) {
                const rankID = interaction.customId.replace("rd_stretch_plans_select_", "");
                const planName = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`submit_plan_modifier_${rankID}_${planName}`).setTitle(`${planName} Esnetmesi`);
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("percentage").setLabel("Yüzde Miktarı (%)").setPlaceholder("Örn: -20").setStyle(TextInputStyle.Short).setRequired(true)
                ));
                return interaction.showModal(modal);
            }

            if (interaction.customId === "rd_mdt_select") {
                const parts = interaction.values[0].split("_");
                const type = parts[3], rid = parts[4];
                const titleMap = { weeks: "Atlama Şartı (Süre)", voice: "Ses Hedefi", pubvoice: "Public Ses", message: "Mesaj Hedefi", invite: "Davet Hedefi", serverxp: "Sunucu İşleri Limiti" };
                const modal = new ModalBuilder().setCustomId(`mdt_modal_${type}_${rid}`).setTitle(titleMap[type]);
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("goal_value").setLabel("Giriş yapınız.").setStyle(TextInputStyle.Short).setRequired(true)));
                return interaction.showModal(modal);
            }

            if (interaction.customId === "rank_detail_main_select") {
                const rankID = interaction.values[0];
                return showRankDetail(interaction, rankID);
            }

            if (interaction.customId === "select_modifier_mandatory") {
                const rankRoleID = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`submit_modifier_mandatory_${rankRoleID}`).setTitle("Görev Esnetmesi");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("change").setLabel("% Değerini Girin.").setStyle(TextInputStyle.Short).setRequired(true)));
                return interaction.showModal(modal);
            }
        }

        if (interaction.isRoleSelectMenu()) {
            const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id }) || new StaffGlobalSettings({ guildID: interaction.guild.id });

            if (interaction.customId === "global_stretch_plan_role_select") {
                const roleIDs = interaction.values;
                const planName = xpmultTempCache.get(`${interaction.user.id}_stretch_name`);
                if (!planName) return interaction.reply({ content: "İsim bulunamadı.", flags: MessageFlags.Ephemeral });
                settings.stretchPlans = (settings.stretchPlans || []).filter(p => p.name !== planName);
                settings.stretchPlans.push({ name: planName, roleIDs });
                await settings.save();
                xpmultTempCache.delete(`${interaction.user.id}_stretch_name`);

                const plans = settings.stretchPlans || [];
                const planLines = plans.map(p => `> **${p.name}** → ${p.roleIDs.length} rol`).join("\n") || "-# Henüz plan tanımlanmamış.";

                return interaction.update({
                    components: [{
                        type: 17,
                        components: [
                            { type: 10, content: `## ${emojis.toji_info || "🛠️"} Global Esnetme Planları\n**${planName}** planı kaydedildi.\n\n${planLines}` },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 1,
                                components: [
                                    { type: 2, custom_id: "global_stretch_add_plan_btn", label: "Plan Ekle", style: 3 },
                                    { type: 2, custom_id: "global_stretch_remove_plan_btn", label: "Plan Sil", style: 4, disabled: plans.length === 0 },
                                    { type: 2, custom_id: "panel_main", label: "← Ana Menü", style: 2 }
                                ]
                            }
                        ]
                    }],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => { });
            }

            if (interaction.customId === "global_xpmult_role_select") {
                xpmultTempCache.set(interaction.user.id, interaction.values);
                return interaction.update({
                    components: [{ type: 17, components: [{ type: 10, content: `## ${emojis.toji_sparkly || "✨"} Miktar Belirle\n**${interaction.values.length}** rol seçildi.` }, { type: 1, components: [{ type: 2, custom_id: `global_xpmult_set_amount_btn`, label: "Çarpan Miktarını Gir", style: 3 }, { type: 2, custom_id: "global_xpmult_add_btn", label: "← Geri", style: 2 }] }] }],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (interaction.customId.startsWith("global_resp_select_")) {
                const menuNum = interaction.customId.split("_").pop();
                const selected = interaction.values;
                const currentRoles = settings.responsibilityRoles || [];
                let combined = (menuNum === "1") ? [...new Set([...selected, ...currentRoles.slice(25)])] : [...new Set([...currentRoles.slice(0, 25), ...selected])];
                await StaffGlobalSettings.findOneAndUpdate({ guildID: interaction.guild.id }, { $set: { responsibilityRoles: combined } }, { upsert: true });

                const updatedRoles = combined;
                const part1 = updatedRoles.slice(0, 25);
                const part2 = updatedRoles.slice(25, 50);

                return interaction.update({
                    components: [{
                        type: 17,
                        components: [
                            { type: 10, content: `## ${emojis.toji_bluestar || "⭐"} Global Sorumluluklar\nSorumluluklar güncellendi.\n\n-# Seçili Roller (${updatedRoles.length}): ${updatedRoles.length > 0 ? updatedRoles.map(id => `<@&${id}>`).join(" ") : "Henüz rol seçilmedi."}` },
                            { type: 14, divider: true, spacing: 1 },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 6,
                                        custom_id: "global_resp_select_1",
                                        placeholder: "Grup 1 (Maks 25)",
                                        min_values: 0,
                                        max_values: 25,
                                        default_values: part1.map(id => ({ id, type: "role" }))
                                    }
                                ]
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 6,
                                        custom_id: "global_resp_select_2",
                                        placeholder: "Grup 2 (Maks 25)",
                                        min_values: 0,
                                        max_values: 25,
                                        default_values: part2.map(id => ({ id, type: "role" }))
                                    }
                                ]
                            },
                            {
                                type: 1,
                                components: [{ type: 2, custom_id: "panel_main", label: "← Ana Menü", style: 2 }]
                            }
                        ]
                    }],
                    flags: MessageFlags.IsComponentsV2
                }).catch(() => { });
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === "global_stretch_create_modal") {
                const name = interaction.fields.getTextInputValue("name");
                xpmultTempCache.set(`${interaction.user.id}_stretch_name`, name);
                return interaction.reply({
                    components: [{ type: 17, components: [{ type: 10, content: `## ${emojis.toji_sparkly || "✨"} Rolleri Seç\n**${name}** planı için rolleri seçin.` }, { type: 1, components: [{ type: 6, custom_id: "global_stretch_plan_role_select", placeholder: "Rolleri seçin...", min_values: 1, max_values: 25 }] }] }],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            if (interaction.customId.startsWith("mdt_modal_")) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const parts = interaction.customId.split("_");
                const type = parts[2], roleID = parts[3];
                const val = parseInt(interaction.fields.getTextInputValue("goal_value"));
                if (isNaN(val)) return interaction.editReply({ content: "Sayı girin." });
                if (type === "weeks") { await StaffRoleSystem.findOneAndUpdate({ guildID: interaction.guild.id, roleID }, { $set: { mandatoryWeeks: val } }); }
                else if (type === "serverxp") { await StaffRoleSystem.findOneAndUpdate({ guildID: interaction.guild.id, roleID }, { $set: { maxServerXP: val } }); }
                else { const field = { voice: "voiceGoal", pubvoice: "publicVoiceGoal", message: "messageGoal", invite: "inviteGoal" }[type]; await MandatoryTaskConfig.findOneAndUpdate({ guildID: interaction.guild.id, rankRoleID: roleID }, { $set: { [field]: val } }, { upsert: true }); }
                return interaction.editReply({ content: "Güncellendi." });
            }

            if (interaction.customId.startsWith("submit_plan_modifier_")) {
                const parts = interaction.customId.replace("submit_plan_modifier_", "").split("_");
                const rankID = parts[0], planName = parts.slice(1).join("_");
                const percentage = parseInt(interaction.fields.getTextInputValue("percentage").replace("%", ""));
                const rank = await StaffRoleSystem.findById(rankID);
                if (rank) {
                    const mdtConfig = await MandatoryTaskConfig.findOne({ guildID: interaction.guild.id, rankRoleID: rank.roleID }) || new MandatoryTaskConfig({ guildID: interaction.guild.id, rankRoleID: rank.roleID });
                    mdtConfig.planModifiers = (mdtConfig.planModifiers || []).filter(p => p.planName !== planName);
                    mdtConfig.planModifiers.push({ planName, percentage });
                    await mdtConfig.save();
                }
                return interaction.reply({ content: "Esnetme kaydedildi.", flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId.startsWith("submit_modifier_mandatory_")) {
                const rankRoleID = interaction.customId.replace("submit_modifier_mandatory_", "");
                const val = parseInt(interaction.fields.getTextInputValue("change").replace("%", ""));
                await MandatoryTaskConfig.findOneAndUpdate({ guildID: interaction.guild.id, rankRoleID }, { $set: { stretchPercentage: val } }, { upsert: true });
                return interaction.reply({ content: "Kaydedildi.", flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === "submit_global_xpmult") {
                const roleIDs = xpmultTempCache.get(interaction.user.id);
                if (!roleIDs) return interaction.reply({ content: "Zaman aşımı.", flags: MessageFlags.Ephemeral });
                const multiplier = parseFloat(interaction.fields.getTextInputValue("multiplier").replace(",", "."));
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id }) || new StaffGlobalSettings({ guildID: interaction.guild.id });
                settings.xpMultipliers = (settings.xpMultipliers || []).filter(m => !roleIDs.includes(m.roleID));
                roleIDs.forEach(rID => settings.xpMultipliers.push({ roleID: rID, multiplier }));
                await settings.save();
                xpmultTempCache.delete(interaction.user.id);
                return interaction.reply({ content: "Çarpanlar kaydedildi.", flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId.startsWith("rd_tl_unified_modal_")) {
                const rankID = interaction.customId.replace("rd_tl_unified_modal_", "");
                const taskField = interaction.fields.fields.get("task_id");
                const taskID = taskField?.values?.[0] || taskField?.value;
                const limit = parseInt(interaction.fields.getTextInputValue("limit_count"));
                const stretchRaw = interaction.fields.getTextInputValue("stretch_limit");
                const stretchLimit = stretchRaw ? parseInt(stretchRaw) : 0;
                const rank = await StaffRoleSystem.findById(rankID);
                const task = await TaskSettings.findById(taskID);
                if (rank && task) {
                    task.roleLimits = (task.roleLimits || []).filter(rl => rl.roleID !== rank.roleID);
                    if (limit > 0) task.roleLimits.push({ roleID: rank.roleID, limitCount: limit, stretchLimit: stretchLimit || 0 });
                    await task.save();
                }
                return interaction.reply({ content: `Limit: ${limit} | Esneme: ${stretchLimit || "Yok"} olarak ayarlandı.`, flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId.startsWith("resp_modal_")) {
                const rankID = interaction.customId.replace("resp_modal_", "");
                const lim = parseInt(interaction.fields.getTextInputValue("limit"));
                const pen = parseFloat(interaction.fields.getTextInputValue("penalty").replace(",", "."));
                await StaffRoleSystem.findByIdAndUpdate(rankID, { $set: { responsibilityLimit: lim, responsibilityPenalty: pen } });
                return interaction.reply({ content: "Ayarlar kaydedildi.", flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId.startsWith("xpmult_modal_")) {
                const rankID = interaction.customId.replace("xpmult_modal_", "");
                const field = interaction.fields.fields.get("role_id");
                const roleID = field?.values?.[0] || field?.value;
                const mult = parseFloat(interaction.fields.getTextInputValue("multiplier").replace(",", "."));
                const rank = await StaffRoleSystem.findById(rankID);
                if (rank && roleID) {
                    rank.xpMultiplierRoles = (rank.xpMultiplierRoles || []).filter(mr => mr.roleID !== roleID);
                    rank.xpMultiplierRoles.push({ roleID, multiplier: mult });
                    await rank.save();
                }
                return interaction.reply({ content: "Çarpan eklendi.", flags: MessageFlags.Ephemeral });
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith("rd_refresh_")) {
                const rankID = interaction.customId.replace("rd_refresh_", "");
                return showRankDetail(interaction, rankID);
            }
            if (interaction.customId === "panel_rank_detail") {
                const allRanks = await StaffRoleSystem.find({ guildID: interaction.guild.id, active: true }).sort({ requiredXP: 1 });
                const options = allRanks.map(r => ({ label: r.rankName || "Bilinmiyor", value: r._id.toString() }));
                return sendPanelUpdate(interaction, `## ${emojis.toji_sparkly || "✨"} Rütbe Profili`, ["Seçiniz:"], [{ type: 1, components: [{ type: 2, custom_id: "panel_main", label: "← Ana Menü", style: 2 }] }], [{ type: 1, components: [{ type: 3, custom_id: "rank_detail_main_select", options: options.slice(0, 25) }] }]);
            }
            if (interaction.customId === "panel_global_resp") {
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id }) || new StaffGlobalSettings({ guildID: interaction.guild.id });
                const currentRoles = settings.responsibilityRoles || [];
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## ${emojis.toji_bluestar || "⭐"} Global Sorumluluklar` }] },
                        { type: 1, components: [{ type: 6, custom_id: "global_resp_select_1", placeholder: "Grup 1", min_values: 0, max_values: 25, default_values: currentRoles.slice(0, 25).map(id => ({ id, type: "role" })) }] },
                        { type: 1, components: [{ type: 6, custom_id: "global_resp_select_2", placeholder: "Grup 2", min_values: 0, max_values: 25, default_values: currentRoles.slice(25, 50).map(id => ({ id, type: "role" })) }] },
                        { type: 1, components: [{ type: 2, custom_id: "panel_main", label: "← Ana Menü", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            if (interaction.customId === "panel_global_stretch") {
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id }) || new StaffGlobalSettings({ guildID: interaction.guild.id });
                const plans = settings.stretchPlans || [];
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## ${emojis.toji_info || "🛠️"} Global Esnetme Planları\n${plans.map(p => `> **${p.name}**`).join("\n") || "Plan yok."}` }] },
                        { type: 1, components: [{ type: 2, custom_id: "global_stretch_add_plan_btn", label: "Plan Ekle", style: 3 }, { type: 2, custom_id: "global_stretch_remove_plan_btn", label: "Plan Sil", style: 4, disabled: plans.length === 0 }, { type: 2, custom_id: "panel_main", label: "← Ana Menü", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            if (interaction.customId === "global_stretch_add_plan_btn") {
                const modal = new ModalBuilder().setCustomId("global_stretch_create_modal").setTitle("Yeni Esnetme Planı");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("name").setLabel("Plan İsmi").setStyle(TextInputStyle.Short).setRequired(true)));
                return interaction.showModal(modal);
            }
            if (interaction.customId === "global_stretch_remove_plan_btn") {
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id });
                const plans = settings?.stretchPlans || [];
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## Plan Sil` }] },
                        { type: 1, components: [{ type: 3, custom_id: "global_stretch_delete_select", placeholder: "Seçiniz...", options: plans.map(p => ({ label: p.name, value: p.name })).slice(0, 25) }] },
                        { type: 1, components: [{ type: 2, custom_id: "panel_global_stretch", label: "← Geri", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            if (interaction.customId === "panel_global_xpmult") {
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id }) || new StaffGlobalSettings({ guildID: interaction.guild.id });
                const multis = settings.xpMultipliers || [];
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## ${emojis.toji_sparkly || "✨"} Global XP Çarpanları\n${multis.map(m => `> <@&${m.roleID}> → x${m.multiplier}`).join("\n") || "Tanım yok."}` }] },
                        { type: 1, components: [{ type: 2, custom_id: "global_xpmult_add_btn", label: "Çarpan Ekle", style: 3 }, { type: 2, custom_id: "global_xpmult_remove_btn", label: "Çarpan Sil", style: 4, disabled: multis.length === 0 }, { type: 2, custom_id: "panel_main", label: "← Ana Menü", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            if (interaction.customId === "global_xpmult_add_btn") {
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## Rol Seçimi` }] },
                        { type: 1, components: [{ type: 6, custom_id: "global_xpmult_role_select", placeholder: "Seçiniz...", min_values: 1, max_values: 25 }] },
                        { type: 1, components: [{ type: 2, custom_id: "panel_global_xpmult", label: "← Geri", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            if (interaction.customId === "global_xpmult_set_amount_btn") {
                const modal = new ModalBuilder().setCustomId(`submit_global_xpmult`).setTitle("XP Çarpanı");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("multiplier").setLabel("Çarpan (Örn: 1.5)").setStyle(TextInputStyle.Short).setRequired(true)));
                return interaction.showModal(modal);
            }
            if (interaction.customId === "global_xpmult_remove_btn") {
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id });
                const multis = settings?.xpMultipliers || [];
                const options = multis.map(m => ({ label: interaction.guild.roles.cache.get(m.roleID)?.name || m.roleID, value: m.roleID, description: `x${m.multiplier}` })).slice(0, 25);
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## Çarpan Sil` }] },
                        { type: 1, components: [{ type: 3, custom_id: "global_xpmult_delete_select", placeholder: "Seçiniz...", options }] },
                        { type: 1, components: [{ type: 2, custom_id: "panel_global_xpmult", label: "← Geri", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            if (interaction.customId.startsWith("rd_stretch_btn_")) {
                const rankID = interaction.customId.replace("rd_stretch_btn_", "");
                const rank = await StaffRoleSystem.findById(rankID);
                const modal = new ModalBuilder().setCustomId(`submit_modifier_mandatory_${rank.roleID}`).setTitle("Görev Esnetmesi");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("change").setLabel("% Oranı").setPlaceholder("Örn: -20").setStyle(TextInputStyle.Short).setRequired(true)));
                return interaction.showModal(modal);
            }
            if (interaction.customId === "panel_modifier_limits") {
                const all = await MandatoryTaskConfig.find({ guildID: interaction.guild.id });
                const lines = all.flatMap(c => (c.roleModifiers || []).map(m => `> <@&${c.rankRoleID}> → <@&${m.roleID}>: ${m.modifierValue}%`));
                return sendPanelUpdate(interaction, `## Esnetmeler`, [lines.join("\n") || "Tanım yok."], [{ type: 1, components: [{ type: 2, custom_id: "view_modifier_mandatory_goal", label: "Ekle", style: 1 }, { type: 2, custom_id: "panel_main", label: "← Geri", style: 2 }] }]);
            }
            if (interaction.customId === "view_modifier_mandatory_goal") {
                const ranks = await StaffRoleSystem.find({ guildID: interaction.guild.id });
                return interaction.update({ components: [{ type: 17, components: [{ type: 10, content: "Rütbe seçin:" }, { type: 1, components: [{ type: 3, custom_id: "select_modifier_mandatory", options: ranks.map(r => ({ label: r.rankName || r.roleID, value: r.roleID })).slice(0, 25) }] }] }] });
            }
            if (interaction.customId.startsWith("rd_tl_btn_")) {
                const rankID = interaction.customId.replace("rd_tl_btn_", "");
                const tasks = await TaskSettings.find({ guildID: interaction.guild.id, active: true });
                const options = tasks.map(t => ({ label: t.taskName.substring(0, 50), value: t._id.toString() })).slice(0, 25);
                const modal = new ModalBuilder().setCustomId(`rd_tl_unified_modal_${rankID}`).setTitle("Görev Limiti");
                modal.addComponents(
                    new LabelBuilder().setLabel("Görev").setStringSelectMenuComponent(new StringSelectMenuBuilder().setCustomId("task_id").setPlaceholder("Seçiniz...").addOptions(options).setMinValues(1)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("limit_count").setLabel("Ana Limit (Full XP)").setPlaceholder("Örn: 5").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("stretch_limit").setLabel("Esneme Limiti (Yarı XP, sonrası 0)").setPlaceholder("Örn: 30 (boş = esneme yok)").setStyle(TextInputStyle.Short).setRequired(false))
                );
                return interaction.showModal(modal);
            }
            if (interaction.customId.startsWith("xpmult_modal_btn_")) {
                const rankID = interaction.customId.replace("xpmult_modal_btn_", "");
                const modal = new ModalBuilder().setCustomId(`xpmult_modal_${rankID}`).setTitle("Çarpan Ekle");
                modal.addComponents(
                    new LabelBuilder().setLabel("Rol").setRoleSelectMenuComponent(new RoleSelectMenuBuilder().setCustomId("role_id").setPlaceholder("Seçiniz...")),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("multiplier").setLabel("Miktar").setStyle(TextInputStyle.Short).setRequired(true))
                );
                return interaction.showModal(modal);
            }
            if (interaction.customId.startsWith("resp_modal_btn_")) {
                const rankID = interaction.customId.replace("resp_modal_btn_", "");
                const rank = await StaffRoleSystem.findById(rankID);
                const modal = new ModalBuilder().setCustomId(`resp_modal_${rankID}`).setTitle("Sorumluluk");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("limit").setLabel("Limit").setValue(String(rank.responsibilityLimit || 0)).setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("penalty").setLabel("Ceza").setValue(String(rank.responsibilityPenalty || 0)).setStyle(TextInputStyle.Short).setRequired(true)));
                return interaction.showModal(modal);
            }
            if (interaction.customId.startsWith("rd_mdt_")) {
                const rid = interaction.customId.replace("rd_mdt_", "");
                const options = [
                    { label: "Hafta", value: `rd_mdt_modal_weeks_${rid}` },
                    { label: "Ses", value: `rd_mdt_modal_voice_${rid}` },
                    { label: "Public", value: `rd_mdt_modal_pubvoice_${rid}` },
                    { label: "Mesaj", value: `rd_mdt_modal_message_${rid}` },
                    { label: "Davet", value: `rd_mdt_modal_invite_${rid}` },
                    { label: "Sunucu İşi", value: `rd_mdt_modal_serverxp_${rid}` }
                ];
                return interaction.reply({ content: "Ayar seçin:", components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("rd_mdt_select").addOptions(options))], flags: MessageFlags.Ephemeral });
            }
            if (interaction.customId.startsWith("rd_stretch_plans_btn_")) {
                const rankID = interaction.customId.replace("rd_stretch_plans_btn_", "");
                const settings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id });
                const plans = settings?.stretchPlans || [];
                if (!plans.length) return interaction.reply({ content: "Plan yok.", flags: MessageFlags.Ephemeral });
                return interaction.update({
                    components: [
                        { type: 17, components: [{ type: 10, content: `## Plan Seçimi` }] },
                        { type: 1, components: [{ type: 3, custom_id: `rd_stretch_plans_select_${rankID}`, options: plans.map(p => ({ label: p.name, value: p.name })).slice(0, 25) }] },
                        { type: 1, components: [{ type: 2, custom_id: `rd_refresh_${rankID}`, label: "← Geri", style: 2 }] }
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }



            if (interaction.customId === "tasks_legend_btn") {
                const legendData = [{ e: "💬", n: "Mesaj" }, { e: "🔊", n: "Ses" }, { e: "📩", n: "Davet" }, { e: "🎫", n: "Ticket" }, { e: "👤", n: "Alım" }, { e: "🤝", n: "Partner" }, { e: "📅", n: "Etkinlik" }, { e: "🚀", n: "Bump" }, { e: "🗳️", n: "Oy" }, { e: "⭐", n: "Yorum" }, { e: "🔙", n: "Geri" }, { e: "🛠️", n: "Sorun" }, { e: "🎬", n: "Yayın" }];
                return interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [{ type: 17, components: [{ type: 10, content: `## İkonlar\n${legendData.map(d => `${d.e} ${d.n}`).join("\n")}` }] }]
                });
            }
            if (interaction.customId === "tasks_system_rules_btn") {
                return interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [{
                        type: 17,
                        components: [
                            { type: 10, content: `## ${emojis.toji_info || "🛠️"} Görev Limit Sistemi Nasıl Çalışır?\n\n> ### 1. Normal Limit (Tam XP)\n> Görevin ana limitine kadar yaptığınız her tamamlama size rütbenize göre belirlenen **Tam XP (+1.0x)** kazandırır.\n\n> ### 2. Esnetme Limiti (Yarı XP)\n> Ana limiti geçtiğinizde eğer rütbenize bir "Esneme Limiti" tanımlanmışsa, bu limite kadar olan tamamlamalarınızdan **Yarı XP (+0.5x)** kazanırsınız.\n\n> ### 3. Limit Geçimi (Sıfır XP)\n> Esneme limitini de doldurduğunuzda, o kategoride daha fazla görev yapsanız bile rütbe atlamanıza katkı sağlayacak **XP kazanamazsınız (x0.0)**.\n\n> ### 4. Yayın Dışı Ses Kesintisi\n> Sesli kanal görevlerinde vaktinizin %40'ından fazlasını public odalar dışında (özel odalar vb.) geçirirseniz, o görevden alacağınız XP otomatik olarak **yarıya (+0.5x)** düşer.` }
                        ]
                    }]
                });
            }

            if (interaction.customId.startsWith("tasks_current_limits_btn_")) {
                const targetID = interaction.customId.split("_").pop();
                const targetMember = await interaction.guild.members.fetch(targetID).catch(() => interaction.member);
                const userData = await StaffUser.findOne({ guildID: interaction.guild.id, userID: targetID });
                const taskIDs = userData?.activeTasks?.map(t => t.taskID) || [];
                const taskDefs = await TaskSettings.find({ _id: { $in: taskIDs } });

                let dynamicLimitText = "";
                if (taskDefs.length > 0) {
                    dynamicLimitText = `\n\n### 📋 <@${targetID}> Rütbe Limitleri\n`;
                    for (const task of taskDefs) {
                        let tLimit = task.limitCount || 0;
                        let sLimit = 0;
                        if (task.roleLimits) {
                            for (const rl of task.roleLimits) {
                                if (targetMember.roles.cache.has(String(rl.roleID))) {
                                    if (rl.limitCount > tLimit) {
                                        tLimit = rl.limitCount;
                                        sLimit = rl.stretchLimit || 0;
                                    }
                                }
                            }
                        }
                        dynamicLimitText += `> **${task.taskName}:**\n> 🟢 \`0 - ${tLimit}\` arası: **Tam XP (+1.0x)**\n`;
                        if (sLimit > 0) {
                            dynamicLimitText += `> 🟡 \`${tLimit + 1}\` - \`${sLimit}\` arası: **Yarı XP (+0.5x)**\n`;
                            dynamicLimitText += `> 🔴 \`${sLimit}\` sonrası: **XP VERMEZ!**\n\n`;
                        } else {
                            dynamicLimitText += `> 🔴 \`${tLimit}\` sonrası: **XP VERMEZ!**\n\n`;
                        }
                    }
                }

                return interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [{
                        type: 17,
                        components: [{ type: 10, content: `## ${emojis.toji_nokta || "📊"} Güncel Görev Limitleri${dynamicLimitText}` }]
                    }]
                });
            }
            if (interaction.customId === "panel_main") {
                return require("./PanelHandler.js")(interaction);
            }
        }
    } catch (err) {
        console.error(`[YETKI_HANDLER_ERROR]`, err);
        const p = { content: `Hata: ${err.message}`, flags: [MessageFlags.Ephemeral] };
        if (interaction.replied || interaction.deferred) await interaction.followUp(p).catch(() => { });
        else await interaction.reply(p).catch(() => { });
    }
};

module.exports = handleInteraction;

async function showRankDetail(interaction, rankID) {
    const emojis = ConfigManager.get("Emojis") || {};
    const rank = await StaffRoleSystem.findById(rankID);
    if (!rank) return interaction.reply({ content: "Rütbe bulunamadı.", flags: MessageFlags.Ephemeral });

    const globalSettings = await StaffGlobalSettings.findOne({ guildID: interaction.guild.id });
    const globalRespRoles = globalSettings?.responsibilityRoles || [];
    const mdtConfig = await MandatoryTaskConfig.findOne({ guildID: interaction.guild.id, rankRoleID: rank.roleID });

    const roleName = rank.rankName || interaction.guild.roles.cache.get(rank.roleID)?.name || "Bilinmiyor";
    const voiceGoal = mdtConfig?.voiceGoal || 0;
    const pubVoiceGoal = mdtConfig?.publicVoiceGoal || 0;
    const msgGoal = mdtConfig?.messageGoal || 0;
    const inviteGoal = mdtConfig?.inviteGoal || 0;
    const reqWeeks = rank.mandatoryWeeks || 2;

    let xpmText = (rank.xpMultiplierRoles || []).map(mr => `${emojis.toji_nokta || "•"} <@&${mr.roleID}>: **x${mr.multiplier}**`).join("\n") || "-# Çarpan tanımlanmamış.";
    const respRoles = globalRespRoles.map(id => `<@&${id}>`).join(", ") || "-# Global sorumluluk rolü tanımlanmamış.";

    const allTasks = await TaskSettings.find({ guildID: interaction.guild.id, active: true });
    let taskLimitText = allTasks.map(t => {
        const limitEntry = (t.roleLimits || []).find(rl => rl.roleID === rank.roleID);
        if (!limitEntry) return null;
        const stretchInfo = limitEntry.stretchLimit > 0 ? ` | Esneme: **${limitEntry.stretchLimit}**` : "";
        return `> ${emojis.toji_nokta || "•"} **${t.taskName}** → Limit: **${limitEntry.limitCount}**${stretchInfo}`;
    }).filter(Boolean).join("\n") || "-# Rütbeye özel görev limiti tanımlanmamış.";

    return sendPanelUpdate(interaction,
        `## ${emojis.toji_sign || "📌"} \`${roleName}\` Profili & Ayarları`,
        [
            `### ${emojis.toji_voice || "🔊"} Zorunlu Görevler\n> Atlama Şartı: **${reqWeeks} Hafta**\n> Genel Ses: \`${voiceGoal} dk\` | Public Ses: \`${pubVoiceGoal} dk\` | Mesaj: \`${msgGoal} adet\` | Davet: \`${inviteGoal} adet\``,
            `### ${emojis.toji_sparkly || "✨"} XP Çarpanları\n${xpmText}`,
            `### ${emojis.toji_bluestar || "⭐"} Sorumluluklar (Global)\n> Limit: \`${rank.responsibilityLimit || 0}\` | Ceza: \`x${rank.responsibilityPenalty || 0}\`\n> Roller: ${respRoles}`,
            `### ${emojis.toji_info || "🛠️"} Görev Esnetmesi (%)\n> Belirtilen Rütbe Esnetmesi: **${mdtConfig?.stretchPercentage || 0}%**\n` + (mdtConfig?.planModifiers || []).map(p => `> **${p.planName}**: **${p.percentage > 0 ? "+" : ""}${p.percentage}%**`).join("\n"),
            `### 🔁 Tekrarlı Görev Limitleri\n${taskLimitText}`,
            `### 💻 Sunucu İşleri Kapasitesi\n> Max Sunucu İşi XP: **${rank.maxServerXP || 0} XP**`
        ],
        [{
            type: 1, components: [
                { type: 2, custom_id: `rd_mdt_${rank.roleID}`, label: "Zorunlu Görev", style: 1 },
                { type: 2, custom_id: `rd_tl_btn_${rank._id}`, label: "Görev Limiti", style: 1 },
                { type: 2, custom_id: `rd_refresh_${rank._id}`, label: "Yenile", style: 3 },
                { type: 2, custom_id: `resp_modal_btn_${rank._id}`, label: "Sorumluluklar", style: 2 },
                { type: 2, custom_id: "panel_rank_detail", label: "← Geri", style: 4 }
            ]
        }, {
            type: 1, components: [
                { type: 2, custom_id: `xpmult_modal_btn_${rank._id}`, label: "XP Çarpanı Ekle", style: 2 },
                { type: 2, custom_id: `rd_stretch_btn_${rank._id}`, label: "Genel Esnetme", style: 2 },
                { type: 2, custom_id: `rd_stretch_plans_btn_${rank._id}`, label: "Plan Bazlı Esnetme", style: 2 }
            ]
        }]);
}
