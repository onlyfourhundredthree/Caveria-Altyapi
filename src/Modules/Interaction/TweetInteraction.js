const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const TwitterUser = require("../../Core/Database/TwitterUser");
const TwitterTweet = require("../../Core/Database/TwitterTweet");
const { renderTwitterProfile, renderTweet } = require("../../Utils/TwitterUtils");
const TwitterService = require("../../Services/Systems/TwitterService");

const cooldowns = new Map();

module.exports = async (interaction) => {
    if (!interaction.guild) return;
    const client = global.bot;

    if (interaction.isButton() && interaction.customId === "addtweet") {
        const modal = new ModalBuilder()
            .setCustomId(`tweet_modal_${interaction.user.id}`)
            .setTitle(`Tweet Oluştur`);

        const tweetInput = new TextInputBuilder()
            .setCustomId('tweetContent')
            .setLabel("Tweet içeriğinizi yazın:")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(3)
            .setMaxLength(250)
            .setRequired(true)
            .setPlaceholder("Neler oluyor?");

        modal.addComponents(new ActionRowBuilder().addComponents(tweetInput));
        await interaction.showModal(modal);
    }

    if (interaction.isButton() && interaction.customId === "twitter_profile") {
        await interaction.deferReply({ ephemeral: true });
        const attachment = await renderTwitterProfile(interaction.guild.id, interaction.user.id);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("edit_twitter_bio").setLabel("Biyografi Düzenle").setStyle(ButtonStyle.Primary)
        );
        await interaction.editReply({ files: [attachment], components: [row] });
    }

    if (interaction.isButton() && interaction.customId === "edit_twitter_bio") {
        const modal = new ModalBuilder().setCustomId(`edit_bio_modal_${interaction.user.id}`).setTitle(`Biyografi Düzenle`);
        const bioInput = new TextInputBuilder()
            .setCustomId('bioContent')
            .setLabel("Yeni Biyografiniz:")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(100)
            .setPlaceholder("Kendinden bahset...")
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(bioInput));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === `edit_bio_modal_${interaction.user.id}`) {
        const bio = interaction.fields.getTextInputValue('bioContent');
        await TwitterUser.updateOne({ guildID: interaction.guild.id, userID: interaction.user.id }, { bio: bio }, { upsert: true });
        await interaction.reply({ content: "Biyografin güncellendi! Profiline tekrar bakabilirsin.", ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith("tweet_follow_")) {
        const targetID = interaction.customId.split("_")[2];
        const result = await TwitterService.toggleFollow(interaction.guild.id, interaction.user.id, targetID);
        await interaction.reply({ content: result.message, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith("tweet_profile_")) {
        const targetID = interaction.customId.split("_")[2];
        await interaction.deferReply({ ephemeral: true });
        const attachment = await renderTwitterProfile(interaction.guild.id, targetID);
        if (!attachment) return interaction.editReply({ content: "Profil yüklenemedi." });

        const row = new ActionRowBuilder();
        if (targetID === interaction.user.id) {
            row.addComponents(new ButtonBuilder().setCustomId("edit_twitter_bio").setLabel("Biyografi Düzenle").setStyle(ButtonStyle.Primary));
        } else {
            const tUser = await TwitterUser.findOne({ guildID: interaction.guild.id, userID: targetID });
            const isFollowing = tUser?.followers.includes(interaction.user.id);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`tweet_follow_${targetID}`)
                    .setLabel(isFollowing ? 'Takibi Bırak' : 'Takip Et')
                    .setStyle(isFollowing ? ButtonStyle.Danger : ButtonStyle.Primary)
            );
        }

        await interaction.editReply({ files: [attachment], components: [row] });
    }

    if (interaction.isModalSubmit() && interaction.customId === `tweet_modal_${interaction.user.id}`) {
        await handleTweetSubmit(interaction, false, null);
    }

    if (interaction.isButton() && interaction.customId.startsWith("tweet_like_")) {
        const messageId = interaction.message.id;
        const tweet = await TwitterTweet.findOne({ messageID: messageId });
        if (!tweet) return interaction.reply({ content: "Bu tweet veritabanında bulunamadı.", ephemeral: true });

        if (tweet.likes.includes(interaction.user.id)) {
            return interaction.reply({ content: "Bu tweeti zaten beğenmişsin!", ephemeral: true });
        }

        tweet.likes.push(interaction.user.id);
        await tweet.save();

        await TwitterUser.updateOne(
            { guildID: interaction.guild.id, userID: tweet.authorID },
            { $inc: { likes: 1 } },
            { upsert: true }
        );

        await handleTweetInteractionUpdate(interaction, tweet);
    }

    if (interaction.isButton() && interaction.customId.startsWith("tweet_rtbtn_")) {
        const messageId = interaction.message.id;
        const tweet = await TwitterTweet.findOne({ messageID: messageId });
        if (!tweet) return interaction.reply({ content: "Bu tweet veritabanında bulunamadı.", ephemeral: true });

        const modal = new ModalBuilder()
            .setCustomId(`retweet_modal_${interaction.user.id}_${messageId}`)
            .setTitle(`Retweetle & Yorumla`);

        const commentInput = new TextInputBuilder()
            .setCustomId('commentContent')
            .setLabel("Yorumunuz:")
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(1)
            .setMaxLength(150)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(commentInput));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith(`retweet_modal_${interaction.user.id}`)) {
        const parts = interaction.customId.split("_");
        const originalMessageId = parts[3];

        const originalTweet = await TwitterTweet.findOne({ messageID: originalMessageId });
        if (originalTweet) {
            originalTweet.retweets += 1;
            await originalTweet.save();
            await handleTweetInteractionUpdate(interaction, originalTweet, true);
        }

        const originalImageUrl = interaction.message.attachments.first()?.url;
        await handleTweetSubmit(interaction, true, originalImageUrl);
    }
};

async function handleTweetInteractionUpdate(interaction, tweet, isQuiet = false) {
    const guild = interaction.guild;
    const authorMember = await guild.members.fetch(tweet.authorID).catch(() => null);
    if (!authorMember) return;

    const tUser = await TwitterUser.findOne({ guildID: guild.id, userID: tweet.authorID });
    const isFollowing = tUser?.followers.includes(interaction.user.id);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tweet_like_${tweet.messageID}`).setLabel(`Beğen (${tweet.likes.length})`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tweet_rtbtn_${tweet.messageID}`).setLabel(`Retweet (${tweet.retweets})`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`tweet_profile_${tweet.authorID}`).setLabel(`Profil`).setStyle(ButtonStyle.Secondary)
    );

    if (tweet.authorID !== interaction.user.id) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`tweet_follow_${tweet.authorID}`)
                .setLabel(isFollowing ? 'Takibi Bırak' : 'Takip Et')
                .setStyle(isFollowing ? ButtonStyle.Danger : ButtonStyle.Primary)
        );
    }

    const author = {
        displayName: authorMember.displayName,
        username: authorMember.user.username,
        avatarURL: authorMember.user.displayAvatarURL({ extension: 'png', size: 128 })
    };

    const attachment = await renderTweet(author, tweet.content, tweet.likes.length, tweet.retweets, tweet.isRetweet, tweet.originalImageUrl);

    if (isQuiet) {
        if (interaction.message) await interaction.message.edit({ files: [attachment], components: [row] }).catch(() => { });
    } else {
        await interaction.update({ files: [attachment], components: [row] }).catch(() => { });
    }
}

async function handleTweetSubmit(interaction, isRetweet, originalImageUrl) {
    const tweetContent = interaction.fields.getTextInputValue(isRetweet ? 'commentContent' : 'tweetContent');
    const now = Date.now();
    const cooldownAmount = 5 * 1000;

    if (cooldowns.has(interaction.user.id)) {
        const expirationTime = cooldowns.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime && cooldowns.get(interaction.user.id) !== 0) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({ content: `Tekrar tweet atmak için **${Math.ceil(timeLeft)}** saniye beklemelisin.`, ephemeral: true });
        }
    }

    cooldowns.set(interaction.user.id, now);
    setTimeout(() => cooldowns.set(interaction.user.id, 0), cooldownAmount);

    try {
        const author = {
            displayName: interaction.member.displayName,
            username: interaction.user.username,
            avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 })
        };

        const mapAttachment = await renderTweet(author, tweetContent, 0, 0, isRetweet, originalImageUrl);
        const logChannelId = require("../../Core/Handlers/ConfigManager").get("Tweet.Channel");
        const logChannel = interaction.guild.channels.cache.get(logChannelId) || interaction.channel;

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Tweetin paylaşıldı!", ephemeral: true });
        }

        const msg = await logChannel.send({
            files: [mapAttachment]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`tweet_like_${msg.id}`).setLabel(`Beğen (0)`).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`tweet_rtbtn_${msg.id}`).setLabel(`Retweet (0)`).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`tweet_profile_${interaction.user.id}`).setLabel(`Profil`).setStyle(ButtonStyle.Secondary)
        );

        await msg.edit({ components: [row] });

        await TwitterTweet.create({
            guildID: interaction.guild.id,
            messageID: msg.id,
            authorID: interaction.user.id,
            content: tweetContent,
            isRetweet: isRetweet,
            originalImageUrl: originalImageUrl
        });

        await TwitterUser.updateOne(
            { guildID: interaction.guild.id, userID: interaction.user.id },
            { $inc: { tweets: 1 } },
            { upsert: true }
        );

    } catch (err) {
        console.error("Tweet Error:", err);
    }
}
