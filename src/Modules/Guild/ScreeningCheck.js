const joinEvent = require("./JoinEvent");
const Settings = require("../../../Settings.json");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (oldMember, newMember) => {
    if (newMember.guild.id != Settings.Main.GuildID) return;

    if (oldMember.pending && !newMember.pending) {
        await joinEvent.welcomeLogic(newMember);
    }
};
