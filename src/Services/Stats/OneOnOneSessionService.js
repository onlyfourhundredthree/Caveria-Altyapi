const { MessageFlags } = require("discord.js");
const OneOnOneService = require("../../Services/Systems/OneOnOneService");

class OneOnOneSessionService {
    static async execute(context, args = []) {
        const isInteraction = !!context.user;
        const guild = context.guild;

        if (isInteraction) {
            await context.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(() => {});
        }

        let targetMember = null;
        if (isInteraction) {
            targetMember = context.options.getMember("hedef");
        } else {
            const targetUser = context.mentions?.members?.first() || (args[0] ? guild.members.cache.get(args[0]) : null);
            if (targetUser) targetMember = targetUser;
        }

        if (targetMember) {
            return OneOnOneService.renderQueryPanel(context, targetMember);
        }

        return OneOnOneService.renderMainDashboard(context);
    }
}

module.exports = OneOnOneSessionService;
