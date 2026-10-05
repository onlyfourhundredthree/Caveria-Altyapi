const mongoose = require("mongoose");

const schema = mongoose.Schema({
    guildID: String,

    enabled: { type: Boolean, default: true },

    roleCreate: { limit: { type: Number, default: 3 }, time: { type: Number, default: 60000 }, action: { type: String, default: "kick" } },
    roleDelete: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },
    roleUpdate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "jail" } },

    channelCreate: { limit: { type: Number, default: 3 }, time: { type: Number, default: 60000 }, action: { type: String, default: "kick" } },
    channelDelete: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },
    channelUpdate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "jail" } },
    webhookUpdate: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },

    emojiCreate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "kick" } },
    emojiDelete: { limit: { type: Number, default: 3 }, time: { type: Number, default: 60000 }, action: { type: String, default: "jail" } },
    emojiUpdate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "kick" } },
    stickerCreate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "kick" } },
    stickerDelete: { limit: { type: Number, default: 3 }, time: { type: Number, default: 60000 }, action: { type: String, default: "jail" } },
    stickerUpdate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "kick" } },

    memberBan: { limit: { type: Number, default: 3 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },
    memberKick: { limit: { type: Number, default: 3 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },
    memberRoleUpdate: { limit: { type: Number, default: 5 }, time: { type: Number, default: 60000 }, action: { type: String, default: "jail" } },
    botAdd: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },

    serverUpdate: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } }, 
    guildUrlUpdate: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } }, 
    integrationCreate: { limit: { type: Number, default: 1 }, time: { type: Number, default: 60000 }, action: { type: String, default: "ban" } },

    fullAccess: { type: Array, default: [] }, 
    roleAccess: { type: Array, default: [] }, 
    channelAccess: { type: Array, default: [] }, 
    emojiAccess: { type: Array, default: [] }, 
    botAccess: { type: Array, default: [] }, 
});

module.exports = mongoose.model("GuardSettings", schema);
