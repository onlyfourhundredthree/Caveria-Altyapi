const { EventEmitter } = require('node:events');
const { setTimeout, setInterval } = require('node:timers');

const giveawayModel = require("../../../Core/Database/Giveaways");
const ConfigManager = require("../../../Core/Handlers/ConfigManager");

const Discord = require('discord.js');
const { deepmerge } = require('deepmerge-ts');

const {
    GiveawayMessages,
    GiveawayRerollOptions,
    GiveawaysManagerOptions,
    DEFAULT_CHECK_INTERVAL,
    DELETE_DROP_DATA_AFTER,
    PauseOptions,
    LastChanceOptions
} = require('./Constants.js');
const Giveaway = require('./Giveaway.js');
const { validateEmbedColor } = require('./utils.js');



class GiveawaysManager extends EventEmitter {

    constructor(client, options, init = true) {
        super();
        if (!client?.options) throw new Error(`Client is a required option. (val=${client})`);
        if (
            !new Discord.IntentsBitField(client.options.intents).has(
                Discord.IntentsBitField.Flags.GuildMessageReactions
            )
        ) {
            throw new Error('Client is missing the "GuildMessageReactions" intent.');
        }


        this.client = client;

        this.ready = false;

        this.giveaways = [];

        this.options = deepmerge(GiveawaysManagerOptions, options || {});

        if (init) this._init();
    }


    _parseEmojiId(emojiStr) {
        if (!emojiStr) return null;
        const match = emojiStr.match(/:\d+>/) || emojiStr.match(/:(\d+)>/);
        return match ? match[1] : null;
    }

    _parseEmojiObj(emojiStr, fallback) {
        if (!emojiStr || typeof emojiStr !== 'string' || emojiStr.trim() === '') return { name: fallback };
        const m = emojiStr.match(/<a?:(.+):(\d+)>/);
        if (m) return { name: m[1], id: m[2] };
        return { name: emojiStr };
    }


    generateMainComponents(giveaway, lastChanceEnabled = false) {
        const confetti = ConfigManager.get("Emojis").confetti || "";
        const onayStr = ConfigManager.get("Emojis").toji_onay || "";

        const title = typeof giveaway.messages.title === 'string' ? giveaway.messages.title : giveaway.prize;

        const components = [];

        components.push({ type: 10, content: `# ${confetti} ${giveaway.fillInString(title)} ${confetti}` });
        components.push({ type: 14, divider: true, spacing: 1 });

        const participantsCount = (giveaway.options.participants || []).length;
        let topDesc = '';
        if (giveaway.isDrop) {
            topDesc = giveaway.messages.dropMessage;
        } else {
            if (giveaway.pauseOptions.isPaused) {
                topDesc += `**${giveaway.pauseOptions.content}**\n\n`;
            } else if (lastChanceEnabled) {
                topDesc += `**${giveaway.lastChance.content}**\n\n`;
            }
            topDesc += `### ${giveaway.messages.inviteToParticipate}`;
        }

        components.push({
            type: 9,
            components: [
                { type: 10, content: giveaway.fillInString(topDesc) }
            ],
            accessory: {
                type: 2,
                custom_id: 'giveaway_join',
                style: 1, // PRIMARY
                label: `Katıl (${participantsCount})`,
                emoji: this._parseEmojiObj(onayStr, "🎉")
            }
        });


        let infoDesc = `> **Kalan Süre:** ${giveaway.messages.drawing.replace(
            '{timestamp}',
            giveaway.endAt === Infinity
                ? giveaway.pauseOptions.infiniteDurationText
                : `<t:${Math.round(giveaway.endAt / 1000)}:R> (<t:${Math.round(giveaway.endAt / 1000)}:f>)`
        )}`;

        if (giveaway.hostedBy) {
            infoDesc += `\n> **Çekilişi Başlatan:** ${giveaway.hostedBy}`;
        }
        components.push({ type: 10, content: giveaway.fillInString(infoDesc) });

        if (giveaway.extraData && (giveaway.extraData.minMessages || giveaway.extraData.minVoiceTime || giveaway.extraData.minVotes || giveaway.extraData.minReviews || giveaway.extraData.minInvites || giveaway.extraData.staffOnly)) {
            const nokta = ConfigManager.get("Emojis").toji_nokta || "•";
            let reqDesc = `### ${ConfigManager.get("Emojis").toji_info || "ℹ️"} Çekiliş Gereksinimleri\n*Aşağıdaki şartları karşılamanız gerekmektedir;*\n`;

            if (giveaway.extraData.minMessages) reqDesc += `> ${nokta} **Mesaj:** En az \`${giveaway.extraData.minMessages}\` mesaj\n`;
            if (giveaway.extraData.minVoiceTime) {
                const ms = require("ms");
                reqDesc += `> ${nokta} **Ses:** En az \`${ms(giveaway.extraData.minVoiceTime, { long: true })}\` sesli kanal aktivitesi\n`;
            }
            if (giveaway.extraData.minVotes) reqDesc += `> ${nokta} **Oy:** En az \`${giveaway.extraData.minVotes}\` Top.gg oyu\n`;
            if (giveaway.extraData.minReviews) reqDesc += `> ${nokta} **Yorum:** En az \`${giveaway.extraData.minReviews}\` Top.gg yorumu\n`;
            if (giveaway.extraData.minInvites) reqDesc += `> ${nokta} **Davet:** En az \`${giveaway.extraData.minInvites}\` üye daveti\n`;
            if (giveaway.extraData.staffOnly) reqDesc += `> ${nokta} **Yetki:** Sadece \`Yönetim/Ekip\` üyeleri\n`;

            components.push({ type: 14, divider: true, spacing: 1 });
            components.push({ type: 10, content: reqDesc });
        }

        if (giveaway.thumbnail || giveaway.image) {
            const items = [];
            if (giveaway.image) items.push({ media: { url: giveaway.image }, spoiler: false });
            if (giveaway.thumbnail) items.push({ media: { url: giveaway.thumbnail }, spoiler: false });
            if (items.length > 0) {
                components.push({ type: 12, items });
            }
        }

        const footerText = giveaway.messages.embedFooter?.text ??
            (typeof giveaway.messages.embedFooter === 'string' ? giveaway.messages.embedFooter : '');

        if (footerText) {
            components.push({ type: 14, divider: true, spacing: 1 });
            components.push({ type: 10, content: `-# ${giveaway.fillInString(footerText)}` });
        }

        return [{ type: 17, components }];
    }


    generateEndComponents(giveaway, winners) {
        const confetti = ConfigManager.get("Emojis").confetti || "";

        let formattedWinners = winners.map((w) => `${w}`).join(', ');
        const strings = {
            winners: giveaway.fillInString(giveaway.messages.winners),
            endedAt: giveaway.fillInString(giveaway.messages.endedAt),
            title: giveaway.fillInString(giveaway.messages.title) ?? giveaway.fillInString(giveaway.prize)
        };

        const timestampStr = `<t:${Math.round((giveaway.endAt || Date.now()) / 1000)}:R>`;

        const components = [];
        components.push({ type: 10, content: `# ${confetti} Çekiliş Sona Erdi! ${confetti}` });
        components.push({ type: 10, content: `### ${strings.title}` });
        components.push({ type: 14, divider: true, spacing: 1 });

        let infoDesc = `> **${strings.winners}** ${formattedWinners}`;
        if (giveaway.hostedBy) {
            infoDesc += `\n> **Çekilişi Başlatan:** ${giveaway.hostedBy}`;
        }
        components.push({ type: 10, content: giveaway.fillInString(infoDesc) });

        components.push({ type: 14, divider: true, spacing: 1 });
        components.push({ type: 10, content: `-# ${strings.endedAt} ${timestampStr}` });

        return [{ type: 17, components }];
    }


    generateNoValidParticipantsEndComponents(giveaway) {
        const title = typeof giveaway.messages.title === 'string' ? giveaway.messages.title : giveaway.prize;
        let desc = `-# **${giveaway.messages.noWinner}**`;

        const timestampStr = `<t:${Math.round((giveaway.endAt || Date.now()) / 1000)}:R>`;

        const components = [
            { type: 10, content: `# Çekiliş Sona Erdi!` },
            { type: 10, content: `### ${giveaway.fillInString(title)}` },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: `>>> ${giveaway.fillInString(desc)}` },
            { type: 14, divider: true, spacing: 1 },
            { type: 10, content: `-# ${giveaway.fillInString(giveaway.messages.endedAt)} ${timestampStr}` }
        ];

        return [{ type: 17, components }];
    }


    end(messageId, noWinnerMessage = null) {
        return new Promise(async (resolve, reject) => {
            const giveaway = this.giveaways.find((g) => g.messageId === messageId);
            if (!giveaway) return reject('No giveaway found with message Id ' + messageId + '.');

            giveaway
                .end(noWinnerMessage)
                .then((winners) => {
                    this.emit('giveawayEnded', giveaway, winners);
                    resolve(winners);
                })
                .catch(reject);
        });
    }


    start(channel, options) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) return reject('The manager is not ready yet.');
            if (!channel?.id || !channel.isTextBased()) {
                return reject(`channel is not a valid text based channel. (val=${channel})`);
            }
            if (channel.isThread() && !channel.sendable) {
                return reject(
                    `The manager is unable to send messages in the provided ThreadChannel. (id=${channel.id})`
                );
            }
            if (typeof options.prize !== 'string' || (options.prize = options.prize.trim()).length > 256) {
                return reject(`options.prize is not a string or longer than 256 characters. (val=${options.prize})`);
            }
            if (!Number.isInteger(options.winnerCount) || options.winnerCount < 1) {
                return reject(`options.winnerCount is not a positive integer. (val=${options.winnerCount})`);
            }
            if (options.isDrop && typeof options.isDrop !== 'boolean') {
                return reject(`options.isDrop is not a boolean. (val=${options.isDrop})`);
            }
            if (!options.isDrop && (!Number.isFinite(options.duration) || options.duration < 1)) {
                return reject(`options.duration is not a positive number. (val=${options.duration})`);
            }

            const giveaway = new Giveaway(this, {
                startAt: Date.now(),
                endAt: options.isDrop ? Infinity : Date.now() + options.duration,
                winnerCount: options.winnerCount,
                channelId: channel.id,
                guildId: channel.guildId,
                prize: options.prize,
                hostedBy: options.hostedBy ? options.hostedBy.toString() : undefined,
                messages:
                    options.messages && typeof options.messages === 'object'
                        ? deepmerge(GiveawayMessages, options.messages)
                        : GiveawayMessages,
                thumbnail: typeof options.thumbnail === 'string' ? options.thumbnail : undefined,
                image: typeof options.image === 'string' ? options.image : undefined,
                reaction: Discord.resolvePartialEmoji(options.reaction) ? options.reaction : undefined,
                botsCanWin: typeof options.botsCanWin === 'boolean' ? options.botsCanWin : undefined,
                exemptPermissions: Array.isArray(options.exemptPermissions) ? options.exemptPermissions : undefined,
                exemptMembers: typeof options.exemptMembers === 'function' ? options.exemptMembers : undefined,
                bonusEntries:
                    Array.isArray(options.bonusEntries) && !options.isDrop
                        ? options.bonusEntries.filter((elem) => typeof elem === 'object')
                        : undefined,
                embedColor: validateEmbedColor(options.embedColor) ? options.embedColor : undefined,
                embedColorEnd: validateEmbedColor(options.embedColorEnd) ? options.embedColorEnd : undefined,
                extraData: options.extraData,
                lastChance:
                    options.lastChance && typeof options.lastChance === 'object' && !options.isDrop
                        ? options.lastChance
                        : undefined,
                pauseOptions:
                    options.pauseOptions && typeof options.pauseOptions === 'object' && !options.isDrop
                        ? options.pauseOptions
                        : undefined,
                allowedMentions:
                    options.allowedMentions && typeof options.allowedMentions === 'object'
                        ? options.allowedMentions
                        : undefined,
                isDrop: options.isDrop
            });

            const v2components = this.generateMainComponents(giveaway);
            const message = await channel.send({
                flags: [Discord.MessageFlags.IsComponentsV2],
                components: v2components,
                allowedMentions: giveaway.allowedMentions
            });
            giveaway.messageId = message.id;
            giveaway.message = message;
            this.giveaways.push(giveaway);
            await this.saveGiveaway(giveaway.messageId, giveaway.data);
            resolve(giveaway);
            if (giveaway.isDrop) {
                message
                    .awaitReactions({
                        filter: async (r, u) =>
                            u.id !== this.client.user.id &&
                            (await giveaway.checkWinnerEntry(u)),
                        maxUsers: giveaway.winnerCount
                    })
                    .then(() => this.end(giveaway.messageId))
                    .catch(() => { });
            }
        });
    }


    reroll(messageId, options = {}) {
        return new Promise(async (resolve, reject) => {
            const giveaway = this.giveaways.find((g) => g.messageId === messageId);
            if (!giveaway) return reject('No giveaway found with message Id ' + messageId + '.');

            giveaway
                .reroll(options)
                .then((winners) => {
                    this.emit('giveawayRerolled', giveaway, winners);
                    resolve(winners);
                })
                .catch(reject);
        });
    }


    pause(messageId, options = {}) {
        return new Promise(async (resolve, reject) => {
            const giveaway = this.giveaways.find((g) => g.messageId === messageId);
            if (!giveaway) return reject('No giveaway found with message Id ' + messageId + '.');
            giveaway.pause(options).then(resolve).catch(reject);
        });
    }


    unpause(messageId) {
        return new Promise(async (resolve, reject) => {
            const giveaway = this.giveaways.find((g) => g.messageId === messageId);
            if (!giveaway) return reject('No giveaway found with message Id ' + messageId + '.');
            giveaway.unpause().then(resolve).catch(reject);
        });
    }


    edit(messageId, options = {}) {
        return new Promise(async (resolve, reject) => {
            const giveaway = this.giveaways.find((g) => g.messageId === messageId);
            if (!giveaway) return reject('No giveaway found with message Id ' + messageId + '.');
            giveaway.edit(options).then(resolve).catch(reject);
        });
    }


    delete(messageId, doNotDeleteMessage = false) {
        return new Promise(async (resolve, reject) => {
            const giveaway = this.giveaways.find((g) => g.messageId === messageId);
            if (!giveaway) return reject('No giveaway found with message Id ' + messageId + '.');

            if (!doNotDeleteMessage) {
                giveaway.message ??= await giveaway.fetchMessage().catch(() => { });
                giveaway.message?.delete();
            }
            this.giveaways = this.giveaways.filter((g) => g.messageId !== messageId);
            await this.deleteGiveaway(messageId);
            this.emit('giveawayDeleted', giveaway);
            resolve(giveaway);
        });
    }


    async deleteGiveaway(messageId) {
        await giveawayModel.deleteOne({ messageId }).exec();
        return true;
    }


    async getAllGiveaways() {
        return await giveawayModel.find().lean().exec();
    }


    async editGiveaway(messageId, giveawayData) {
        await giveawayModel.updateOne({ messageId }, giveawayData).exec();
        return true;
    }


    async saveGiveaway(messageId, giveawayData) {
        await giveawayModel.create(giveawayData);
        return true;
    }


    _checkGiveaway() {
        if (this.giveaways.length <= 0) return;
        this.giveaways.forEach(async (giveaway) => {
            if (giveaway.ended) {
                if (
                    Number.isFinite(this.options.endedGiveawaysLifetime) &&
                    giveaway.endAt + this.options.endedGiveawaysLifetime <= Date.now()
                ) {
                    this.giveaways = this.giveaways.filter((g) => g.messageId !== giveaway.messageId);
                    await this.deleteGiveaway(giveaway.messageId);
                }
                return;
            }

            if (this.client.shard) {
                const shardId = this.client.shard.ids[0];
                if (shardId !== Discord.ShardClientUtil.shardIdForGuildId(giveaway.guildId, this.client.shard.count)) return;
            }

            if (giveaway.isDrop) {
                giveaway.message = await giveaway.fetchMessage().catch(() => { });

                if (giveaway.messageReaction?.count - 1 >= giveaway.winnerCount) {
                    const users = await giveaway.fetchAllEntrants().catch(() => { });

                    let validUsers = 0;
                    for (const user of [...(users?.values() || [])]) {
                        if (await giveaway.checkWinnerEntry(user)) validUsers++;
                        if (validUsers === giveaway.winnerCount) {
                            await this.end(giveaway.messageId).catch(() => { });
                            break;
                        }
                    }
                }

                if (giveaway.startAt + DELETE_DROP_DATA_AFTER <= Date.now()) {
                    this.giveaways = this.giveaways.filter((g) => g.messageId !== giveaway.messageId);
                    return await this.deleteGiveaway(giveaway.messageId);
                }
            }

            if (giveaway.pauseOptions.isPaused) {
                if (
                    !Number.isFinite(giveaway.pauseOptions.unpauseAfter) &&
                    !Number.isFinite(giveaway.pauseOptions.durationAfterPause)
                ) {
                    giveaway.options.pauseOptions.durationAfterPause = giveaway.remainingTime;
                    giveaway.endAt = Infinity;
                    await this.editGiveaway(giveaway.messageId, giveaway.data);
                }
                if (
                    Number.isFinite(giveaway.pauseOptions.unpauseAfter) &&
                    Date.now() > giveaway.pauseOptions.unpauseAfter
                ) {
                    return this.unpause(giveaway.messageId).catch(() => { });
                }
            }

            if (giveaway.remainingTime <= 0) return this.end(giveaway.messageId).catch(() => { });

            giveaway.ensureEndTimeout();

            if (
                giveaway.lastChance.enabled &&
                giveaway.remainingTime - giveaway.lastChance.threshold <
                (this.options.forceUpdateEvery || DEFAULT_CHECK_INTERVAL)
            ) {
                setTimeout(async () => {
                    giveaway.message ??= await giveaway.fetchMessage().catch(() => { });
                    const v2components = this.generateMainComponents(giveaway, true);
                    await giveaway.message
                        ?.edit({
                            flags: [Discord.MessageFlags.IsComponentsV2],
                            components: v2components,
                            allowedMentions: giveaway.allowedMentions
                        })
                        .catch(() => { });
                }, giveaway.remainingTime - giveaway.lastChance.threshold);
            }

            giveaway.message ??= await giveaway.fetchMessage().catch(() => { });
            if (!giveaway.message) return;
            if (!giveaway.message.embeds[0]) await giveaway.message.suppressEmbeds(false).catch(() => { });

            const lastChanceEnabled =
                giveaway.lastChance.enabled && giveaway.remainingTime < giveaway.lastChance.threshold;
            const updatedV2components = this.generateMainComponents(giveaway, lastChanceEnabled);

            if (this.options.forceUpdateEvery || true) {
                await giveaway.message
                    .edit({
                        flags: [Discord.MessageFlags.IsComponentsV2],
                        components: updatedV2components,
                        allowedMentions: giveaway.allowedMentions
                    })
                    .catch(() => { });
            }
        });
    }


    async _handleRawPacket(packet) {
        if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
        if (packet.d.user_id === this.client.user.id) return;

        const giveaway = this.giveaways.find((g) => g.messageId === packet.d.message_id);
        if (!giveaway || (giveaway.ended && packet.t === 'MESSAGE_REACTION_REMOVE')) return;

        const guild =
            this.client.guilds.cache.get(packet.d.guild_id) ||
            (await this.client.guilds.fetch(packet.d.guild_id).catch(() => { }));
        if (!guild || !guild.available) return;

        const member = await guild.members.fetch(packet.d.user_id).catch(() => { });
        if (!member) return;

        const channel = await this.client.channels.fetch(packet.d.channel_id).catch(() => { });
        if (!channel) return;

        const message = await channel.messages.fetch(packet.d.message_id).catch(() => { });
        if (!message) return;

        const emoji = Discord.resolvePartialEmoji(giveaway.reaction);
        const reaction = message.reactions.cache.find((r) =>
            [r.emoji.name, r.emoji.id].filter(Boolean).includes(emoji?.id ?? emoji?.name)
        );
        if (!reaction || reaction.emoji.name !== packet.d.emoji.name) return;
        if (reaction.emoji.id && reaction.emoji.id !== packet.d.emoji.id) return;

        if (packet.t === 'MESSAGE_REACTION_ADD') {
            if (giveaway.ended) return this.emit('endedGiveawayReactionAdded', giveaway, member, reaction);
            this.emit('giveawayReactionAdded', giveaway, member, reaction);

            if (giveaway.isDrop && reaction.count - 1 >= giveaway.winnerCount) {
                const users = await giveaway.fetchAllEntrants().catch(() => { });

                let validUsers = 0;
                for (const user of [...(users?.values() || [])]) {
                    if (await giveaway.checkWinnerEntry(user)) validUsers++;
                    if (validUsers === giveaway.winnerCount) {
                        await this.end(giveaway.messageId).catch(() => { });
                        break;
                    }
                }
            }
        } else this.emit('giveawayReactionRemoved', giveaway, member, reaction);
    }


    async _init() {
        let rawGiveaways = await this.getAllGiveaways();

        await (this.client.readyAt ? Promise.resolve() : new Promise((resolve) => this.client.once('ready', resolve)));

        if (this.client.shard) {
            const shardId = this.client.shard.ids[0];
            rawGiveaways = rawGiveaways.filter(
                (g) => shardId === Discord.ShardClientUtil.shardIdForGuildId(g.guildId, this.client.shard.count)
            );
        }

        rawGiveaways.forEach((giveaway) => this.giveaways.push(new Giveaway(this, giveaway)));

        setInterval(() => {
            if (this.client.readyAt) this._checkGiveaway.call(this);
        }, this.options.forceUpdateEvery || DEFAULT_CHECK_INTERVAL);
        this.ready = true;

        if (Number.isFinite(this.options.endedGiveawaysLifetime)) {
            const endedGiveaways = this.giveaways.filter(
                (g) => g.ended && g.endAt + this.options.endedGiveawaysLifetime <= Date.now()
            );
            this.giveaways = this.giveaways.filter(
                (g) => !endedGiveaways.map((giveaway) => giveaway.messageId).includes(g.messageId)
            );
            for (const giveaway of endedGiveaways) await this.deleteGiveaway(giveaway.messageId);
        }

        this.handleInteraction = async (interaction) => {
            if (!interaction.isButton()) return;

            const isJoin = interaction.customId === 'giveaway_join';
            const isLeaveConfirm = interaction.customId.startsWith('giveaway_leave_confirm_');

            if (!isJoin && !isLeaveConfirm) return;

            const messageId = isJoin ? interaction.message.id : interaction.customId.replace('giveaway_leave_confirm_', '');
            let giveaway = this.giveaways.find(g => g.messageId === messageId);

            if (!giveaway) {
                const giveawayData = await giveawayModel.findOne({ messageId }).lean().exec();
                if (giveawayData) {
                    if (this.client.shard) {
                        const shardId = this.client.shard.ids[0];
                        if (shardId !== Discord.ShardClientUtil.shardIdForGuildId(giveawayData.guildId, this.client.shard.count)) return;
                    }
                    giveaway = new Giveaway(this, giveawayData);
                    this.giveaways.push(giveaway);
                }
            }

            if (!giveaway) {
                return interaction.reply({ content: "**Bu çekiliş artık aktif değil veya sistem henüz yüklenmedi.**", flags: [Discord.MessageFlags.Ephemeral] });
            }
            if (giveaway.ended) {
                return interaction.reply({ content: "**Bu çekiliş sona ermiş.**", flags: [Discord.MessageFlags.Ephemeral] });
            }

            giveaway.options.participants = giveaway.options.participants || [];

            if (isJoin) {
                if (giveaway.options.participants.includes(interaction.user.id)) {
                    return interaction.reply({
                        flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2],
                        components: [
                            {
                                type: 17,
                                components: [
                                    {
                                        type: 10,
                                        content: `## Çekilişten Ayrıl\n**${giveaway.prize}** çekilişinden ayrılmak istediğine emin misin?`
                                    },
                                    { type: 14, divider: true, spacing: 1 },
                                    {
                                        type: 1,
                                        components: [
                                            { type: 2, style: 4, label: "Evet, Ayrıl", custom_id: `giveaway_leave_confirm_${messageId}` }
                                        ]
                                    }
                                ]
                            }
                        ]
                    });
                } else {
                    giveaway.options.participants.push(interaction.user.id);
                    await this.editGiveaway(messageId, giveaway.data);
                    this._checkGiveaway();
                    return interaction.reply({ content: "**Çekilişe başarıyla katıldın!** Şansını denemek için yerini aldın. *Not: Kazanabilmek için çekiliş şartlarını (varsa) karşılıyor olman gerekir.*", flags: [Discord.MessageFlags.Ephemeral] });
                }
            } else if (isLeaveConfirm) {
                if (!giveaway.options.participants.includes(interaction.user.id)) {
                    return interaction.update({ content: "**Zaten bu çekilişte değilsin.**", components: [], flags: [Discord.MessageFlags.Ephemeral] });
                }

                giveaway.options.participants = giveaway.options.participants.filter(id => id !== interaction.user.id);
                await this.editGiveaway(messageId, giveaway.data);
                this._checkGiveaway();
                return interaction.update({
                    flags: [Discord.MessageFlags.Ephemeral, Discord.MessageFlags.IsComponentsV2],
                    components: [
                        {
                            type: 17,
                            components: [
                                {
                                    type: 10,
                                    content: `## Başarıyla Ayrıldın\n**${giveaway.prize}** çekilişinden başarıyla ayrıldın. Artık katılımcı listesinde değilsin.`
                                }
                            ]
                        }
                    ]
                });
            }
        };
    }
}













module.exports = GiveawaysManager;
