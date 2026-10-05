const { SlashCommandBuilder } = require("discord.js");
const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("afk")
        .setDescription("AFK moduna girmenizi veya yetkili iseniz bir kullanıcıyı AFK odasına taşımanızı sağlar.")
        .addUserOption(option => 
            option.setName("kullanıcı")
                .setDescription("AFK odasına taşımak istediğiniz kullanıcı (Sadece yetkililer)")
                .setRequired(false))
        .addStringOption(option => 
            option.setName("sebep")
                .setDescription("AFK olma sebebiniz")
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser("kullanıcı");
        const reasonStr = interaction.options.getString("sebep");
        const args = [];
        
        if (targetUser) args.push(targetUser.id);
        else if (reasonStr) args.push(...reasonStr.split(" "));

        const targetMember = targetUser ? interaction.guild.members.cache.get(targetUser.id) : null;
        await GeneralService.handleAfk(interaction, args, targetMember, interaction.member);
    }
};
