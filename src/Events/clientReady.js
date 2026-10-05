const fs = require('fs');

const CheckPunitives = require('../Modules/Ready/CheckPunitives');
const InviteReady = require('../Modules/Ready/InviteReady');
const Ready = require('../Modules/Ready/Ready');
const TagManager = require('../Modules/Ready/TagManager');
const AppInit = require('../Modules/Ready/AppInit');

module.exports = async (...args) => {
    const modules = [
        { name: 'Ready', func: Ready },
        { name: 'CheckPunitives', func: CheckPunitives },
        { name: 'InviteReady', func: InviteReady },
        { name: 'TagManager', func: TagManager },
        { name: 'AppInit', func: AppInit }
    ];

    for (const mod of modules) {
        try {
            await mod.func(...args);
        } catch (error) {
            console.error(`[Listener Error] clientReady -> ${mod.name} modülünde hata oluştu:`, error);
        }
    }

    const StatCacheManager = require("../Core/Handlers/StatCacheManager");
    StatCacheManager.restoreBackup();

    const { syncActiveRooms } = require("../Modules/Voice/PermanentRoomVoiceTracker");
    await syncActiveRooms(args[0]);

    const { initBumpReminders } = require("../Core/Handlers/BumpReminderJob");
    await initBumpReminders(args[0]); // Assuming client is the first argument
};

module.exports.conf = {
    name: "clientReady"
};
