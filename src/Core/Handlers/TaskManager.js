const TaskSettings = require("../Database/TaskSettings");
const StaffUser = require("../Database/StaffUser");
const moment = require("moment");
const {
    EmbedBuilder,
    MessageFlags
} = require('discord.js');

class TaskManager {

    static async getCachedSettings(guildID) {
        if (!global.TaskCache) global.TaskCache = { data: {}, lastFetch: 0 };
        const now = Date.now();
        if (now - global.TaskCache.lastFetch > 300000 || !global.TaskCache.data[guildID]) {
            const StaffRoleSystem = require("../Database/StaffRoleSystem");
            const TaskSettings = require("../Database/TaskSettings");
            const sr = await StaffRoleSystem.find({ guildID, active: true }).lean();
            const ts = await TaskSettings.find({ guildID, active: true }).lean();
            global.TaskCache.data[guildID] = { staffRanks: sr, allTasks: ts };
            global.TaskCache.lastFetch = now;
        }
        return global.TaskCache.data[guildID];
    }

    static async assignRandomTasks(member) {
        if (!member || member.user.bot) return;
        const { withLock } = require("./Lock");

        return await withLock(member.id, async () => {
            const ConfigManager = require("./ConfigManager");
            const guildID = member.guild.id;

            const { staffRanks, allTasks } = await this.getCachedSettings(guildID);
            const staffIDs = staffRanks.map(r => r.roleID);
            const isStaff = staffIDs.length > 0 && staffIDs.some(roleID => member.roles.cache.has(roleID));

            if (!isStaff) return;

            let userData = await StaffUser.findOne({ guildID, userID: member.id });
            if (!userData) userData = await StaffUser.create({ guildID, userID: member.id, dailyPassiveXP: { message: 0, voice: 0, date: moment().format("YYYY-MM-DD") } });
            const activeTaskDocs = await Promise.all(userData.activeTasks.filter(at => at && at.taskID).map(at => TaskSettings.findById(at.taskID)));

            const taskLogID = ConfigManager.get("Channels.TaskLog");
            const taskLog = member.guild.channels.cache.get(taskLogID);

            const categories = ["MESSAGE", "VOICE", "PUBLIC_VOICE", "INVITE", "TICKET", "EVENT_MANAGE", "EVENT_PARTICIPATE", "PARTNER", "BUMP", "VOTE", "REVIEW", "STREAM", "THREADS", "EVIDENCE", "RECRUIT", "ORIENTATION"];

            const categoryRoleMap = {
                "EVENT_MANAGE": ConfigManager.get("Roles.Responsibilities.EventManage"),
                "PARTNER": [].concat(ConfigManager.get("Roles.Responsibilities.Partner") || [], ConfigManager.get("Roles.Responsibilities.PartnerManager") || []),
                "TICKET": ConfigManager.get("Roles.Responsibilities.TicketStaff"),
                "RECRUIT": ConfigManager.get("Roles.Responsibilities.Recruitment"),
                "ORIENTATION": ConfigManager.get("Roles.Responsibilities.Recruitment")
            };

            let changed = false;
            for (const cat of categories) {
                const hasCat = activeTaskDocs.some(t => t && t.taskCategory === cat);
                const isCooldown = userData.cooldowns && userData.cooldowns.some(cd => cd.category === cat && cd.expiresAt > new Date());

                if (!hasCat && !isCooldown) {
                    const catTasks = allTasks.filter(t => t.taskCategory === cat);
                    if (catTasks.length > 0) {
                        const compatibleTasks = catTasks.filter(task => {
                            if (task.taskCategory === "EVENT_PARTICIPATE") return true;
                            if (task.allowedRoles && Array.isArray(task.allowedRoles) && task.allowedRoles.length > 0) {
                                return task.allowedRoles.some(roleID => member.roles.cache.has(roleID));
                            }
                            const reqRoles = categoryRoleMap[task.taskCategory];
                            if (Array.isArray(reqRoles) && reqRoles.length > 0) {
                                return reqRoles.some(roleID => member.roles.cache.has(roleID));
                            }

                            if (categoryRoleMap.hasOwnProperty(task.taskCategory)) {
                                return false;
                            }

                            return true;
                        });

                        if (compatibleTasks.length > 0) {
                            const randomTask = compatibleTasks[Math.floor(Math.random() * compatibleTasks.length)];
                            userData.activeTasks.push({
                                taskID: randomTask._id,
                                currentCount: 0,
                                otherChannelCount: 0,
                                startedAt: new Date(),
                                expiresAt: randomTask.limitType === "DAILY" ? moment().endOf("day").toDate() : (randomTask.limitType === "WEEKLY" ? moment().endOf("isoWeek").toDate() : moment().add(10, 'years').toDate())
                            });
                            changed = true;

                            let targetDisplay = randomTask.targetCount;
                            if (randomTask.taskCategory === "VOICE") {
                                const th = Math.floor(randomTask.targetCount / 60);
                                const tm = randomTask.targetCount % 60;
                                targetDisplay = `${th}s ${tm}d`;
                            }


                        }
                    }
                }
            }

            if (changed) {
                try {
                    await userData.save();
                } catch (error) {
                    if (error.name === 'VersionError') {
                        const freshUser = await StaffUser.findOne({ guildID, userID: member.id });
                        if (freshUser) return this.assignRandomTasks(member);
                    }
                    throw error;
                }
            }
        });
    }



    static async progressTask(guild, member, category, amount = 1, providedUserData = null, isOtherChannel = false) {

        const { withLock } = require("./Lock");
        return await withLock(member.id, async () => {
            let userData = providedUserData || await StaffUser.findOne({ guildID: guild.id, userID: member.id });
            if (!userData) {

                return false;
            }
            return await this._executeProgress(guild, member, category, amount, userData, isOtherChannel, !!providedUserData);
        });
    }

    static async _executeProgress(guild, member, category, amount, userData, isOtherChannel = false, isRecursive = false) {
        const ConfigManager = require("./ConfigManager");
        const guildID = guild.id;

        const { staffRanks, allTasks } = await this.getCachedSettings(guildID);
        const staffIDs = staffRanks.map(r => r.roleID);
        const isStaff = staffIDs.length > 0 && staffIDs.some(roleID => member.roles.cache.has(roleID));

        if (!isStaff) {

            return;
        }
        let hasActiveTaskInThisRun = false;
        let changed = false;
        let overflowAmount = 0;

        const taskLogID = ConfigManager.get("Channels.TaskLog");
        const taskLog = guild.channels.cache.get(taskLogID);

        if (!isRecursive && amount > 0) {
            if (category === "MESSAGE") {
                userData.totalMessages = (userData.totalMessages || 0) + amount;
                changed = true;
            } else if (category === "VOICE") {
                userData.totalVoiceMinutes = (userData.totalVoiceMinutes || 0) + amount;
                changed = true;
            } else if (category === "PUBLIC_VOICE") {
                userData.totalPublicVoiceMinutes = (userData.totalPublicVoiceMinutes || 0) + amount;
                changed = true;
            } else if (category === "INVITE") {
                userData.totalInvites = (userData.totalInvites || 0) + amount;
                changed = true;
            }
        }

        if (userData.activeTasks && userData.activeTasks.length > 0) {
            for (let i = 0; i < userData.activeTasks.length; i++) {
                const activeTask = userData.activeTasks[i];
                if (!activeTask || !activeTask.taskID) continue;
                const taskDef = allTasks.find(d => d._id.toString() === activeTask.taskID.toString());

                if (taskDef && taskDef.taskCategory === category) {
                    hasActiveTaskInThisRun = true;

                    let taskLimit = taskDef.limitCount || 0;
                    let stretchLimit = 0;
                    if (taskDef.roleLimits && taskDef.roleLimits.length > 0) {
                        for (const rl of taskDef.roleLimits) {
                            if (member.roles.cache.has(rl.roleID)) {
                                if (rl.limitCount > taskLimit || (rl.limitCount === taskLimit && rl.stretchLimit > stretchLimit)) {
                                    taskLimit = rl.limitCount;
                                    stretchLimit = rl.stretchLimit || 0;
                                }
                            }
                        }
                    }

                    const catStat = (userData.categoryStats || []).find(s => s.category === category);
                    const currentComplCount = catStat ? catStat.count : 0;

                    if (stretchLimit > 0 && (currentComplCount + 1) > stretchLimit) {
                        continue;
                    }

                    const needed = taskDef.targetCount - activeTask.currentCount;
                    if (needed <= 0) {
                        userData.activeTasks.splice(i, 1);
                        i--;
                        changed = true;
                        continue;
                    }

                    const canAdd = Math.min(amount, needed);

                    activeTask.currentCount += canAdd;
                    if ((category === "VOICE" || category === "STREAM") && isOtherChannel) {
                        activeTask.otherChannelCount = (activeTask.otherChannelCount || 0) + canAdd;
                    }
                    amount -= canAdd;
                    const remainingForThisTask = amount;

                    if (remainingForThisTask > overflowAmount) overflowAmount = remainingForThisTask;
                    changed = true;

                    if (activeTask.currentCount >= taskDef.targetCount) {
                        const XPManager = require("./XPManager");

                        userData.completedTasks += 1;

                        if (!userData.categoryStats) userData.categoryStats = [];
                        let catStat = userData.categoryStats.find(s => s.category === category);
                        if (catStat) {
                            catStat.count += 1;
                        } else {
                            userData.categoryStats.push({ category: category, count: 1 });
                        }

                        let finalReward = taskDef.rewardXP || 0;
                        let reductionApplied = false;
                        let reductionReason = "";

                        let taskLimit = taskDef.limitCount || 0;
                        let stretchLimit = 0;
                        if (taskDef.roleLimits && taskDef.roleLimits.length > 0) {
                            for (const rl of taskDef.roleLimits) {
                                if (member.roles.cache.has(rl.roleID)) {
                                    if (rl.limitCount > taskLimit || (rl.limitCount === taskLimit && rl.stretchLimit > stretchLimit)) {
                                        taskLimit = rl.limitCount;
                                        stretchLimit = rl.stretchLimit || 0;
                                    }
                                }
                            }
                        }

                        if (!userData.categoryStats) userData.categoryStats = [];
                        let catStatForLimit = userData.categoryStats.find(s => s.category === category);
                        const completionCountForLimit = catStatForLimit ? catStatForLimit.count : 0;

                        if (stretchLimit > 0 && completionCountForLimit > stretchLimit) {
                            finalReward = 0;
                            reductionApplied = true;
                            reductionReason = "Esneme limiti aşımı (x0)";
                        } else if (taskLimit > 0 && completionCountForLimit > taskLimit) {
                            finalReward = finalReward / 2;
                            reductionApplied = true;
                            reductionReason = "Limit aşımı (x0.5)";
                        } else if (taskLimit === 0 && stretchLimit > 0) {
                            finalReward = finalReward / 2;
                            reductionApplied = true;
                            reductionReason = "Limit aşımı (x0.5)";
                        }

                        if ((category === "VOICE" || category === "STREAM") && taskDef.targetCount > 0) {
                            const otherRatio = (activeTask.otherChannelCount || 0) / taskDef.targetCount;
                            if (otherRatio > 0.4) {
                                finalReward = finalReward / 2;
                                reductionApplied = true;
                                reductionReason = reductionReason ? "Limit & Yayın dışı kanal (x0.25)" : "Yayın dışı kanal (x0.5)";
                            }
                        }

                        await XPManager.addXP(guild, member, finalReward, `TASK_COMPLETED: ${taskDef.taskName}`, userData);

                        if (category === "REVIEW") {
                            const cooldownExpire = moment().add(12, 'hours').toDate();
                            if (!userData.cooldowns) userData.cooldowns = [];
                            let cd = userData.cooldowns.find(c => c.category === "REVIEW");
                            if (cd) cd.expiresAt = cooldownExpire;
                            else userData.cooldowns.push({ category: "REVIEW", expiresAt: cooldownExpire });
                        }

                        userData.activeTasks.splice(i, 1);
                        i--;

                        if (taskLog) {
                            const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 1024 });
                            const timestamp = Math.floor(Date.now() / 1000);

                            const v2Components = [
                                {
                                    "type": 17,
                                    "accent_color": null,
                                    "spoiler": false,
                                    "components": [
                                        {
                                            "type": 9,
                                            "accessory": {
                                                "type": 11,
                                                "media": { "url": avatarURL },
                                                "description": null,
                                                "spoiler": false
                                            },
                                            "components": [
                                                {
                                                    "type": 10,
                                                    "content": `> # ${ConfigManager.get("Emojis.toji_sparkles") || "✨"} ${member} Bir görev tamamlandı.\n> ## ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Tamamlanan Görev:** \`${taskDef.taskName}\``
                                                }
                                            ]
                                        },
                                        {
                                            "type": 14,
                                            "divider": true,
                                            "spacing": 1
                                        },
                                        {
                                            type: 10,
                                            content: `> ### - ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Kazanılan Ödül:** \`+${finalReward} XP\`\n` +
                                                (reductionApplied ? `> -# ${ConfigManager.get("Emojis.toji_ticket") || "✨"} **\`XP Kesintisi:\`** ${reductionReason || "Gerekli şartlar tam sağlanamadığı için ödül düşürüldü."}` : `> -# ${ConfigManager.get("Emojis.toji_ticket") || "✨"} Görev başarıyla işlendi, herhangi bir kesinti uygulanmadı.`)
                                        },
                                        {
                                            "type": 10,
                                            "content": `> ### - ${ConfigManager.get("Emojis.toji_hubsparkles") || "✨"} **Toplam Tamamlama:** \`${userData.completedTasks} Adet\`\n\n> -# - İşlem Zamanı: <t:${timestamp}:R>`
                                        }
                                    ]
                                }
                            ];

                            taskLog.send({
                                flags: [MessageFlags.IsComponentsV2],
                                components: v2Components,
                                allowedMentions: { parse: [] }
                            }).catch((err) => { console.error("Log gönderilirken hata oluştu:", err) });
                        }

                        const allTasksForRenewal = allTasks.filter(t => t.taskCategory === category);
                        const categoryResponsibilities = ConfigManager.get("Roles.Responsibilities") || {};
                        const categoryRoleMap = {
                            "EVENT_MANAGE": categoryResponsibilities.EventManage,
                            "PARTNER": [].concat(categoryResponsibilities.Partner || [], categoryResponsibilities.PartnerManager || []),
                            "TICKET": categoryResponsibilities.TicketStaff,
                            "RECRUIT": categoryResponsibilities.Recruitment,
                            "ORIENTATION": categoryResponsibilities.Recruitment
                        };

                        const isCd = userData.cooldowns && userData.cooldowns.some(cd => cd.category === category && cd.expiresAt > new Date());

                        const compatibleTasks = isCd ? [] : allTasksForRenewal.filter(task => {
                            if (task.taskCategory === "EVENT_PARTICIPATE") return true;
                            if (task.allowedRoles && Array.isArray(task.allowedRoles) && task.allowedRoles.length > 0) return task.allowedRoles.some(roleID => member.roles.cache.has(roleID));
                            const reqRoles = categoryRoleMap[task.taskCategory];
                            if (Array.isArray(reqRoles) && reqRoles.length > 0) return reqRoles.some(roleID => member.roles.cache.has(roleID));
                            if (categoryRoleMap.hasOwnProperty(task.taskCategory)) return false;
                            return true;
                        });

                        if (compatibleTasks.length > 0) {
                            const rt = compatibleTasks[Math.floor(Math.random() * compatibleTasks.length)];

                            userData.activeTasks.push({
                                taskID: rt._id,
                                currentCount: 0,
                                otherChannelCount: 0,
                                startedAt: new Date(),
                                expiresAt: rt.limitType === "DAILY" ? moment().endOf("day").toDate() : (rt.limitType === "WEEKLY" ? moment().endOf("isoWeek").toDate() : moment().add(10, 'years').toDate())
                            });


                        }

                        if (overflowAmount > 0) {
                            return await this.progressTask(guild, member, category, overflowAmount, userData, isOtherChannel);
                        }
                    }
                }
            }
        }

        const isActionCooldown = userData.cooldowns && userData.cooldowns.some(cd => cd.category === category && cd.expiresAt > new Date());
        if (!hasActiveTaskInThisRun && !isActionCooldown) {
            const filteredTasks = allTasks.filter(t => t.taskCategory === category);
            if (filteredTasks.length > 0) {
                const categoryResponsibilities = ConfigManager.get("Roles.Responsibilities") || {};
                const categoryRoleMap = {
                    "EVENT_MANAGE": categoryResponsibilities.EventManage,
                    "PARTNER": [].concat(categoryResponsibilities.Partner || [], categoryResponsibilities.PartnerManager || []),
                    "TICKET": categoryResponsibilities.TicketStaff,
                    "RECRUIT": categoryResponsibilities.Recruitment,
                    "ORIENTATION": categoryResponsibilities.Recruitment
                };

                const compatibleTasks = filteredTasks.filter(task => {
                    if (task.allowedRoles && Array.isArray(task.allowedRoles) && task.allowedRoles.length > 0) return task.allowedRoles.some(roleID => member.roles.cache.has(roleID));
                    const reqRoles = categoryRoleMap[task.taskCategory];
                    if (Array.isArray(reqRoles) && reqRoles.length > 0) return reqRoles.some(roleID => member.roles.cache.has(roleID));
                    if (categoryRoleMap.hasOwnProperty(task.taskCategory)) return false;
                    return true;
                });

                if (compatibleTasks.length > 0) {
                    const rt = compatibleTasks[Math.floor(Math.random() * compatibleTasks.length)];


                    const actualToApply = Math.min(amount, rt.targetCount);
                    const remaining = amount - actualToApply;

                    userData.activeTasks.push({
                        taskID: rt._id,
                        currentCount: actualToApply,
                        otherChannelCount: ((category === "VOICE" || category === "STREAM") && isOtherChannel) ? actualToApply : 0,
                        startedAt: new Date(),
                        expiresAt: rt.limitType === "DAILY" ? moment().endOf("day").toDate() : (rt.limitType === "WEEKLY" ? moment().endOf("isoWeek").toDate() : moment().add(10, 'years').toDate())
                    });
                    changed = true;



                    if (actualToApply >= rt.targetCount) {
                        return await this.progressTask(guild, member, category, remaining, userData, isOtherChannel);
                    }
                }
            }
        }

        if (changed) {
            try {
                await userData.save();
            } catch (error) {
                if (error.name === 'VersionError') {
                    const freshUser = await StaffUser.findOne({ guildID: guild.id, userID: member.id });
                    if (freshUser) return await this.progressTask(guild, member, category, amount, freshUser);
                }
                throw error;
            }
        }
    }


    static async validateTasks(member, forceSave = true, existingUser = null) {
        if (!member) return;
        const userObj = member.user || member;
        if (userObj.bot) return;

        const ConfigManager = require("./ConfigManager");
        const guildID = member.guild.id;

        const { staffRanks, allTasks } = await this.getCachedSettings(guildID);
        const staffIDs = staffRanks.map(r => r.roleID);
        const isStaff = staffIDs.length > 0 && staffIDs.some(roleID => member.roles.cache.has(roleID));

        let userData = existingUser || await StaffUser.findOne({ guildID, userID: member.id });
        if (!userData) return;

        if (!isStaff) {
            if (userData.activeTasks.length > 0) {
                userData.activeTasks = [];
                if (forceSave) {
                    try { await userData.save(); } catch (e) {
                        if (e.name === 'VersionError' && !existingUser) {
                            const fresh = await StaffUser.findOne({ guildID, userID: member.id });
                            if (fresh) return this.validateTasks(member, forceSave, fresh);
                        }
                    }
                }
                return;
            }
        }

        const responsibilities = ConfigManager.get("Roles.Responsibilities") || {};
        const catRoleMap = {
            "EVENT_MANAGE": responsibilities.EventManage,
            "PARTNER": [].concat(responsibilities.Partner || [], responsibilities.PartnerManager || []),
            "TICKET": responsibilities.TicketStaff,
            "RECRUIT": responsibilities.Recruitment,
            "ORIENTATION": responsibilities.Recruitment
        };

        const originalCount = userData.activeTasks.length;
        const validTasks = [];

        for (const activeTask of userData.activeTasks) {
            if (!activeTask || !activeTask.taskID) continue;
            const taskDef = allTasks.find(t => t._id.toString() === activeTask.taskID.toString());
            if (!taskDef) continue;

            const requiredRoles = catRoleMap[taskDef.taskCategory];
            if (taskDef.taskCategory === "EVENT_PARTICIPATE") {
                validTasks.push(activeTask);
                continue;
            }

            const publicCategories = ["MESSAGE", "VOICE", "PUBLIC_VOICE", "INVITE", "BUMP", "VOTE", "REVIEW", "STREAM"];
            if (publicCategories.includes(taskDef.taskCategory)) {
                validTasks.push(activeTask);
                continue;
            }

            const hasRole = Array.isArray(requiredRoles) && requiredRoles.length > 0 && requiredRoles.some(r => member.roles.cache.has(r));
            if (hasRole) {
                validTasks.push(activeTask);
                continue;
            }

            if (catRoleMap.hasOwnProperty(taskDef.taskCategory)) continue;
            validTasks.push(activeTask);
        }

        if (validTasks.length !== originalCount) {
            userData.activeTasks = validTasks;
            if (forceSave) {
                try { await userData.save(); } catch (e) {
                    if (e.name === 'VersionError' && !existingUser) {
                        const fresh = await StaffUser.findOne({ guildID, userID: member.id });
                        if (fresh) return await this.validateTasks(member, forceSave, fresh);
                    }
                }
            }
        }
    }


    static async progressMandatory(guild, member, type, value, publicValue = 0) {
        if (!guild || !member || member.user.bot) return;

        const { staffRanks } = await this.getCachedSettings(guild.id);
        const staffIDs = staffRanks.map(r => r.roleID);
        const isStaff = staffIDs.length > 0 && staffIDs.some(roleID => member.roles.cache.has(roleID));

        if (!isStaff) return;

        const MandatoryProgress = require("../Database/MandatoryProgress");
        let updateData = {};
        if (type === "MESSAGE") {
            updateData = { $inc: { messageCount: value }, $set: { lastUpdated: Date.now() } };
        } else if (type === "VOICE") {
            updateData = { $inc: { voiceMs: value }, $set: { lastUpdated: Date.now() } };
            if (publicValue > 0) updateData.$inc.publicVoiceMs = publicValue;
        } else if (type === "INVITE") {
            updateData = { $inc: { inviteCount: value }, $set: { lastUpdated: Date.now() } };
        }

        if (Object.keys(updateData).length > 0) {
            await MandatoryProgress.findOneAndUpdate(
                { guildID: guild.id, userID: member.id },
                updateData,
                { upsert: true }
            );

            const StaffUser = require("../Database/StaffUser");
            const userData = await StaffUser.findOne({ guildID: guild.id, userID: member.id });
            if (userData) {
                const XPManager = require("./XPManager");
                await XPManager.checkRoleUpdates(guild, member, userData.totalXP, userData.totalXP, userData);
            }
        }
    }


    static async cleanupExpiredTasks() {
        const now = new Date();
        await StaffUser.updateMany(
            {
                $or: [
                    { "activeTasks.expiresAt": { $lt: now } },
                    { "cooldowns.expiresAt": { $lt: now } }
                ]
            },
            {
                $pull: {
                    activeTasks: { expiresAt: { $lt: now } },
                    cooldowns: { expiresAt: { $lt: now } }
                }
            }
        );
    }
}

module.exports = TaskManager;
