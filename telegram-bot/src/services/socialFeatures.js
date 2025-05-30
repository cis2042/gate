// 社交功能服務 - 分享、邀請、社群功能
const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/userSession');

class SocialFeatures {
  constructor() {
    this.referralData = new Map();
    this.shareStats = new Map();
  }

  /**
   * 生成邀請連結
   */
  generateInviteLink(userId) {
    const inviteCode = this.generateInviteCode(userId);
    return `https://t.me/twin3bot?start=invite_${inviteCode}`;
  }

  /**
   * 生成邀請碼
   */
  generateInviteCode(userId) {
    // 簡單的邀請碼生成（實際應用中應該更安全）
    return Buffer.from(`${userId}_${Date.now()}`).toString('base64').slice(0, 12);
  }

  /**
   * 創建分享消息
   */
  createShareMessage(verificationStatus, language = 'en-US') {
    const humanityIndex = verificationStatus.humanityIndex || 0;
    const level = verificationStatus.verificationLevel || 0;
    
    const shareTexts = {
      'en-US': {
        basic: `🤖 I just proved I'm human with Twin Gate!\n\n✅ Verification Level: ${level}/3\n📊 Humanity Index: ${humanityIndex}/255\n\nJoin me in building a verified human community! 🌍`,
        achievement: `🏆 Achievement Unlocked!\n\nI just completed Level ${level} verification on Twin Gate!\n\n📊 My Humanity Index: ${humanityIndex}/255\n💎 Digital Identity: Verified ✅\n\nProve you're human too! 🚀`,
        sbt: `💎 I just minted my Soul Bound Token (SBT)!\n\nMy digital identity is now permanently verified on the blockchain.\n\n🔗 Blockchain: BNB Smart Chain\n📊 Humanity Index: ${humanityIndex}/255\n\nGet your verified digital identity! 🌟`
      },
      'zh-TW': {
        basic: `🤖 我剛剛在 Twin Gate 證明了我是人類！\n\n✅ 驗證等級：${level}/3\n📊 人性指數：${humanityIndex}/255\n\n加入我一起建立經過驗證的人類社群！🌍`,
        achievement: `🏆 成就解鎖！\n\n我剛剛在 Twin Gate 完成了第 ${level} 級驗證！\n\n📊 我的人性指數：${humanityIndex}/255\n💎 數位身份：已驗證 ✅\n\n你也來證明你是人類吧！🚀`,
        sbt: `💎 我剛剛鑄造了我的靈魂綁定代幣（SBT）！\n\n我的數位身份現在已永久在區塊鏈上驗證。\n\n🔗 區塊鏈：BNB 智能鏈\n📊 人性指數：${humanityIndex}/255\n\n獲得你的經過驗證的數位身份！🌟`
      }
    };

    const texts = shareTexts[language] || shareTexts['en-US'];
    
    // 根據狀態選擇分享文本
    if (verificationStatus.hasSBT) {
      return texts.sbt;
    } else if (level >= 2) {
      return texts.achievement;
    } else {
      return texts.basic;
    }
  }

  /**
   * 創建邀請消息
   */
  createInviteMessage(userId, language = 'en-US') {
    const inviteLink = this.generateInviteLink(userId);
    
    const inviteTexts = {
      'en-US': `👥 **Invite Friends to Twin Gate**\n\n🎯 Help your friends get verified and earn rewards!\n\n**Your invite link:**\n${inviteLink}\n\n**Benefits for your friends:**\n✅ Skip the queue\n🎁 Bonus humanity points\n🚀 Faster verification\n\n**Benefits for you:**\n🏆 Referral rewards\n📈 Increased humanity score\n👑 VIP status (after 10 referrals)\n\nShare this link with friends who want to prove they're human! 🌍`,
      'zh-TW': `👥 **邀請朋友加入 Twin Gate**\n\n🎯 幫助你的朋友獲得驗證並賺取獎勵！\n\n**你的邀請連結：**\n${inviteLink}\n\n**朋友的好處：**\n✅ 跳過排隊\n🎁 額外人性積分\n🚀 更快驗證\n\n**你的好處：**\n🏆 推薦獎勵\n📈 提高人性分數\n👑 VIP 狀態（10 次推薦後）\n\n與想要證明自己是人類的朋友分享此連結！🌍`
    };

    return inviteTexts[language] || inviteTexts['en-US'];
  }

  /**
   * 創建社群統計消息
   */
  createCommunityStatsMessage(language = 'en-US') {
    // 模擬社群統計數據（實際應該從數據庫獲取）
    const stats = {
      totalUsers: 15847,
      verifiedHumans: 12634,
      sbtMinted: 8921,
      averageHumanityIndex: 142,
      topCountries: ['Taiwan', 'USA', 'Japan', 'Korea', 'Singapore']
    };

    const messages = {
      'en-US': `📊 **Twin Gate Community Stats**\n\n👥 **Total Users:** ${stats.totalUsers.toLocaleString()}\n✅ **Verified Humans:** ${stats.verifiedHumans.toLocaleString()}\n💎 **SBTs Minted:** ${stats.sbtMinted.toLocaleString()}\n📈 **Avg Humanity Index:** ${stats.averageHumanityIndex}/255\n\n🌍 **Top Countries:**\n${stats.topCountries.map((country, i) => `${i + 1}. ${country}`).join('\n')}\n\n🎯 **Join the verified human revolution!**`,
      'zh-TW': `📊 **Twin Gate 社群統計**\n\n👥 **總用戶數：** ${stats.totalUsers.toLocaleString()}\n✅ **已驗證人類：** ${stats.verifiedHumans.toLocaleString()}\n💎 **已鑄造 SBT：** ${stats.sbtMinted.toLocaleString()}\n📈 **平均人性指數：** ${stats.averageHumanityIndex}/255\n\n🌍 **熱門國家：**\n${stats.topCountries.map((country, i) => `${i + 1}. ${country}`).join('\n')}\n\n🎯 **加入經過驗證的人類革命！**`
    };

    return messages[language] || messages['en-US'];
  }

  /**
   * 創建排行榜消息
   */
  createLeaderboardMessage(language = 'en-US') {
    // 模擬排行榜數據
    const leaderboard = [
      { rank: 1, name: 'Alice', humanityIndex: 248, country: '🇹🇼' },
      { rank: 2, name: 'Bob', humanityIndex: 245, country: '🇺🇸' },
      { rank: 3, name: 'Charlie', humanityIndex: 242, country: '🇯🇵' },
      { rank: 4, name: 'Diana', humanityIndex: 238, country: '🇰🇷' },
      { rank: 5, name: 'Eve', humanityIndex: 235, country: '🇸🇬' }
    ];

    const messages = {
      'en-US': `🏆 **Humanity Index Leaderboard**\n\n` +
        leaderboard.map(user => 
          `${user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `${user.rank}.`} ` +
          `${user.name} ${user.country} - ${user.humanityIndex}/255`
        ).join('\n') + 
        `\n\n📈 **Compete for the top spot!**\nComplete more verifications to climb the leaderboard!`,
      'zh-TW': `🏆 **人性指數排行榜**\n\n` +
        leaderboard.map(user => 
          `${user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `${user.rank}.`} ` +
          `${user.name} ${user.country} - ${user.humanityIndex}/255`
        ).join('\n') + 
        `\n\n📈 **爭奪榜首位置！**\n完成更多驗證以攀登排行榜！`
    };

    return messages[language] || messages['en-US'];
  }

  /**
   * 處理推薦邀請
   */
  async handleReferralInvite(newUserId, inviteCode) {
    try {
      // 解析邀請碼獲取推薦人ID
      const referrerId = this.parseInviteCode(inviteCode);
      
      if (referrerId) {
        // 記錄推薦關係
        await this.recordReferral(referrerId, newUserId);
        
        // 給推薦人獎勵
        await this.giveReferralReward(referrerId);
        
        // 給新用戶獎勵
        await this.giveNewUserBonus(newUserId);
        
        return {
          success: true,
          referrerId,
          message: 'Referral bonus applied!'
        };
      }
    } catch (error) {
      logger.error('Error handling referral invite:', error);
    }
    
    return { success: false };
  }

  /**
   * 解析邀請碼
   */
  parseInviteCode(inviteCode) {
    try {
      const decoded = Buffer.from(inviteCode, 'base64').toString();
      const [userId] = decoded.split('_');
      return parseInt(userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * 記錄推薦關係
   */
  async recordReferral(referrerId, newUserId) {
    const referralData = {
      referrerId,
      newUserId,
      timestamp: Date.now(),
      rewardGiven: false
    };
    
    this.referralData.set(`${referrerId}_${newUserId}`, referralData);
    
    // 更新推薦人的推薦列表
    const referrerSession = await getUserSession(referrerId);
    const referrals = referrerSession?.referrals || [];
    referrals.push(newUserId);
    
    await updateUserSession(referrerId, { referrals });
  }

  /**
   * 給推薦人獎勵
   */
  async giveReferralReward(referrerId) {
    const session = await getUserSession(referrerId);
    const currentScore = session?.humanityIndex || 0;
    const bonusPoints = 10; // 推薦獎勵積分
    
    await updateUserSession(referrerId, {
      humanityIndex: currentScore + bonusPoints,
      lastReferralReward: Date.now()
    });
    
    logger.info(`Gave referral reward to user ${referrerId}: +${bonusPoints} points`);
  }

  /**
   * 給新用戶獎勵
   */
  async giveNewUserBonus(newUserId) {
    const bonusPoints = 5; // 新用戶獎勵積分
    
    await updateUserSession(newUserId, {
      humanityIndex: bonusPoints,
      isReferred: true,
      joinBonus: bonusPoints
    });
    
    logger.info(`Gave new user bonus to user ${newUserId}: +${bonusPoints} points`);
  }

  /**
   * 獲取用戶推薦統計
   */
  async getUserReferralStats(userId) {
    const session = await getUserSession(userId);
    const referrals = session?.referrals || [];
    
    return {
      totalReferrals: referrals.length,
      referralRewards: referrals.length * 10, // 每個推薦10積分
      vipStatus: referrals.length >= 10,
      nextVipThreshold: Math.max(0, 10 - referrals.length)
    };
  }

  /**
   * 創建推薦統計消息
   */
  async createReferralStatsMessage(userId, language = 'en-US') {
    const stats = await this.getUserReferralStats(userId);
    
    const messages = {
      'en-US': `📊 **Your Referral Stats**\n\n` +
        `👥 **Total Referrals:** ${stats.totalReferrals}\n` +
        `🏆 **Referral Rewards:** +${stats.referralRewards} points\n` +
        `👑 **VIP Status:** ${stats.vipStatus ? 'Active ✅' : 'Not yet ⭕'}\n\n` +
        (stats.vipStatus ? 
          `🎉 **Congratulations!** You're a VIP member!\n\n**VIP Benefits:**\n✨ Priority support\n🚀 Faster verification\n🎁 Exclusive rewards` :
          `🎯 **${stats.nextVipThreshold} more referrals** to unlock VIP status!\n\n**VIP Benefits:**\n✨ Priority support\n🚀 Faster verification\n🎁 Exclusive rewards`),
      'zh-TW': `📊 **你的推薦統計**\n\n` +
        `👥 **總推薦數：** ${stats.totalReferrals}\n` +
        `🏆 **推薦獎勵：** +${stats.referralRewards} 積分\n` +
        `👑 **VIP 狀態：** ${stats.vipStatus ? '已激活 ✅' : '尚未達成 ⭕'}\n\n` +
        (stats.vipStatus ? 
          `🎉 **恭喜！** 你是 VIP 會員！\n\n**VIP 福利：**\n✨ 優先支援\n🚀 更快驗證\n🎁 專屬獎勵` :
          `🎯 **再推薦 ${stats.nextVipThreshold} 人** 即可解鎖 VIP 狀態！\n\n**VIP 福利：**\n✨ 優先支援\n🚀 更快驗證\n🎁 專屬獎勵`)
    };

    return messages[language] || messages['en-US'];
  }
}

// 創建單例實例
const socialFeatures = new SocialFeatures();

module.exports = socialFeatures;
