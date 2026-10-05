const GeneralService = require("../../../Services/Systems/GeneralService");

module.exports = {
    conf: {
        usages: ["avatar", "avatar-sistemi", "avatar-göster", "avatar-gösterme"],
        description: "Bir kullanıcının avatarını gösterir.",
        category: "Users",
        usage: ".avatar [kullanıcı]"
    },


    run: async (client, message, args) => {
        let targetUser = args.length > 0 ? message.mentions.users.first() || await client.users.fetch(args[0]).catch(()=>null) || message.author : message.author;
        await GeneralService.sendAvatar(client, message, targetUser, message.author);
    },
};
