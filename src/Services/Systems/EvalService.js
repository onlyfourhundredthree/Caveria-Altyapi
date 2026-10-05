class EvalService {
    static async process(client, message, code) {
        if (!code) return null;

        try {
            // Reconstruct common context variables for the eval scope
            const args = code.split(" ");
            const guild = message.guild;
            const channel = message.channel;
            const author = message.author;
            const member = message.member;

            var result = this.clean(await eval(code));
            if (result.includes(client.token)) return null;

            return { content: `\`\`\`js\n${result}\n\`\`\`` };
        } catch (e) {
            return { content: `\`\`\`js\n${e}\n\`\`\`` };
        }
    }

    static clean(text) {
        if (typeof text !== "string")
            text = require("util").inspect(text, { depth: 0 });
        text = text
            .replace(/`/g, "`" + String.fromCharCode(8203))
            .replace(/@/g, "@" + String.fromCharCode(8203));
        return text;
    }
}

module.exports = EvalService;
