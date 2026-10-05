const fs = require('fs');

const AFKMessageControl = require('../Modules/Message/AFKMessageControl');
const BumpHandler = require('../Modules/Message/BumpHandler');
const CommandsHandler = require('../Modules/Message/CommandsHandler');
const DmCreate = require('../Modules/Message/DmCreate');

const MentionTracker = require('../Modules/Message/MentionTracker');
const MessageStats = require('../Modules/Message/MessageStats');
const PartnerCounter = require('../Modules/Message/PartnerCounter');
const PermanentRoomMessageReposition = require('../Modules/Message/PermanentRoomMessageReposition');
const ReviewHandler = require('../Modules/Message/ReviewHandler');
const StaffAppHandler = require('../Modules/Message/StaffAppHandler');
const TicketMessageControl = require('../Modules/Message/TicketMessageControl');
const VampireChat = require('../Modules/Message/VampireChat');
const VoteHandler = require('../Modules/Message/VoteHandler');
const WordGameHandler = require('../Modules/Message/WordGameHandler');

module.exports = async (message) => {
    // Tüm messageCreate modülleri
    const modules = [
        { name: 'AFKMessageControl', func: AFKMessageControl },
        { name: 'BumpHandler', func: BumpHandler },
        { name: 'CommandsHandler', func: CommandsHandler },
        { name: 'DmCreate', func: DmCreate },
        { name: 'MentionTracker', func: MentionTracker },
        { name: 'MessageStats', func: MessageStats },
        { name: 'PartnerCounter', func: PartnerCounter },
        { name: 'PermanentRoomMessageReposition', func: PermanentRoomMessageReposition },
        { name: 'ReviewHandler', func: ReviewHandler },
        { name: 'StaffAppHandler', func: StaffAppHandler },
        { name: 'TicketMessageControl', func: TicketMessageControl },
        { name: 'VampireChat', func: VampireChat },
        { name: 'VoteHandler', func: VoteHandler },
        { name: 'WordGameHandler', func: WordGameHandler }
    ];
    const coinSys = require("../Services/Systems/CoinQuestionSystem");
    if (coinSys && typeof coinSys.handleMessageCreate === 'function') {
        await coinSys.handleMessageCreate(message);
    }
    for (const mod of modules) {
        try {
            await mod.func(message);
        } catch (error) {
            console.error(`[Listener Error] messageCreate -> ${mod.name} modülünde hata oluştu:`, error);
        }
    }
};

module.exports.conf = {
    name: "messageCreate"
};
