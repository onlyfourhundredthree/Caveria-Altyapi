const { PermissionsBitField } = require("discord.js");
const Ticket = require("../../Core/Database/Ticket");
const ConfigManager = require("../../Core/Handlers/ConfigManager");

module.exports = async (message) => {
    if (!message.guild || message.author.bot || !message.channel) return;

    if (message.channel.parentId !== ConfigManager.get("Channels.TicketCategory")) return;

    const ticketData = await Ticket.findOne({ channelID: message.channel.id });
    if (!ticketData) return;

    const isOwner = message.author.id === ticketData.userID;
    const isResponsible = message.author.id === ticketData.staffID;
    const isPermitted = ticketData.permittedUsers && ticketData.permittedUsers.includes(message.author.id);
    const ticketStaffRoles = ConfigManager.get("Roles.Responsibilities.TicketStaff") || [];
    const isTicketStaff = ticketStaffRoles.some(role => message.member.roles.cache.has(role));
    const canManageChannels = message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (ConfigManager.isOwner(message.member) || canManageChannels || isOwner || isResponsible || isPermitted) {
        // İzinli kullanıcı mesaj atıyor, attachment var mı kontrol edelim:
        if (message.attachments.size > 0) {
            const R2Uploader = require("../../Services/Systems/R2Uploader");
            const uploadedLinks = [];

            for (const [id, attachment] of message.attachments) {
                const r2Link = await R2Uploader.uploadFromDiscord(attachment.url, attachment.name);
                if (r2Link && r2Link !== attachment.url) {
                    uploadedLinks.push(r2Link);
                }
            }

            if (uploadedLinks.length > 0) {
                const content = uploadedLinks.map((link, idx) => `[Yedeklenen Medya ${idx + 1}](${link})`).join(" | ");
                await message.reply({ content: `📁 **Sistem:** ${content}`, allowedMentions: { repliedUser: false } }).catch(() => {});
            }
        }
        return;
    }

    await message.delete().catch(() => { });

    const warning = await message.channel.send({
        content: `${message.author}, bu bilette konuşma izniniz bulunmuyor!`
    }).catch(() => { });

    if (warning) {
        setTimeout(() => warning.delete().catch(() => { }), 5000);
    }
};
