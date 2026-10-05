const Discord = require('discord.js');

exports.DEFAULT_CHECK_INTERVAL = 15_000;
exports.DELETE_DROP_DATA_AFTER = 6.048e8;

exports.GiveawayMessages = {
    giveaway: '**ÇEKİLİŞ!**',
    giveawayEnded: '**ÇEKİLİŞ SONA ERDİ!**',
    title: '{this.prize}',
    inviteToParticipate: 'Çekilişe katılmak için aşağıdaki yandaki butona tıkla!',
    winMessage: 'Tebrikler, {winners}! **{this.prize}** kazandınız!\n{this.messageURL}',
    drawing: '{timestamp}',
    dropMessage: 'İlk tıklayan kazanır! Hediyeyi kapmak için hemen butona tıkla!',
    embedFooter: '{this.winnerCount} winner(s)',
    noWinner: 'Çekiliş sonlandırıldı. Kazanan yok!',
    winners: 'Kazanan(lar):',
    endedAt: 'Sona erdi:',
    hostedBy: 'Çekilişi Başlatan: {this.hostedBy}'
};

exports.LastChanceOptions = {
    enabled: false,
    content: '**LAST CHANCE TO ENTER!**',
    threshold: 10_000,
    embedColor: '#FF0000'
};

exports.PauseOptions = {
    isPaused: false,
    content: '**THIS GIVEAWAY IS PAUSED!**',
    unpauseAfter: null,
    embedColor: '#FFFF00',
    durationAfterPause: null,
    infiniteDurationText: '`NEVER`'
};

exports.GiveawaysManagerOptions = {
    forceUpdateEvery: null,
    endedGiveawaysLifetime: null,
    default: {
        botsCanWin: false,
        exemptPermissions: [],
        exemptMembers: () => false,
        reaction: '🎉',
        lastChance: {
            enabled: false,
            content: '**LAST CHANCE TO ENTER!**',
            threshold: 5000,
            embedColor: '#FF0000'
        }
    }
};

exports.GiveawayRerollOptions = {
    winnerCount: null,
    messages: {
        congrat: 'New winner(s): {winners}! Congratulations, you won **{this.prize}**!\n{this.messageURL}',
        error: 'No valid participations, no new winner(s) can be chosen!',
        replyWhenNoWinner: true
    }
};
