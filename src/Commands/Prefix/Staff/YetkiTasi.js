const YetkiTasiService = require("../../../Services/Staff/YetkiTasiService");

module.exports = {
    conf: {
        usages: ["yetkitasi", "yetkitaşı"],
        description: "Bir kullanıcının yetkilerini başka bir kullanıcıya taşır.",
        category: "Staff",
        usage: ".yetkitasi <@KaynakKullanıcı> <@HedefKullanıcı>"
    },

    run: async (client, message, args) => {
        await YetkiTasiService.execute(message, args[0], args[1]);
    }
};
