const StaffRoleSystem = require("../Database/StaffRoleSystem");

class StaffManager {
    static async applyMilestoneRoles(member, rankObj) {
        if (rankObj.extraRoles && rankObj.extraRoles.length > 0) {
            await member.roles.add(rankObj.extraRoles).catch(() => { });
        }
    }


    static async applyAllMilestoneRoles(member, targetRank) {
        if (!targetRank) return;

        const allRanks = await StaffRoleSystem.find({ guildID: member.guild.id, active: true }).sort({ requiredXP: 1 });
        const qualifyingRanks = allRanks.filter(r => r.requiredXP <= targetRank.requiredXP);

        const rolesToAdd = new Set();
        qualifyingRanks.forEach(r => {
            if (r.extraRoles && r.extraRoles.length > 0) {
                r.extraRoles.forEach(roleID => rolesToAdd.add(roleID));
            }
        });

        if (rolesToAdd.size > 0) {
            const roleIDs = Array.from(rolesToAdd);
            await member.roles.add(roleIDs).catch(() => { });
        }
    }


    static async removeMilestoneRoles(member, rankObj) {
        if (rankObj.extraRoles && rankObj.extraRoles.length > 0) {
            await member.roles.remove(rankObj.extraRoles).catch(() => { });
        }
    }


    static async removeAllStaffRoles(member, admin, reason) {
        const staffRanks = await StaffRoleSystem.find({ guildID: member.guild.id, active: true });
        const allStaffRoleIDs = new Set();

        staffRanks.forEach(r => {
            if (r.roleID) allStaffRoleIDs.add(r.roleID);
            if (r.extraRoles && r.extraRoles.length > 0) {
                r.extraRoles.forEach(er => allStaffRoleIDs.add(er));
            }
        });

        const currentRank = staffRanks.find(r => member.roles.cache.has(r.roleID));

        const rolesToRemove = Array.from(allStaffRoleIDs).filter(id => member.roles.cache.has(id));

        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove).catch(() => { });
            return true;
        }
        return false;
    }



    static async checkMandatoryCompletion(member, rankObj) {
        const MandatoryProgress = require("../Database/MandatoryProgress");
        const MandatoryTaskConfig = require("../Database/MandatoryTaskConfig");
        const StaffGlobalSettings = require("../Database/StaffGlobalSettings");

        const progressData = await MandatoryProgress.findOne({ guildID: member.guild.id, userID: member.id });
        const mdtConfig = rankObj ? await MandatoryTaskConfig.findOne({ guildID: member.guild.id, rankRoleID: rankObj.roleID }) : null;

        if (!mdtConfig) return true; 
        if (!progressData) return false;

        const globalSettings = await StaffGlobalSettings.findOne({ guildID: member.guild.id });

        let voiceGoalMs = (mdtConfig.voiceGoal || 0) * 60000;
        let pubVoiceGoalMs = (mdtConfig.publicVoiceGoal || 0) * 60000;
        let msgGoal = mdtConfig.messageGoal || 0;

        let totalStretch = mdtConfig.stretchPercentage || 0;
        if (globalSettings?.stretchPlans?.length > 0 && mdtConfig.planModifiers?.length > 0) {
            for (const plan of globalSettings.stretchPlans) {
                if (member.roles.cache.has(plan.roleID) || (plan.roleIDs && plan.roleIDs.some(rid => member.roles.cache.has(rid)))) {
                    const planMod = mdtConfig.planModifiers.find(pm => pm.planName === plan.name);
                    if (planMod) totalStretch += planMod.percentage;
                }
            }
        }

        const factor = 1 + (totalStretch / 100);
        voiceGoalMs = Math.max(0, Math.round(voiceGoalMs * factor));
        pubVoiceGoalMs = Math.max(0, Math.round(pubVoiceGoalMs * factor));
        msgGoal = Math.max(0, Math.round(msgGoal * factor));

        if (mdtConfig.roleModifiers) {
            for (const mod of mdtConfig.roleModifiers) {
                if (member.roles.cache.has(mod.roleID)) {
                    if (mod.modifierType === "PERCENT") {
                        const f = 1 + (mod.modifierValue / 100);
                        voiceGoalMs = Math.round(voiceGoalMs * f);
                        pubVoiceGoalMs = Math.round(pubVoiceGoalMs * f);
                        msgGoal = Math.round(msgGoal * f);
                    } else {
                        voiceGoalMs += (mod.modifierValue * 60000);
                        pubVoiceGoalMs += (mod.modifierValue * 60000);
                        msgGoal += mod.modifierValue;
                    }
                }
            }
        }

        return (progressData.voiceMs || 0) >= voiceGoalMs &&
            (progressData.publicVoiceMs || 0) >= pubVoiceGoalMs &&
            (progressData.messageCount || 0) >= msgGoal;
    }

    static async calculateOverflow(member, rankObj) {
        const MandatoryProgress = require("../Database/MandatoryProgress");
        const MandatoryTaskConfig = require("../Database/MandatoryTaskConfig");
        const StaffGlobalSettings = require("../Database/StaffGlobalSettings");

        const progressData = await MandatoryProgress.findOne({ guildID: member.guild.id, userID: member.id });
        const mdtConfig = rankObj ? await MandatoryTaskConfig.findOne({ guildID: member.guild.id, rankRoleID: rankObj.roleID }) : null;

        if (!progressData || !mdtConfig) return null;

        const globalSettings = await StaffGlobalSettings.findOne({ guildID: member.guild.id });

        let voiceGoalMs = (mdtConfig.voiceGoal || 0) * 60000;
        let pubVoiceGoalMs = (mdtConfig.publicVoiceGoal || 0) * 60000;
        let msgGoal = mdtConfig.messageGoal || 0;

        let totalStretch = mdtConfig.stretchPercentage || 0;
        if (globalSettings?.stretchPlans?.length > 0 && mdtConfig.planModifiers?.length > 0) {
            for (const plan of globalSettings.stretchPlans) {
                if (member.roles.cache.has(plan.roleID) || (plan.roleIDs && plan.roleIDs.some(rid => member.roles.cache.has(rid)))) {
                    const planMod = mdtConfig.planModifiers.find(pm => pm.planName === plan.name);
                    if (planMod) totalStretch += planMod.percentage;
                }
            }
        }

        const factor = 1 + (totalStretch / 100);
        voiceGoalMs = Math.max(0, Math.round(voiceGoalMs * factor));
        pubVoiceGoalMs = Math.max(0, Math.round(pubVoiceGoalMs * factor));
        msgGoal = Math.max(0, Math.round(msgGoal * factor));

        if (mdtConfig.roleModifiers) {
            for (const mod of mdtConfig.roleModifiers) {
                if (member.roles.cache.has(mod.roleID)) {
                    if (mod.modifierType === "PERCENT") {
                        const f = 1 + (mod.modifierValue / 100);
                        voiceGoalMs = Math.round(voiceGoalMs * f);
                        pubVoiceGoalMs = Math.round(pubVoiceGoalMs * f);
                        msgGoal = Math.round(msgGoal * f);
                    } else {
                        voiceGoalMs += (mod.modifierValue * 60000);
                        pubVoiceGoalMs += (mod.modifierValue * 60000);
                        msgGoal += mod.modifierValue;
                    }
                }
            }
        }

        const StaffUser = require("../Database/StaffUser");
        const userData = await StaffUser.findOne({ guildID: member.guild.id, userID: member.id });

        return {
            voiceMs: Math.max(0, (progressData.voiceMs || 0) - voiceGoalMs),
            publicVoiceMs: Math.max(0, (progressData.publicVoiceMs || 0) - pubVoiceGoalMs),
            messageCount: Math.max(0, (progressData.messageCount || 0) - msgGoal),
            xp: rankObj ? Math.max(0, (userData?.totalXP || 0) - (rankObj.requiredXP || 0)) : 0
        };
    }


    static async resetStats(member, deductedXP = 0, overflowData = null) {
        const { withLock } = require("./Lock");
        const StaffUser = require("../Database/StaffUser");
        const MandatoryProgress = require("../Database/MandatoryProgress");
        const TaskManager = require("./TaskManager");

        return await withLock(member.id, async () => {
            await MandatoryProgress.deleteOne({ guildID: member.guild.id, userID: member.id });

            const uData = await StaffUser.findOne({ guildID: member.guild.id, userID: member.id });
            if (uData) {
                await StaffUser.findOneAndUpdate(
                    { guildID: member.guild.id, userID: member.id },
                    {
                        $set: {
                            activeTasks: [],
                            categoryStats: [],
                            cooldowns: [],
                            weeklyXP: 0,
                            completedTasks: 0,
                            currentLevel: 1,
                            totalXP: Math.max(0, uData.totalXP - deductedXP),
                            overflowXP: overflowData ? Math.max(0, overflowData.xp || 0) : 0
                        }
                    }
                );
            }

            await TaskManager.validateTasks(member);
            await TaskManager.assignRandomTasks(member);
        });
    }
}

module.exports = StaffManager;
