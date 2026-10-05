const fs = require('fs');
const path = require('path');

const AutoPartner = require('../Modules/Interaction/AutoPartner');
const BackupMenu = require('../Modules/Interaction/BackupMenu');
const ManageBotMenu = require('../Modules/Interaction/ManageBotMenu');
const MuteAyarMenu = require('../Modules/Interaction/MuteAyarMenu');
const AfPanel = require('../Modules/Interaction/AfPanel');
const CezaAppListener = require('../Modules/Interaction/CezaAppListener');
const EtkinlikPanelHandler = require('../Modules/Interaction/EtkinlikPanelHandler');
const GuardMenu = require('../Modules/Interaction/GuardMenu');
const InviteClaimInteraction = require('../Modules/Interaction/InviteClaimInteraction');
const CustomRolePanelHandler = require('../Modules/Interaction/CustomRolePanelHandler');
const KurulumMenu = require('../Modules/Interaction/KurulumMenu');
const LobbyInteractionHandler = require('../Modules/Interaction/LobbyInteractionHandler');

const BoostAyarHandler = require('../Modules/Interaction/BoostAyarHandler');
const PrivateAyarHandler = require('../Modules/Interaction/PrivateAyarHandler');
const PermanentAyarHandler = require('../Modules/Interaction/PermanentAyarHandler');
const EcoAyarHandler = require('../Modules/Interaction/EcoAyarHandler');
const RestrictAyarHandler = require('../Modules/Interaction/RestrictAyarHandler');
const LevelAyarHandler = require('../Modules/Interaction/LevelAyarHandler');
const PartnerMenu = require('../Modules/Interaction/PartnerMenu');
const PanelHandler = require('../Modules/Interaction/PanelHandler');
const AutoMessageHandler = require('../Modules/Interaction/AutoMessageHandler');
const PartnerPanel = require('../Modules/Interaction/PartnerPanel');
const PermanentRoomHandler = require('../Modules/Interaction/PermanentRoomHandler');
const PermanentRoomJob = require("../Core/Handlers/PermanentRoomJob");
const PrivateRoomInteractionCreate = require('../Modules/Interaction/PrivateRoomInteractionCreate');
const PromotionHandler = require('../Modules/Interaction/PromotionHandler');
const RatingInteractionHandler = require('../Modules/Interaction/RatingInteractionHandler');
const RiotInteractionHandler = require('../Modules/Interaction/RiotInteractionHandler');
const SlashCommandHandler = require('../Modules/Interaction/SlashCommandHandler');
const StaffAppInteraction = require('../Modules/Interaction/StaffAppInteraction');
const TagBanPanel = require('../Modules/Interaction/TagBanPanel');
const TaskButtonHandler = require('../Modules/Interaction/TaskButtonHandler');
const TicketHandler = require('../Modules/Interaction/TicketHandler');
const TweetInteraction = require('../Modules/Interaction/TweetInteraction');
const VampireGameListener = require('../Modules/Interaction/VampireGameListener');
const YetkiHandler = require('../Modules/Interaction/YetkiHandler');
const MessageBuilderListener = require('../Modules/Interaction/MessageBuilderListener');
const OneOnOneInteractionHandler = require('../Modules/Interaction/OneOnOneInteractionHandler');
const RoleButtonHandler = require('../Modules/Interaction/RoleButtonHandler');
const EvidenceSubmitHandler = require('../Modules/Interaction/EvidenceSubmitHandler');
const EvidenceControllerHandler = require('../Modules/Interaction/EvidenceControllerHandler');
const JailAyarMenu = require('../Modules/Interaction/JailAyarMenu');
const JailReasonSelectHandler = require('../Modules/Interaction/JailReasonSelectHandler');
const MonopolyGameListener = require('../Modules/Interaction/MonopolyGameListener');

module.exports = async (interaction) => {
    const modules = [
        { name: 'BackupMenu', func: BackupMenu },
        { name: 'ManageBotMenu', func: ManageBotMenu },
        { name: 'MuteAyarMenu', func: MuteAyarMenu },
        { name: 'JailAyarMenu', func: JailAyarMenu },
        { name: 'JailReasonSelectHandler', func: JailReasonSelectHandler },
        { name: 'MonopolyGameListener', func: MonopolyGameListener },
        { name: 'AfPanel', func: AfPanel },
        { name: 'AutoPartner', func: AutoPartner },
        { name: 'CezaAppListener', func: CezaAppListener },
        { name: 'CustomRolePanelHandler', func: CustomRolePanelHandler },
        { name: 'EtkinlikPanelHandler', func: EtkinlikPanelHandler },
        { name: 'GuardMenu', func: GuardMenu },
        { name: 'InviteClaimInteraction', func: InviteClaimInteraction },

        { name: 'BoostAyarHandler', func: BoostAyarHandler },
        { name: 'PrivateAyarHandler', func: PrivateAyarHandler },
        { name: 'PermanentAyarHandler', func: PermanentAyarHandler },
        { name: 'EcoAyarHandler', func: EcoAyarHandler },
        { name: 'RestrictAyarHandler', func: RestrictAyarHandler },
        { name: 'LevelAyarHandler', func: LevelAyarHandler },
        { name: 'LobbyInteractionHandler', func: LobbyInteractionHandler },
        { name: 'PartnerMenu', func: PartnerMenu },
        { name: 'PanelHandler', func: PanelHandler },
        { name: 'AutoMessageHandler', func: AutoMessageHandler },
        { name: 'PartnerPanel', func: PartnerPanel },
        { name: 'PermanentRoomHandler', func: PermanentRoomHandler },
        { name: 'PermanentRoomJob', func: PermanentRoomJob.handleInteraction },
        { name: 'PrivateRoomInteractionCreate', func: PrivateRoomInteractionCreate },
        { name: 'PromotionHandler', func: PromotionHandler },
        { name: 'KurulumMenu', func: KurulumMenu },
        { name: 'RatingInteractionHandler', func: RatingInteractionHandler },
        { name: 'RiotInteractionHandler', func: RiotInteractionHandler },
        { name: 'SlashCommandHandler', func: SlashCommandHandler },
        { name: 'StaffAppInteraction', func: StaffAppInteraction },
        { name: 'TagBanPanel', func: TagBanPanel },
        { name: 'TaskButtonHandler', func: TaskButtonHandler },
        { name: 'TicketHandler', func: TicketHandler },
        { name: 'TweetInteraction', func: TweetInteraction },
        { name: 'VampireGameListener', func: VampireGameListener },
        { name: 'YetkiHandler', func: YetkiHandler },
        { name: 'MessageBuilderListener', func: MessageBuilderListener },
        { name: 'OneOnOneInteractionHandler', func: OneOnOneInteractionHandler },
        { name: 'RoleButtonHandler', func: RoleButtonHandler },
        { name: 'EvidenceSubmitHandler', func: EvidenceSubmitHandler },
        { name: 'EvidenceControllerHandler', func: EvidenceControllerHandler }
    ];
    if (global.bot.giveawayManager && typeof global.bot.giveawayManager.handleInteraction === 'function') {
        await global.bot.giveawayManager.handleInteraction(interaction);
    }
    for (const mod of modules) {
        try {
            await mod.func(interaction);
        } catch (error) {
            console.error(`[Listener Error] interactionCreate -> ${mod.name} modülünde hata oluştu:`, error);
        }
    }
};

module.exports.conf = {
    name: "interactionCreate"
};
