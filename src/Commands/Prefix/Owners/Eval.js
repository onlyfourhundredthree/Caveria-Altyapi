const EvalService = require("../../../Services/Systems/EvalService");

module.exports = {
  conf: {
        usages: ["eval"],
        description: "bu komutu bilmesenizde olur be kanka",
        category: "Owners",
        usage: ".eval <code>",
        owner: true
    },

  run: async (client, message, args) => {
    if (!args[0]) return;
    const code = args.join(" ");

    const payload = await EvalService.process(client, message, code);
    if (payload) {
        return message.channel.send(payload);
    }
  },
};