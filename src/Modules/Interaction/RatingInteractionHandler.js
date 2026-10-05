const RatingManager = require("../../Core/Handlers/RatingManager");

module.exports = async (interaction) => {
    if (interaction.customId && interaction.customId.startsWith("rate_")) {
        await RatingManager.handleInteraction(interaction);
    }
};
