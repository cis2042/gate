/**
 * SBT (Soul Bound Token) 服務
 * 整合 Twin3.ai SBT 生成和錢包管理
 */

const apiClient = require('./apiClient');
const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/session');
const { getUserVerificationStatus } = require('../utils/userStatus');

/**
 * 檢查使用者 SBT 狀態
 * @param {number} userId - 使用者 ID
 * @returns {object} SBT 狀態資訊
 */
async function checkSBTStatus(userId) {
  try {
    const session = await getUserSession(userId);

    if (!session?.token) {
      throw new Error('User not authenticated');
    }

    // 調用 Twin3.ai API 檢查 SBT 狀態
    const response = await apiClient.getSBTStatus(session.token);

    if (response.success) {
      const sbtData = {
        hasSBT: response.data.hasSBT || false,
        sbtAddress: response.data.sbtAddress || null,
        walletAddress: response.data.walletAddress || null,
        mintedAt: response.data.mintedAt || null,
        tokenId: response.data.tokenId || null,
        metadata: response.data.metadata || {},
        eligibleForMint: response.data.eligibleForMint || false,
        humanityIndex: response.data.humanityIndex || 0,
        verificationLevel: response.data.verificationLevel || 0
      };

      // 更新本地會話資料
      await updateUserSession(userId, {
        sbtData,
        lastSBTCheck: new Date().toISOString()
      });

      logger.info('SBT status checked successfully', {
        userId,
        hasSBT: sbtData.hasSBT,
        eligibleForMint: sbtData.eligibleForMint
      });

      return sbtData;
    } else {
      throw new Error(response.message || 'Failed to check SBT status');
    }
  } catch (error) {
    logger.error('Error checking SBT status:', error);
    throw error;
  }
}

/**
 * 請求 SBT 鑄造
 * @param {number} userId - 使用者 ID
 * @returns {object} 鑄造結果
 */
async function requestSBTMint(userId) {
  try {
    const session = await getUserSession(userId);

    if (!session?.token) {
      throw new Error('User not authenticated');
    }

    // 先檢查是否符合鑄造條件
    const sbtStatus = await checkSBTStatus(userId);

    if (!sbtStatus.eligibleForMint) {
      throw new Error('User not eligible for SBT minting. Need to complete Level 2 verification.');
    }

    if (sbtStatus.hasSBT) {
      throw new Error('User already has an SBT');
    }

    // 調用 Twin3.ai API 請求鑄造 SBT
    const response = await apiClient.requestSBTMint(session.token, {
      platform: 'telegram',
      userId: userId.toString(),
      username: session.username || 'telegram_user'
    });

    if (response.success) {
      const mintData = {
        mintRequestId: response.data.mintRequestId,
        walletAddress: response.data.walletAddress,
        estimatedMintTime: response.data.estimatedMintTime,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      // 更新會話資料
      await updateUserSession(userId, {
        sbtMintRequest: mintData,
        lastMintRequest: new Date().toISOString()
      });

      logger.info('SBT mint requested successfully', {
        userId,
        mintRequestId: mintData.mintRequestId,
        walletAddress: mintData.walletAddress
      });

      return {
        success: true,
        data: mintData
      };
    } else {
      throw new Error(response.message || 'Failed to request SBT mint');
    }
  } catch (error) {
    logger.error('Error requesting SBT mint:', error);
    throw error;
  }
}

/**
 * 檢查 SBT 鑄造狀態
 * @param {number} userId - 使用者 ID
 * @returns {object} 鑄造狀態
 */
async function checkMintStatus(userId) {
  try {
    const session = await getUserSession(userId);

    if (!session?.sbtMintRequest?.mintRequestId) {
      throw new Error('No mint request found');
    }

    const response = await apiClient.checkMintStatus(
      session.token,
      session.sbtMintRequest.mintRequestId
    );

    if (response.success) {
      const mintStatus = {
        status: response.data.status,
        txHash: response.data.txHash || null,
        sbtAddress: response.data.sbtAddress || null,
        tokenId: response.data.tokenId || null,
        completedAt: response.data.completedAt || null,
        error: response.data.error || null
      };

      // 如果鑄造完成，更新 SBT 資料
      if (mintStatus.status === 'completed' && mintStatus.sbtAddress) {
        await updateUserSession(userId, {
          sbtData: {
            hasSBT: true,
            sbtAddress: mintStatus.sbtAddress,
            walletAddress: session.sbtMintRequest.walletAddress,
            mintedAt: mintStatus.completedAt,
            tokenId: mintStatus.tokenId,
            txHash: mintStatus.txHash
          },
          sbtMintRequest: {
            ...session.sbtMintRequest,
            ...mintStatus
          }
        });
      }

      logger.info('Mint status checked', {
        userId,
        status: mintStatus.status,
        sbtAddress: mintStatus.sbtAddress
      });

      return mintStatus;
    } else {
      throw new Error(response.message || 'Failed to check mint status');
    }
  } catch (error) {
    logger.error('Error checking mint status:', error);
    throw error;
  }
}

/**
 * 獲取 SBT 詳細資訊
 * @param {number} userId - 使用者 ID
 * @returns {object} SBT 詳細資訊
 */
async function getSBTDetails(userId) {
  try {
    const session = await getUserSession(userId);
    const sbtStatus = await checkSBTStatus(userId);

    if (!sbtStatus.hasSBT) {
      return {
        hasSBT: false,
        eligibleForMint: sbtStatus.eligibleForMint,
        message: sbtStatus.eligibleForMint ?
          'You are eligible to mint your SBT!' :
          'Complete Level 2 verification to become eligible for SBT minting.'
      };
    }

    // 獲取詳細的 SBT 資訊
    const response = await apiClient.getSBTDetails(session.token, sbtStatus.sbtAddress);

    if (response.success) {
      return {
        hasSBT: true,
        sbtAddress: sbtStatus.sbtAddress,
        walletAddress: sbtStatus.walletAddress,
        tokenId: sbtStatus.tokenId,
        mintedAt: sbtStatus.mintedAt,
        metadata: response.data.metadata || {},
        attributes: response.data.attributes || [],
        imageUrl: response.data.imageUrl || null,
        humanityIndex: sbtStatus.humanityIndex,
        verificationLevel: sbtStatus.verificationLevel
      };
    } else {
      throw new Error(response.message || 'Failed to get SBT details');
    }
  } catch (error) {
    logger.error('Error getting SBT details:', error);
    throw error;
  }
}

/**
 * 格式化 Twin3 SBT 資訊為顯示文字
 * @param {object} sbtData - SBT 資料
 * @param {string} language - 語言
 * @returns {string} 格式化的文字
 */
function formatTwin3SBTInfo(sbtData, language = 'zh-TW') {
  if (!sbtData.hasSBT) {
    if (sbtData.eligibleForMint) {
      return `🏆 **Twin3 SBT 可以鑄造！**\n\n` +
        `✅ 您已完成 Level 2 驗證\n` +
        `🎯 Humanity Index: ${sbtData.humanityIndex || 0}/255\n\n` +
        `🎉 恭喜！您現在可以鑄造您的專屬 Twin3 SBT (Soul Bound Token)。\n\n` +
        `💎 SBT 是您人類身份的永久證明，將由 Twin3.ai 為您生成專屬錢包並鑄造。\n\n` +
        `點擊下方按鈕開始鑄造流程：`;
    } else {
      return `🔒 **Twin3 SBT 尚未解鎖**\n\n` +
        `📋 要獲得 SBT 鑄造資格，您需要：\n` +
        `✅ 完成 Level 1 驗證\n` +
        `🔲 完成 Level 2 驗證 ← 當前需要\n` +
        `⭐ 可選：完成 Level 3 驗證\n\n` +
        `💡 完成 Level 2 驗證後，Twin3.ai 將為您生成專屬錢包並鑄造 SBT。`;
    }
  }

  return `🏆 **您的 Twin3 SBT**\n\n` +
    `✅ SBT 狀態：已鑄造\n` +
    `🎯 Humanity Index：${sbtData.humanityIndex}/255\n` +
    `📊 驗證等級：Level ${sbtData.verificationLevel}/3\n` +
    `📅 鑄造時間：${new Date(sbtData.mintedAt).toLocaleString('zh-TW')}\n\n` +
    `🔗 **區塊鏈資訊：**\n` +
    `💎 Token ID：${sbtData.tokenId}\n` +
    `📍 SBT 地址：\n\`${sbtData.sbtAddress}\`\n` +
    `💰 錢包地址：\n\`${sbtData.walletAddress}\`\n\n` +
    `🎉 這是您獨一無二的人類身份證明！`;
}

/**
 * 獲取用戶完整個人資料和 SBT 信息
 * @param {number} userId - 使用者 ID
 * @returns {object} 完整的用戶資料
 */
async function getUserProfileAndSBT(userId) {
  try {
    const session = await getUserSession(userId);
    const verificationStatus = await getUserVerificationStatus(userId);
    const sbtDetails = await getSBTDetails(userId);

    // 獲取用戶基本資料
    const profileData = {
      userId,
      username: session?.username || 'telegram_user',
      firstName: session?.firstName || 'User',
      telegramId: userId,
      joinedAt: session?.startedAt || new Date(),
      lastActivity: session?.lastActivity || new Date(),

      // 驗證狀態
      verificationLevel: verificationStatus.verificationLevel,
      humanityIndex: verificationStatus.humanityIndex,
      isVerified: verificationStatus.humanityIndex >= 100,

      // SBT 資料
      sbt: sbtDetails
    };

    return {
      success: true,
      data: profileData
    };
  } catch (error) {
    logger.error('Error getting user profile and SBT:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 生成區塊鏈瀏覽器連結
 * @param {string} address - 地址或交易哈希
 * @param {string} type - 類型 ('address', 'tx', 'token')
 * @param {string} network - 網絡 ('bsc', 'polygon', 'ethereum')
 * @returns {string} 瀏覽器連結
 */
function generateBlockchainExplorerUrl(address, type = 'address', network = 'bsc') {
  const explorers = {
    bsc: 'https://bscscan.com',
    polygon: 'https://polygonscan.com',
    ethereum: 'https://etherscan.io'
  };

  const baseUrl = explorers[network] || explorers.bsc;

  switch (type) {
    case 'address':
      return `${baseUrl}/address/${address}`;
    case 'tx':
      return `${baseUrl}/tx/${address}`;
    case 'token':
      return `${baseUrl}/token/${address}`;
    default:
      return `${baseUrl}/address/${address}`;
  }
}

/**
 * 生成 Twin3 個人頁面連結
 * @param {number} userId - 使用者 ID
 * @param {string} username - 用戶名
 * @returns {string} Twin3 個人頁面連結
 */
function generateTwin3ProfileUrl(userId, username) {
  // Twin3.ai 個人頁面 URL 格式
  const baseUrl = 'https://twin3.ai/profile';
  return `${baseUrl}/${username || userId}`;
}

/**
 * 格式化完整的 SBT 和個人資料信息
 * @param {object} profileData - 完整的用戶資料
 * @param {string} language - 語言
 * @returns {string} 格式化的文字
 */
function formatCompleteProfile(profileData, language = 'zh-TW') {
  const { username, firstName, verificationLevel, humanityIndex, isVerified, sbt, joinedAt } = profileData;

  let message = `👤 **${firstName} 的 Twin Gate 檔案**\n\n`;

  // 基本資訊
  message += `📋 **基本資訊**\n`;
  message += `🆔 用戶名：@${username}\n`;
  message += `📅 加入時間：${new Date(joinedAt).toLocaleDateString('zh-TW')}\n`;
  message += `${isVerified ? '✅' : '⏳'} 驗證狀態：${isVerified ? '已通過' : '進行中'}\n\n`;

  // 驗證進度
  message += `📊 **驗證進度**\n`;
  message += `🎯 Humanity Index：${humanityIndex}/255\n`;
  message += `📈 驗證等級：Level ${verificationLevel}/3\n`;
  message += `${verificationLevel >= 1 ? '✅' : '⭕'} Level 1 - Google reCAPTCHA\n`;
  message += `${verificationLevel >= 2 ? '✅' : '⭕'} Level 2 - 手機驗證\n`;
  message += `${verificationLevel >= 3 ? '✅' : '⭕'} Level 3 - 生物識別\n\n`;

  // SBT 資訊
  if (sbt.hasSBT) {
    message += `🏆 **Twin3 SBT 資訊**\n`;
    message += `✅ 狀態：已鑄造\n`;
    message += `💎 Token ID：${sbt.tokenId}\n`;
    message += `📅 鑄造時間：${new Date(sbt.mintedAt).toLocaleDateString('zh-TW')}\n`;
    message += `🔗 SBT 地址：\`${sbt.sbtAddress}\`\n`;
    message += `💰 錢包地址：\`${sbt.walletAddress}\`\n\n`;
  } else if (sbt.eligibleForMint) {
    message += `🏆 **SBT 鑄造**\n`;
    message += `✅ 符合鑄造條件\n`;
    message += `💡 您可以鑄造專屬的 Twin3 SBT！\n\n`;
  } else {
    message += `🔒 **SBT 鑄造**\n`;
    message += `📋 需要完成 Level 2 驗證\n`;
    message += `💡 完成更多驗證等級來解鎖 SBT 鑄造\n\n`;
  }

  return message;
}

/**
 * 生成 SBT 管理按鈕
 * @param {object} profileData - 用戶資料
 * @param {string} language - 語言
 * @returns {Array} 按鈕陣列
 */
function generateSBTButtons(profileData, language = 'zh-TW') {
  const { sbt, verificationLevel, username, userId } = profileData;
  const buttons = [];

  if (sbt.hasSBT) {
    // 已有 SBT 的按鈕
    buttons.push([
      { text: '🔍 查看 BNB Scan', url: generateBlockchainExplorerUrl(sbt.walletAddress, 'address', 'bsc') },
      { text: '👤 Twin3 個人頁面', url: generateTwin3ProfileUrl(userId, username) }
    ]);

    buttons.push([
      { text: '💎 SBT 詳情', callback_data: 'sbt_details' },
      { text: '🔄 重新整理', callback_data: 'refresh_sbt' }
    ]);
  } else if (sbt.eligibleForMint) {
    // 可以鑄造 SBT 的按鈕
    buttons.push([
      { text: '🏆 鑄造 SBT', callback_data: 'mint_sbt' }
    ]);

    buttons.push([
      { text: '👤 Twin3 個人頁面', url: generateTwin3ProfileUrl(userId, username) },
      { text: '📊 查看進度', callback_data: 'verification_progress' }
    ]);
  } else {
    // 尚未符合條件的按鈕
    buttons.push([
      { text: '🚀 繼續驗證', callback_data: 'continue_verification' }
    ]);

    buttons.push([
      { text: '👤 Twin3 個人頁面', url: generateTwin3ProfileUrl(userId, username) },
      { text: '❓ 了解 SBT', callback_data: 'learn_about_sbt' }
    ]);
  }

  // 通用按鈕
  buttons.push([
    { text: '🏠 主選單', callback_data: 'flow_main' }
  ]);

  return buttons;
}

module.exports = {
  checkSBTStatus,
  requestSBTMint,
  checkMintStatus,
  getSBTDetails,
  formatTwin3SBTInfo,
  getUserProfileAndSBT,
  generateBlockchainExplorerUrl,
  generateTwin3ProfileUrl,
  formatCompleteProfile,
  generateSBTButtons
};
