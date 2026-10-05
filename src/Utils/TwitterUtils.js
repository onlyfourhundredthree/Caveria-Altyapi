const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const axios = require('axios');
const TwitterUser = require('../Core/Database/TwitterUser');

try {
    GlobalFonts.registerFromPath(path.join(__dirname, '../Assets/Fonts/Manrope-Bold.ttf'), 'ManropeBold');
} catch (e) {
    console.error("Font loading error:", e);
}

async function renderTwitterProfile(guildID, userID) {
    const tUser = await TwitterUser.findOne({ guildID, userID }) || { bio: "Henüz bir biyografi eklenmemiş.", followers: [], following: [], likes: 0, tweets: 0, verified: false };
    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 800, 500);

    ctx.fillStyle = '#1DA1F2';
    ctx.fillRect(0, 0, 800, 180);

    ctx.strokeStyle = '#2f3336';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 800, 500);

    const guild = global.bot.guilds.cache.get(guildID);
    const member = await guild.members.fetch(userID).catch(() => null);
    if (!member) return null;

    try {
        const avUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
        const avResponse = await axios.get(avUrl, { responseType: 'arraybuffer' });
        const avatar = await loadImage(Buffer.from(avResponse.data));

        ctx.save();
        ctx.beginPath();
        const avX = 50, avY = 120, avS = 140;
        ctx.arc(avX + avS / 2, avY + avS / 2, avS / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
        ctx.clip();
        ctx.drawImage(avatar, avX, avY, avS, avS);
        ctx.restore();
    } catch (e) { }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px ManropeBold';
    ctx.fillText(member.displayName, 50, 310);
    const nameWidth = ctx.measureText(member.displayName).width;

    if (tUser.verified) {
        try {
            const tick = await loadImage(path.join(__dirname, '../Assets/Images/mavitik.png'));
            ctx.drawImage(tick, 50 + nameWidth + 10, 280, 30, 30);
        } catch (e) { }
    }

    ctx.fillStyle = '#71767b';
    ctx.font = '18px ManropeBold';
    ctx.fillText(`@${member.user.username}`, 50, 340);

    ctx.fillStyle = '#e7e9ea';
    ctx.font = '20px ManropeBold';
    wrapText(ctx, tUser.bio, 50, 380, 700, 28);

    const statsY = 460;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px ManropeBold';

    let currentX = 50;
    ctx.fillText(tUser.following.length.toLocaleString(), currentX, statsY);
    ctx.fillStyle = '#71767b';
    ctx.font = '18px ManropeBold';
    ctx.fillText(" Takip Edilen", currentX + ctx.measureText(tUser.following.length.toString()).width, statsY);

    currentX += 180;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px ManropeBold';
    ctx.fillText(tUser.followers.length.toLocaleString(), currentX, statsY);
    ctx.fillStyle = '#71767b';
    ctx.font = '18px ManropeBold';
    ctx.fillText(" Takipçi", currentX + ctx.measureText(tUser.followers.length.toString()).width, statsY);

    currentX += 150;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px ManropeBold';
    ctx.fillText(tUser.tweets.toLocaleString(), currentX, statsY);
    ctx.fillStyle = '#71767b';
    ctx.font = '18px ManropeBold';
    ctx.fillText(" Tweet", currentX + ctx.measureText(tUser.tweets.toString()).width, statsY);

    currentX += 130;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px ManropeBold';
    ctx.fillText(tUser.likes.toLocaleString(), currentX, statsY);
    ctx.fillStyle = '#71767b';
    ctx.font = '18px ManropeBold';
    ctx.fillText(" Beğeni", currentX + ctx.measureText(tUser.likes.toString()).width, statsY);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'twitter_profile.png' });
}

async function renderTweet(author, content, likes, retweets, isRetweet, originalImageUrl) {
    const canvasHeight = isRetweet && originalImageUrl ? 580 : 320;
    const canvas = createCanvas(700, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    if (ctx.roundRect) ctx.roundRect(0, 0, 700, canvasHeight, 20); else ctx.rect(0, 0, 700, canvasHeight);
    ctx.fill();

    ctx.strokeStyle = '#2f3336';
    ctx.lineWidth = 1;
    ctx.stroke();

    try {
        const avatarResponse = await axios.get(author.avatarURL, { responseType: 'arraybuffer' });
        const avatar = await loadImage(Buffer.from(avatarResponse.data));
        ctx.save();
        ctx.beginPath();
        ctx.arc(60, 60, 30, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 30, 30, 60, 60);
        ctx.restore();
    } catch (e) { }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px ManropeBold';
    const name = author.displayName;
    ctx.fillText(name, 110, 55);

    try {
        const tick = await loadImage(path.join(__dirname, '../Assets/Images/mavitik.png'));
        const nameWidth = ctx.measureText(name).width;
        ctx.drawImage(tick, 110 + nameWidth + 5, 38, 20, 20);
    } catch (e) { }

    ctx.fillStyle = '#71767b';
    ctx.font = '18px ManropeBold';
    ctx.fillText(`@${author.username}`, 110, 85);

    ctx.fillStyle = '#e7e9ea';
    ctx.font = '24px ManropeBold';
    wrapText(ctx, content, 40, 140, 620, 35);

    if (isRetweet && originalImageUrl) {
        try {
            const originalResponse = await axios.get(originalImageUrl, { responseType: 'arraybuffer' });
            const originalImage = await loadImage(Buffer.from(originalResponse.data));
            ctx.strokeStyle = '#2f3336';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 210, 620, 280);
            ctx.drawImage(originalImage, 42, 212, 616, 276);
        } catch (e) { }
    }

    const statsY = canvas.height - 45;
    ctx.fillStyle = '#2f3336';
    ctx.fillRect(40, statsY - 30, 620, 1);

    try {
        const likeIcon = await loadImage(path.join(__dirname, '../Assets/Images/like.png'));
        ctx.drawImage(likeIcon, 40, statsY - 18, 20, 20);
        ctx.fillStyle = '#71767b';
        ctx.font = 'bold 18px ManropeBold';
        ctx.fillText(likes.toLocaleString(), 70, statsY);
    } catch (e) { }

    try {
        const rtIcon = await loadImage(path.join(__dirname, '../Assets/Images/retweet.png'));
        ctx.drawImage(rtIcon, 150, statsY - 18, 22, 22);
        ctx.fillStyle = '#71767b';
        ctx.font = 'bold 18px ManropeBold';
        ctx.fillText(retweets.toLocaleString(), 185, statsY);
    } catch (e) { }

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'tweet.png' });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = (text || "").split(' ');
    let line = '';
    let testLine = '';
    for (let n = 0; n < words.length; n++) {
        testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

async function toggleFollow(guildID, followerID, targetID) {
    if (followerID === targetID) return { success: false, message: "Kendini takip edemezsin!" };

    let targetUser = await TwitterUser.findOne({ guildID, userID: targetID });
    let currentUser = await TwitterUser.findOne({ guildID, userID: followerID });

    if (!targetUser) targetUser = await TwitterUser.create({ guildID, userID: targetID });
    if (!currentUser) currentUser = await TwitterUser.create({ guildID, userID: followerID });

    const isFollowing = targetUser.followers.includes(followerID);

    if (isFollowing) {
        await TwitterUser.updateOne({ guildID, userID: targetID }, { $pull: { followers: followerID } });
        await TwitterUser.updateOne({ guildID, userID: followerID }, { $pull: { following: targetID } });
        return { success: true, status: 'unfollowed', message: `<@${targetID}> kullanıcısını takipten çıkardın.` };
    } else {
        await TwitterUser.updateOne({ guildID, userID: targetID }, { $push: { followers: followerID } });
        await TwitterUser.updateOne({ guildID, userID: followerID }, { $push: { following: targetID } });
        return { success: true, status: 'followed', message: `<@${targetID}> kullanıcısını takip etmeye başladın!` };
    }
}

module.exports = { renderTwitterProfile, renderTweet, wrapText, toggleFollow };
