/**
 * SBT (Soul Bound Token) 服務
 * 整合 Twin3.ai SBT 生成和錢包管理
 */

const apiClient = require('./apiClient');
const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/session');

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

module.exports = {
  checkSBTStatus,
  requestSBTMint,
  checkMintStatus,
  getSBTDetails,
  formatTwin3SBTInfo
};
