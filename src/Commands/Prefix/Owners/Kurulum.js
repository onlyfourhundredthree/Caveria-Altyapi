const KurulumService = require("../../../Services/Systems/KurulumService");

module.exports = {
  conf: {
        usages: ["kurulum"],
        description: "bilmeseniz olur",
        category: "Owners",
        usage: ".kurulum",
        owner: true
    },

  run: async (client, message, args) => {
    const payload = KurulumService.getDashboard();
    return message.channel.send(payload);
  },
};
