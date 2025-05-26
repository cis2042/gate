const moment = require('moment');

// Format user profile information
function formatUserProfile(user) {
  const {
    username,
    email,
    profile,
    isVerified,
    verificationScore,
    verificationStatus,
    sbtTokenId,
    createdAt,
    lastLogin
  } = user;

  const verificationBadge = isVerified ? '✅' : '⏳';
  const sbtBadge = sbtTokenId ? '🏆' : '⭕';

  return `
👤 *Your Profile*

${verificationBadge} *${profile?.firstName || username}* ${profile?.lastName || ''}
📧 ${email}
🆔 @${username}

📊 *Verification Status*
${getVerificationStatusEmoji(verificationStatus)} Status: ${formatVerificationStatusText(verificationStatus)}
⭐ Score: ${verificationScore || 0}/100
${sbtBadge} SBT: ${sbtTokenId ? 'Minted' : 'Not minted'}

📅 *Account Info*
🗓️ Joined: ${moment(createdAt).format('MMM DD, YYYY')}
🕐 Last login: ${lastLogin ? moment(lastLogin).fromNow() : 'Never'}

${profile?.bio ? `📝 *Bio*\n${profile.bio}\n` : ''}
${profile?.location?.city ? `📍 Location: ${profile.location.city}${profile.location.country ? `, ${profile.location.country}` : ''}\n` : ''}
  `.trim();
}

// Format verification status information
function formatVerificationStatus(statusData) {
  const {
    totalVerifications,
    completedVerifications,
    pendingVerifications,
    failedVerifications,
    totalScore,
    channels
  } = statusData;

  let message = `
📊 *Verification Status*

📈 *Overall Progress*
✅ Completed: ${completedVerifications}/${totalVerifications}
⏳ Pending: ${pendingVerifications}
❌ Failed: ${failedVerifications}
⭐ Total Score: ${totalScore}/100

📋 *Channel Status*
  `;

  // Add channel-specific status
  Object.entries(channels).forEach(([channel, verifications]) => {
    const latest = verifications[verifications.length - 1];
    const emoji = getChannelEmoji(channel);
    const statusEmoji = getVerificationStatusEmoji(latest.status);

    message += `\n${emoji} ${formatChannelName(channel)}: ${statusEmoji} ${formatVerificationStatusText(latest.status)}`;

    if (latest.score) {
      message += ` (${latest.score} pts)`;
    }
  });

  // Add recommendations
  const eligibleForSBT = totalScore >= 60;
  message += `\n\n🎯 *Next Steps*`;

  if (eligibleForSBT) {
    message += `\n🏆 You're eligible to mint your SBT!`;
  } else {
    const needed = 60 - totalScore;
    message += `\n📈 Complete ${needed} more points to mint your SBT`;
  }

  return message.trim();
}

// Format SBT information
function formatSBTInfo(sbtData) {
  const { hasSBT, sbt, eligibleForMint, verificationScore } = sbtData;

  if (!hasSBT) {
    return `
🏆 *Soul Bound Token (SBT)*

❌ You don't have an SBT yet.

📊 *Current Status*
⭐ Verification Score: ${verificationScore}/100
🎯 Required Score: 60/100
${eligibleForMint ? '✅ Eligible for minting!' : '⏳ Complete more verifications to become eligible'}

🔮 *What is an SBT?*
A Soul Bound Token is a non-transferable NFT that represents your verified digital identity. It's permanently linked to your account and serves as proof of your human verification on the Twin Gate platform.

💎 *Benefits of having an SBT:*
• 🔐 Verified human status
• 🎁 Access to exclusive features
• 🌟 Enhanced reputation
• 🚀 Future ecosystem benefits
    `.trim();
  }

  const {
    tokenId,
    metadata,
    status,
    mintedAt,
    blockExplorerUrl,
    openseaUrl
  } = sbt;

  const verificationLevel = metadata?.verificationData?.verificationLevel || 'bronze';
  const levelEmoji = getVerificationLevelEmoji(verificationLevel);

  return `
🏆 *Your Soul Bound Token*

${levelEmoji} *${metadata?.name || `Twin3 SBT #${tokenId}`}*

📊 *Token Details*
🆔 Token ID: \`${tokenId}\`
⭐ Level: ${verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)}
📈 Score: ${metadata?.verificationData?.verificationScore || 0}/100
📅 Minted: ${moment(mintedAt).format('MMM DD, YYYY')}
🔄 Status: ${formatSBTStatus(status)}

🔗 *Verified Channels*
${metadata?.verificationData?.verifiedChannels?.map(channel =>
  `${getChannelEmoji(channel.channel)} ${formatChannelName(channel.channel)} (${channel.score} pts)`
).join('\n') || 'No channels verified'}

📝 *Description*
${metadata?.description || 'Twin3 Soul Bound Token representing verified human identity.'}

🌐 *Links*
${blockExplorerUrl ? `🔍 [View on Explorer](${blockExplorerUrl})` : ''}
${openseaUrl ? `🖼️ [View on OpenSea](${openseaUrl})` : ''}
  `.trim();
}

// Format verification channel name
function formatChannelName(channel) {
  const names = {
    twitter: 'Twitter',
    discord: 'Discord',
    telegram: 'Telegram',
    github: 'GitHub',
    email: 'Email',
    phone: 'Phone',
    kyc: 'KYC'
  };
  return names[channel] || channel;
}

// Get channel emoji
function getChannelEmoji(channel) {
  const emojis = {
    twitter: '🐦',
    discord: '💬',
    telegram: '📱',
    github: '🐙',
    email: '📧',
    phone: '📞',
    kyc: '🆔'
  };
  return emojis[channel] || '📋';
}

// Get verification status emoji
function getVerificationStatusEmoji(status) {
  const emojis = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    failed: '❌',
    rejected: '🚫',
    expired: '⏰'
  };
  return emojis[status] || '❓';
}

// Get verification level emoji
function getVerificationLevelEmoji(level) {
  const emojis = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '💠'
  };
  return emojis[level] || '🏆';
}

// Format verification status text
function formatVerificationStatusText(status) {
  const statuses = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    failed: 'Failed',
    rejected: 'Rejected',
    expired: 'Expired'
  };
  return statuses[status] || status;
}

// Format SBT status
function formatSBTStatus(status) {
  const statuses = {
    pending: 'Pending',
    minted: 'Minted',
    transferred: 'Transferred',
    burned: 'Burned',
    revoked: 'Revoked'
  };
  return statuses[status] || status;
}

// Format time duration
function formatDuration(milliseconds) {
  const duration = moment.duration(milliseconds);

  if (duration.asMinutes() < 1) {
    return 'Less than a minute';
  } else if (duration.asHours() < 1) {
    return `${Math.floor(duration.asMinutes())} minute${duration.asMinutes() !== 1 ? 's' : ''}`;
  } else if (duration.asDays() < 1) {
    return `${Math.floor(duration.asHours())} hour${duration.asHours() !== 1 ? 's' : ''}`;
  } else {
    return `${Math.floor(duration.asDays())} day${duration.asDays() !== 1 ? 's' : ''}`;
  }
}

// Format file size
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format percentage
function formatPercentage(value, total) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// Format verification progress
function formatVerificationProgress(completed, total) {
  const percentage = formatPercentage(completed, total);
  const progressBar = createProgressBar(completed, total);
  return `${progressBar} ${completed}/${total} (${percentage})`;
}

// Create progress bar
function createProgressBar(current, total, length = 10) {
  const filled = Math.round((current / total) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
  formatUserProfile,
  formatVerificationStatus,
  formatSBTInfo,
  formatChannelName,
  getChannelEmoji,
  getVerificationStatusEmoji,
  getVerificationLevelEmoji,
  formatVerificationStatusText,
  formatSBTStatus,
  formatDuration,
  formatFileSize,
  formatNumber,
  formatPercentage,
  formatVerificationProgress,
  createProgressBar
};
