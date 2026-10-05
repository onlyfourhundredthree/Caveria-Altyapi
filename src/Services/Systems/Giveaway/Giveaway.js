const { EventEmitter } = require('node:events');
const { setTimeout, clearTimeout } = require('node:timers');

const Discord = require('discord.js');
const { deepmerge, deepmergeCustom } = require('deepmerge-ts');
const serialize = require('serialize-javascript');

const {
    GiveawayMessages,
    GiveawayRerollOptions,
    DEFAULT_CHECK_INTERVAL,
    PauseOptions,
    LastChanceOptions
} = require('./Constants.js');
const GiveawaysManager = require('./Manager.js');
const { validateEmbedColor } = require('./utils.js');
const { MessageFlags } = require('discord.js');

const customDeepmerge = deepmergeCustom({ mergeArrays: false });


class Giveaway extends EventEmitter {

    constructor(manager, options) {
        super();

        this.manager = manager;

        this.endTimeout = null;

        this.client = manager.client;

        this.prize = options.prize;

        this.startAt = options.startAt;

        this.endAt = options.endAt ?? Infinity;

        this.ended = options.ended ?? false;

        this.channelId = options.channelId;

        this.messageId = options.messageId;

        this.guildId = options.guildId;

        this.winnerCount = options.winnerCount;

        this.winnerIds = options.winnerIds ?? [];

        this.hostedBy = options.hostedBy;

        this.messages = options.messages;

        this.thumbnail = options.thumbnail;

        this.image = options.image;

        this.extraData = options.extraData;

        this.allowedMentions = options.allowedMentions;

        this.options = options;

        this.message = null;
    }


    get messageURL() {
        return `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.messageId}`;
    }


    get remainingTime() {
        return this.endAt - Date.now();
    }


    get duration() {
        return this.endAt - this.startAt;
    }


    get embedColor() {
        return this.options.embedColor ?? this.manager.options.default.embedColor;
    }


    get embedColorEnd() {
        return this.options.embedColorEnd ?? this.manager.options.default.embedColorEnd;
    }


    get reaction() {
        if (!this.options.reaction && this.message) {
            const emoji = Discord.resolvePartialEmoji(this.manager.options.default.reaction);
            if (!this.message.reactions.cache.has(emoji.id ?? emoji.name)) {
                const reaction = this.message.reactions.cache.reduce(
                    (prev, curr) => (curr.count > prev.count ? curr : prev),
                    { count: 0 }
                );
                this.options.reaction = reaction.emoji?.id ?? reaction.emoji?.name;
            }
        }
        return this.options.reaction ?? this.manager.options.default.reaction;
    }


    get botsCanWin() {
        return typeof this.options.botsCanWin === 'boolean'
            ? this.options.botsCanWin
            : this.manager.options.default.botsCanWin;
    }


    get exemptPermissions() {
        return this.options.exemptPermissions ?? this.manager.options.default.exemptPermissions;
    }


    get lastChance() {
        return deepmerge(this.manager.options.default.lastChance, this.options.lastChance ?? {});
    }


    get pauseOptions() {
        return deepmerge(PauseOptions, this.options.pauseOptions ?? {});
    }


    get bonusEntries() {
        return eval(this.options.bonusEntries) ?? [];
    }


    get isDrop() {
        return this.options.isDrop ?? false;
    }


    get exemptMembersFunction() {
        return this.options.exemptMembers
            ? typeof this.options.exemptMembers === 'string' &&
                this.options.exemptMembers.includes('function anonymous')
                ? eval(`(${this.options.exemptMembers})`)
                : eval(this.options.exemptMembers)
            : null;
    }


    get messageReaction() {
        const emoji = Discord.resolvePartialEmoji(this.reaction);
        return (
            this.message?.reactions.cache.find((r) =>
                [r.emoji.name, r.emoji.id].filter(Boolean).includes(emoji?.name ?? emoji?.id)
            ) ?? null
        );
    }


    async exemptMembers(member) {
        if (typeof this.exemptMembersFunction === 'function') {
            try {
                const result = await this.exemptMembersFunction(member, this);
                return result;
            } catch (err) {
                console.error(
                    `Giveaway message Id: ${this.messageId}\n${serialize(this.exemptMembersFunction)}\n${err}`
                );
                return false;
            }
        }
        if (typeof this.manager.options.default.exemptMembers === 'function') {
            return await this.manager.options.default.exemptMembers(member, this);
        }
        return false;
    }


    get data() {
        return {
            messageId: this.messageId,
            channelId: this.channelId,
            guildId: this.guildId,
            startAt: this.startAt,
            endAt: this.endAt,
            ended: this.ended,
            winnerCount: this.winnerCount,
            prize: this.prize,
            messages: this.messages,
            thumbnail: this.thumbnail,
            image: this.image,
            hostedBy: this.options.hostedBy,
            embedColor: this.options.embedColor,
            embedColorEnd: this.options.embedColorEnd,
            botsCanWin: this.options.botsCanWin,
            exemptPermissions: this.options.exemptPermissions,
            exemptMembers:
                !this.options.exemptMembers || typeof this.options.exemptMembers === 'string'
                    ? this.options.exemptMembers || undefined
                    : serialize(this.options.exemptMembers),
            bonusEntries:
                !this.options.bonusEntries || typeof this.options.bonusEntries === 'string'
                    ? this.options.bonusEntries || undefined
                    : serialize(this.options.bonusEntries),
            reaction: this.options.reaction,
            winnerIds: this.winnerIds.length ? this.winnerIds : undefined,
            participants: this.options.participants || [],
            extraData: this.extraData,
            lastChance: this.options.lastChance,
            pauseOptions: this.options.pauseOptions,
            isDrop: this.options.isDrop || undefined,
            allowedMentions: this.allowedMentions
        };
    }


    ensureEndTimeout() {
        if (this.endTimeout) return;
        if (this.remainingTime > (this.manager.options.forceUpdateEvery || DEFAULT_CHECK_INTERVAL)) return;
        this.endTimeout = setTimeout(
            () => this.manager.end.call(this.manager, this.messageId).catch(() => { }),
            this.remainingTime
        );
    }


    fillInString(string) {
        if (typeof string !== 'string') return null;
        [...new Set(string.match(/\{[^{}]{1,}\}/g))]
            .filter((match) => match?.slice(1, -1).trim() !== '')
            .forEach((match) => {
                let replacer;
                try {
                    replacer = eval(match.slice(1, -1));
                } catch {
                    replacer = match;
                }
                string = string.replaceAll(match, replacer);
            });
        return string.trim();
    }


    fillInEmbed(embed) {
        if (!embed || typeof embed !== 'object') return null;
        embed = Discord.EmbedBuilder.from(embed);
        embed.setTitle(this.fillInString(embed.data.title));
        embed.setDescription(this.fillInString(embed.data.description));
        if (typeof embed.data.author?.name === 'string')
            embed.data.author.name = this.fillInString(embed.data.author.name);
        if (typeof embed.data.footer?.text === 'string')
            embed.data.footer.text = this.fillInString(embed.data.footer.text);
        if (embed.data.fields?.length)
            embed.spliceFields(
                0,
                embed.data.fields.length,
                ...embed.data.fields.map((f) => {
                    f.name = this.fillInString(f.name);
                    f.value = this.fillInString(f.value);
                    return f;
                })
            );
        return embed;
    }


    fillInComponents(components) {
        if (!Array.isArray(components)) return null;
        return components.map((row) => {
            row = Discord.ActionRowBuilder.from(row);
            row.components = row.components.map((component) => {
                component.data.custom_id &&= this.fillInString(component.data.custom_id);
                component.data.label &&= this.fillInString(component.data.label);
                component.data.url &&= this.fillInString(component.data.url);
                component.data.placeholder &&= this.fillInString(component.data.placeholder);
                component.data.options &&= component.data.options.map((options) => {
                    options.label = this.fillInString(options.label);
                    options.value = this.fillInString(options.value);
                    options.description &&= this.fillInString(options.description);
                    return options;
                });
                return component;
            });
            return row;
        });
    }


    async fetchMessage() {
        return new Promise(async (resolve, reject) => {
            let tryLater = true;
            const channel = await this.client.channels.fetch(this.channelId).catch((err) => {
                if (err.code === 10003) tryLater = false;
            });
            const message = await channel?.messages.fetch(this.messageId).catch((err) => {
                if (err.code === 10008) tryLater = false;
            });
            if (!message) {
                if (!tryLater) {
                    this.manager.giveaways = this.manager.giveaways.filter((g) => g.messageId !== this.messageId);
                    await this.manager.deleteGiveaway(this.messageId);
                }
                return reject(
                    'Unable to fetch message with Id ' + this.messageId + '.' + (tryLater ? ' Try later!' : '')
                );
            }
            resolve(message);
        });
    }


    async fetchAllEntrants() {
        return new Promise(async (resolve, reject) => {
            const userCollection = new Discord.Collection();
            const participants = this.options.participants || [];

            for (const id of participants) {
                const u = this.client.users.cache.get(id) || await this.client.users.fetch(id).catch(() => { });
                if (u && (!u.bot || u.bot === this.botsCanWin) && u.id !== this.client.user.id) {
                    userCollection.set(u.id, u);
                }
            }
            resolve(userCollection);
        });
    }


    async checkWinnerEntry(user, stats = null) {
        if (this.winnerIds.includes(user.id)) return false;
        this.message ??= await this.fetchMessage().catch(() => { });
        const member = await this.message?.guild.members.fetch(user.id).catch(() => { });
        if (!member) return false;

        const exemptMember = await this.exemptMembers(member, stats); // stats passed to exemptMembers
        if (exemptMember) return false;

        if (this.extraData) {
            if (this.extraData.staffOnly && !member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
                const ConfigManager = require("../../../Core/Handlers/ConfigManager");
                if (!ConfigManager.isOwner(member) && !(ConfigManager.get("Roles.Ban_Staff") || []).some(roleId => member.roles.cache.has(roleId))) return false;
            }
        }

        const hasPermission = this.exemptPermissions.some((permission) => member.permissions.has(permission));
        if (hasPermission) return false;

        return true;
    }


    async checkBonusEntries(user) {
        this.message ??= await this.fetchMessage().catch(() => { });
        const member = await this.message?.guild.members.fetch(user.id).catch(() => { });
        if (!member) return 0;
        const entries = [0];
        const cumulativeEntries = [];

        if (this.bonusEntries.length) {
            for (const obj of this.bonusEntries) {
                if (typeof obj.bonus === 'function') {
                    try {
                        const result = await obj.bonus.apply(this, [member, this]);
                        if (Number.isInteger(result) && result > 0) {
                            if (obj.cumulative) cumulativeEntries.push(result);
                            else entries.push(result);
                        }
                    } catch (err) {
                        console.error(`Giveaway message Id: ${this.messageId}\n${serialize(obj.bonus)}\n${err}`);
                    }
                }
            }
        }

        if (cumulativeEntries.length) entries.push(cumulativeEntries.reduce((a, b) => a + b));
        return Math.max(...entries);
    }


    async roll(winnerCount = this.winnerCount) {
        if (!this.message) return [];

        let guild = this.message.guild;

        if (new Discord.IntentsBitField(this.client.options.intents).has(Discord.IntentsBitField.Flags.GuildMembers)) {
            if (this.client.shard && !guild.shard) {
                guild = (await this.client.guilds.fetch(guild.id).catch(() => { })) ?? guild;
                this.message = (await this.fetchMessage().catch(() => { })) ?? this.message;
            }
            await guild.members.fetch().catch(() => { });
        }

        const users = await this.fetchAllEntrants().catch(() => { });
        if (!users?.size) return [];

        const GiveawayStats = require("../../../Core/Database/GiveawayStats");
        const allStatsList = await GiveawayStats.find({ giveawayId: this.messageId }).lean().exec();
        const statsMap = new Map();
        allStatsList.forEach(s => statsMap.set(s.userId, s));

        const validUsersFiltered = [];
        const usersArray = [...users.values()];
        for (const u of usersArray) {
            const stats = statsMap.get(u.id);
            if (await this.checkWinnerEntry(u, stats)) {
                validUsersFiltered.push(u);
            }
        }

        if (validUsersFiltered.length === 0) return [];

        let userArray = [...validUsersFiltered];
        if (!this.isDrop && this.bonusEntries.length) {
            for (const user of validUsersFiltered) {
                const highestBonusEntries = await this.checkBonusEntries(user);
                for (let i = 0; i < highestBonusEntries; i++) userArray.push(user);
            }
        }

        const winners = [];
        const amountToPick = Math.min(winnerCount, validUsersFiltered.length);

        for (let i = 0; i < amountToPick; i++) {
            if (userArray.length === 0) break;
            const randomIndex = Math.floor(Math.random() * userArray.length);
            const selectedUser = userArray[randomIndex];

            if (!winners.some(w => w.id === selectedUser.id)) {
                winners.push(selectedUser);
            } else {
                userArray = userArray.filter(u => u.id !== selectedUser.id);
                i--;
                continue;
            }
            userArray = userArray.filter(u => u.id !== selectedUser.id);
        }

        const members = await Promise.all(winners.map(async (user) => await guild.members.fetch(user.id).catch(() => { })));
        return members.filter(Boolean);
    }


    edit(options = {}) {
        return new Promise(async (resolve, reject) => {
            if (this.ended) return reject('Giveaway with message Id ' + this.messageId + ' is already ended.');
            this.message ??= await this.fetchMessage().catch(() => { });
            if (!this.message) return reject('Unable to fetch message with Id ' + this.messageId + '.');

            if (options.newMessages && typeof options.newMessages === 'object') {
                this.messages = customDeepmerge(this.messages, options.newMessages);
            }
            if (typeof options.newThumbnail === 'string') this.thumbnail = options.newThumbnail;
            if (typeof options.newImage === 'string') this.image = options.newImage;
            if (typeof options.newPrize === 'string') this.prize = options.newPrize;
            if (options.newExtraData) this.extraData = options.newExtraData;
            if (Number.isInteger(options.newWinnerCount) && options.newWinnerCount > 0 && !this.isDrop) {
                this.winnerCount = options.newWinnerCount;
            }
            if (Number.isFinite(options.addTime) && !this.isDrop) {
                this.endAt = this.endAt + options.addTime;
                if (this.endTimeout) clearTimeout(this.endTimeout);
                this.ensureEndTimeout();
            }
            if (Number.isFinite(options.setEndTimestamp) && !this.isDrop) this.endAt = options.setEndTimestamp;
            if (Array.isArray(options.newBonusEntries) && !this.isDrop) {
                this.options.bonusEntries = options.newBonusEntries.filter((elem) => typeof elem === 'object');
            }
            if (typeof options.newExemptMembers === 'function') {
                this.options.exemptMembers = options.newExemptMembers;
            }
            if (options.newLastChance && typeof options.newLastChance === 'object' && !this.isDrop) {
                this.options.lastChance = deepmerge(this.options.lastChance || {}, options.newLastChance);
            }

            await this.manager.editGiveaway(this.messageId, this.data);
            if (this.remainingTime <= 0) this.manager.end(this.messageId).catch(() => { });
            else {
                const v2 = this.manager.generateMainComponents(this);
                await this.message
                    .edit({
                        flags: [MessageFlags.IsComponentsV2],
                        components: v2,
                        allowedMentions: this.allowedMentions
                    })
                    .catch(() => { });
            }
            resolve(this);
        });
    }


    end(noWinnerMessage = null) {
        return new Promise(async (resolve, reject) => {
            if (this.ended || this._ending) return reject('Giveaway with message Id ' + this.messageId + ' is already ended or ending');
            this._ending = true;

            if (this.endTimeout) {
                clearTimeout(this.endTimeout);
                this.endTimeout = null;
            }

            this.ended = true;

            this.message = await this.fetchMessage().catch((err) => {
                if (err.includes('Try later!')) {
                    this.ended = false;
                    this._ending = false;
                }
                return reject(err);
            });
            if (!this.message) return;

            if (this.endAt < this.client.readyTimestamp || this.isDrop || this.options.pauseOptions?.isPaused) {
                this.endAt = Date.now();
            }
            if (this.options.pauseOptions?.isPaused) this.options.pauseOptions.isPaused = false;
            await this.manager.editGiveaway(this.messageId, this.data);
            const winners = await this.roll();

            const channel =
                this.message.channel.isThread() && !this.message.channel.sendable
                    ? this.message.channel.parent
                    : this.message.channel;

            if (winners.length > 0) {
                this.winnerIds = winners.map((w) => w.id);
                await this.manager.editGiveaway(this.messageId, this.data);
                const v2End = this.manager.generateEndComponents(this, winners);
                await this.message
                    .edit({
                        flags: [MessageFlags.IsComponentsV2],
                        components: v2End,
                        allowedMentions: this.allowedMentions
                    })
                    .catch(() => { });

                let formattedWinners = winners.map((w) => `<@${w.id}>`).join(', ');
                const winMessage = this.fillInString(this.messages.winMessage.content || this.messages.winMessage);
                const message = winMessage?.replace('{winners}', formattedWinners);
                const components = this.fillInComponents(this.messages.winMessage.components);

                if (message?.length > 2000) {
                    const firstContentPart = winMessage.slice(0, winMessage.indexOf('{winners}'));
                    if (firstContentPart.length) {
                        channel.send({
                            content: firstContentPart,
                            allowedMentions: this.allowedMentions,
                            reply: {
                                messageReference:
                                    typeof this.messages.winMessage.replyToGiveaway === 'boolean'
                                        ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                                failIfNotExists: false
                            }
                        });
                    }
                    while (formattedWinners.length >= 2000) {
                        await channel.send({
                            content: formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 1999)) + ',',
                            allowedMentions: this.allowedMentions
                        });
                        formattedWinners = formattedWinners.slice(
                            formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 1999) + 2).length
                        );
                    }
                    channel.send({ content: formattedWinners, allowedMentions: this.allowedMentions });

                    const lastContentPart = winMessage.slice(winMessage.indexOf('{winners}') + 9);
                    if (lastContentPart.length) {
                        channel.send({
                            content: lastContentPart,
                            components:
                                this.messages.winMessage.embed && typeof this.messages.winMessage.embed === 'object'
                                    ? null
                                    : components,
                            allowedMentions: this.allowedMentions
                        });
                    }
                }

                const endMessage = this.fillInString(this.messages.giveawayEnded.content || this.messages.giveawayEnded);
                if (endMessage) {
                    channel.send({
                        content: endMessage,
                        allowedMentions: this.allowedMentions
                    }).catch(() => { });
                }

                if (this.messages.winMessage.embed && typeof this.messages.winMessage.embed === 'object') {
                    if (message?.length > 2000) formattedWinners = winners.map((w) => `<@${w.id}>`).join(', ');
                    const embed = this.fillInEmbed(this.messages.winMessage.embed);
                    const embedDescription = embed.data.description?.replace('{winners}', formattedWinners) ?? '';

                    if (embedDescription.length <= 4096) {
                        channel.send({
                            content: message?.length <= 2000 ? message : null,
                            embeds: [embed.setDescription(embedDescription)],
                            components,
                            allowedMentions: this.allowedMentions,
                            reply: {
                                messageReference:
                                    !(message?.length > 2000) &&
                                        typeof this.messages.winMessage.replyToGiveaway === 'boolean'
                                        ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                                failIfNotExists: false
                            }
                        });
                    } else {
                        const firstEmbed = new Discord.EmbedBuilder(embed).setDescription(
                            embed.data.description.slice(0, embed.data.description.indexOf('{winners}')) || null
                        );
                        if (Discord.embedLength(firstEmbed.data)) {
                            channel.send({
                                content: message?.length <= 2000 ? message : null,
                                embeds: [firstEmbed],
                                allowedMentions: this.allowedMentions,
                                reply: {
                                    messageReference:
                                        !(message?.length > 2000) &&
                                            typeof this.messages.winMessage.replyToGiveaway === 'boolean'
                                            ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                                    failIfNotExists: false
                                }
                            });
                        }

                        const tempEmbed = new Discord.EmbedBuilder().setColor(embed.data.color ?? null);
                        while (formattedWinners.length >= 4096) {
                            await channel.send({
                                embeds: [
                                    tempEmbed.setDescription(
                                        formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 4095)) + ','
                                    )
                                ],
                                allowedMentions: this.allowedMentions
                            });
                            formattedWinners = formattedWinners.slice(
                                formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 4095) + 2).length
                            );
                        }
                        channel.send({
                            embeds: [tempEmbed.setDescription(formattedWinners)],
                            allowedMentions: this.allowedMentions
                        });

                        const lastEmbed = tempEmbed.setDescription(
                            embed.data.description.slice(embed.data.description.indexOf('{winners}') + 9) || null
                        );
                        if (Discord.embedLength(lastEmbed.data)) {
                            channel.send({ embeds: [lastEmbed], components, allowedMentions: this.allowedMentions });
                        }
                    }
                } else if (message?.length <= 2000) {
                    channel.send({
                        content: message,
                        components,
                        allowedMentions: this.allowedMentions,
                        reply: {
                            messageReference:
                                typeof this.messages.winMessage.replyToGiveaway === 'boolean'
                                    ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                            failIfNotExists: false
                        }
                    });
                }
                resolve(winners);
            } else {
                const v2NoWin = this.manager.generateNoValidParticipantsEndComponents(this);
                await this.message
                    .edit({
                        flags: [MessageFlags.IsComponentsV2],
                        components: v2NoWin,
                        allowedMentions: this.allowedMentions
                    })
                    .catch(() => { });
                resolve([]);
            }
        });
    }


    reroll(options = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ended) return reject('Giveaway with message Id ' + this.messageId + ' is not ended.');
            this.message ??= await this.fetchMessage().catch(() => { });
            if (!this.message) return reject('Unable to fetch message with Id ' + this.messageId + '.');
            if (this.isDrop) return reject('Drop giveaways cannot get rerolled!');
            if (!options || typeof options !== 'object') return reject(`"options" is not an object (val=${options})`);
            options = deepmerge(GiveawayRerollOptions, options);
            if (options.winnerCount && (!Number.isInteger(options.winnerCount) || options.winnerCount < 1)) {
                return reject(`options.winnerCount is not a positive integer. (val=${options.winnerCount})`);
            }

            const winners = await this.roll(options.winnerCount || undefined);
            const channel =
                this.message.channel.isThread() && !this.message.channel.sendable
                    ? this.message.channel.parent
                    : this.message.channel;

            if (winners.length > 0) {
                this.winnerIds = winners.map((w) => w.id);
                await this.manager.editGiveaway(this.messageId, this.data);
                const v2Reroll = this.manager.generateEndComponents(this, winners);
                await this.message
                    .edit({
                        flags: [MessageFlags.IsComponentsV2],
                        components: v2Reroll,
                        allowedMentions: this.allowedMentions
                    })
                    .catch(() => { });

                let formattedWinners = winners.map((w) => `<@${w.id}>`).join(', ');
                const congratMessage = this.fillInString(options.messages.congrat.content || options.messages.congrat);
                const message = congratMessage?.replace('{winners}', formattedWinners);
                const components = this.fillInComponents(options.messages.congrat.components);

                if (message?.length > 2000) {
                    const firstContentPart = congratMessage.slice(0, congratMessage.indexOf('{winners}'));
                    if (firstContentPart.length) {
                        channel.send({
                            content: firstContentPart,
                            allowedMentions: this.allowedMentions,
                            reply: {
                                messageReference:
                                    typeof options.messages.congrat.replyToGiveaway === 'boolean'
                                        ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                                failIfNotExists: false
                            }
                        });
                    }

                    while (formattedWinners.length >= 2000) {
                        await channel.send({
                            content: formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 1999)) + ',',
                            allowedMentions: this.allowedMentions
                        });
                        formattedWinners = formattedWinners.slice(
                            formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 1999) + 2).length
                        );
                    }
                    channel.send({ content: formattedWinners, allowedMentions: this.allowedMentions });

                    const lastContentPart = congratMessage.slice(congratMessage.indexOf('{winners}') + 9);
                    if (lastContentPart.length) {
                        channel.send({
                            content: lastContentPart,
                            components:
                                options.messages.congrat.embed && typeof options.messages.congrat.embed === 'object'
                                    ? null
                                    : components,
                            allowedMentions: this.allowedMentions
                        });
                    }
                }

                if (options.messages.congrat.embed && typeof options.messages.congrat.embed === 'object') {
                    if (message?.length > 2000) formattedWinners = winners.map((w) => `<@${w.id}>`).join(', ');
                    const embed = this.fillInEmbed(options.messages.congrat.embed);
                    const embedDescription = embed.data.description?.replace('{winners}', formattedWinners) ?? '';
                    if (embedDescription.length <= 4096) {
                        channel.send({
                            content: message?.length <= 2000 ? message : null,
                            embeds: [embed.setDescription(embedDescription)],
                            components,
                            allowedMentions: this.allowedMentions,
                            reply: {
                                messageReference:
                                    !(message?.length > 2000) &&
                                        typeof options.messages.congrat.replyToGiveaway === 'boolean'
                                        ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                                failIfNotExists: false
                            }
                        });
                    } else {
                        const firstEmbed = new Discord.EmbedBuilder(embed).setDescription(
                            embed.data.description.slice(0, embed.data.description.indexOf('{winners}')) || null
                        );
                        if (Discord.embedLength(firstEmbed.toJSON())) {
                            channel.send({
                                content: message?.length <= 2000 ? message : null,
                                embeds: [firstEmbed],
                                allowedMentions: this.allowedMentions,
                                reply: {
                                    messageReference:
                                        !(message?.length > 2000) &&
                                            typeof options.messages.congrat.replyToGiveaway === 'boolean'
                                            ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                                    failIfNotExists: false
                                }
                            });
                        }

                        const tempEmbed = new Discord.EmbedBuilder().setColor(embed.data.color ?? null);
                        while (formattedWinners.length >= 4096) {
                            await channel.send({
                                embeds: [
                                    tempEmbed.setDescription(
                                        formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 4095)) + ','
                                    )
                                ],
                                allowedMentions: this.allowedMentions
                            });
                            formattedWinners = formattedWinners.slice(
                                formattedWinners.slice(0, formattedWinners.lastIndexOf(',', 4095) + 2).length
                            );
                        }
                        channel.send({
                            embeds: [tempEmbed.setDescription(formattedWinners)],
                            allowedMentions: this.allowedMentions
                        });

                        const lastEmbed = tempEmbed.setDescription(
                            embed.data.description.slice(embed.data.description.indexOf('{winners}') + 9) || null
                        );
                        if (Discord.embedLength(lastEmbed.toJSON())) {
                            channel.send({ embeds: [lastEmbed], components, allowedMentions: this.allowedMentions });
                        }
                    }
                } else if (message?.length <= 2000) {
                    channel.send({
                        content: message,
                        components,
                        allowedMentions: this.allowedMentions,
                        reply: {
                            messageReference:
                                typeof options.messages.congrat.replyToGiveaway === 'boolean'
                                    ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                            failIfNotExists: false
                        }
                    });
                }
                resolve(winners);
            } else {
                if (options.messages.replyWhenNoWinner !== false) {
                    const embed = this.fillInEmbed(options.messages.error.embed);
                    channel.send({
                        content: this.fillInString(options.messages.error.content || options.messages.error),
                        embeds: embed ? [embed] : null,
                        components: this.fillInComponents(options.messages.error.components),
                        allowedMentions: this.allowedMentions,
                        reply: {
                            messageReference:
                                typeof options.messages.error.replyToGiveaway === 'boolean'
                                    ? (this.message && !this.message.deleted ? this.messageId : undefined) : undefined,
                            failIfNotExists: false
                        }
                    });
                }
                resolve([]);
            }
        });
    }


    pause(options = {}) {
        return new Promise(async (resolve, reject) => {
            if (this.ended) return reject('Giveaway with message Id ' + this.messageId + ' is already ended.');
            this.message ??= await this.fetchMessage().catch(() => { });
            if (!this.message) return reject('Unable to fetch message with Id ' + this.messageId + '.');
            if (this.pauseOptions.isPaused) {
                return reject('Giveaway with message Id ' + this.messageId + ' is already paused.');
            }
            if (this.isDrop) return reject('Drop giveaways cannot get paused!');
            if (this.endTimeout) clearTimeout(this.endTimeout);

            const pauseOptions = this.options.pauseOptions || {};
            if (typeof options.content === 'string') pauseOptions.content = options.content;
            if (Number.isFinite(options.unpauseAfter)) {
                if (options.unpauseAfter < Date.now()) {
                    pauseOptions.unpauseAfter = Date.now() + options.unpauseAfter;
                    this.endAt = this.endAt + options.unpauseAfter;
                } else {
                    pauseOptions.unpauseAfter = options.unpauseAfter;
                    this.endAt = this.endAt + options.unpauseAfter - Date.now();
                }
            } else {
                delete pauseOptions.unpauseAfter;
                pauseOptions.durationAfterPause = this.remainingTime;
                this.endAt = Infinity;
            }
            if (validateEmbedColor(options.embedColor)) {
                pauseOptions.embedColor = options.embedColor;
            }
            if (typeof options.infiniteDurationText === 'string') {
                pauseOptions.infiniteDurationText = options.infiniteDurationText;
            }
            pauseOptions.isPaused = true;
            this.options.pauseOptions = pauseOptions;

            await this.manager.editGiveaway(this.messageId, this.data);
            const v2Pause = this.manager.generateMainComponents(this);
            await this.message
                .edit({
                    flags: [MessageFlags.IsComponentsV2],
                    components: v2Pause,
                    allowedMentions: this.allowedMentions
                })
                .catch(() => { });
            resolve(this);
        });
    }


    unpause() {
        return new Promise(async (resolve, reject) => {
            if (this.ended) return reject('Giveaway with message Id ' + this.messageId + ' is already ended.');
            this.message ??= await this.fetchMessage().catch(() => { });
            if (!this.message) return reject('Unable to fetch message with Id ' + this.messageId + '.');
            if (!this.pauseOptions.isPaused) {
                return reject('Giveaway with message Id ' + this.messageId + ' is not paused.');
            }
            if (this.isDrop) return reject('Drop giveaways cannot get unpaused!');

            if (Number.isFinite(this.pauseOptions.durationAfterPause)) {
                this.endAt = Date.now() + this.pauseOptions.durationAfterPause;
            }
            delete this.options.pauseOptions.unpauseAfter;
            this.options.pauseOptions.isPaused = false;

            this.ensureEndTimeout();

            await this.manager.editGiveaway(this.messageId, this.data);
            const v2Unpause = this.manager.generateMainComponents(this);
            await this.message
                .edit({
                    flags: [MessageFlags.IsComponentsV2],
                    components: v2Unpause,
                    allowedMentions: this.allowedMentions
                })
                .catch(() => { });
            resolve(this);
        });
    }
}

module.exports = Giveaway;
