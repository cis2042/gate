/**
 * 使用者狀態管理系統
 * User Status Management System
 */

const { getUserSession, updateUserSession } = require('./session');
const logger = require('./logger');

/**
 * 獲取使用者驗證狀態
 * @param {number} userId - 使用者 ID
 * @returns {object} 使用者狀態
 */
async function getUserVerificationStatus(userId) {
  try {
    const session = await getUserSession(userId);

    if (!session) {
      return {
        verificationLevel: 0,
        currentLevel: 1,
        isVerified: false,
        humanityIndex: 0,
        completedLevels: [],
        inProgress: false
      };
    }

    return {
      verificationLevel: session.verificationLevel || 0,
      currentLevel: session.currentLevel || 1,
      isVerified: session.isVerified || false,
      humanityIndex: session.humanityIndex || 0,
      completedLevels: session.completedLevels || [],
      inProgress: session.verificationInProgress || false,
      currentVerification: session.currentVerification || null
    };
  } catch (error) {
    logger.error('Error getting user verification status:', error);
    return {
      verificationLevel: 0,
      currentLevel: 1,
      isVerified: false,
      humanityIndex: 0,
      completedLevels: [],
      inProgress: false
    };
  }
}

/**
 * 更新使用者驗證狀態
 * @param {number} userId - 使用者 ID
 * @param {object} statusUpdate - 狀態更新
 */
async function updateUserVerificationStatus(userId, statusUpdate) {
  try {
    const currentStatus = await getUserVerificationStatus(userId);

    const updatedStatus = {
      ...currentStatus,
      ...statusUpdate,
      lastUpdated: new Date().toISOString()
    };

    await updateUserSession(userId, updatedStatus);

    logger.info('User verification status updated', {
      userId,
      statusUpdate,
      newStatus: updatedStatus
    });

    return updatedStatus;
  } catch (error) {
    logger.error('Error updating user verification status:', error);
    throw error;
  }
}

/**
 * 標記等級為已完成
 * @param {number} userId - 使用者 ID
 * @param {number} level - 完成的等級
 * @param {object} verificationData - 驗證資料
 */
async function markLevelCompleted(userId, level, verificationData = {}) {
  try {
    const currentStatus = await getUserVerificationStatus(userId);

    // 確保等級按順序完成
    if (level !== currentStatus.currentLevel) {
      throw new Error(`Level ${level} cannot be completed. Current level should be ${currentStatus.currentLevel}`);
    }

    const completedLevels = [...currentStatus.completedLevels];
    if (!completedLevels.includes(level)) {
      completedLevels.push(level);
    }

    const statusUpdate = {
      verificationLevel: Math.max(currentStatus.verificationLevel, level),
      currentLevel: level < 3 ? level + 1 : 3,
      completedLevels: completedLevels.sort((a, b) => a - b),
      isVerified: level >= 2, // 完成 Level 2 即視為已驗證
      sbtEligible: level >= 2, // 完成 Level 2 才有 SBT 資格
      verificationInProgress: false,
      currentVerification: null,
      [`level${level}Data`]: {
        ...verificationData,
        completedAt: new Date().toISOString()
      }
    };

    // 如果有 humanityIndex，更新它
    if (verificationData.humanityIndex !== undefined) {
      statusUpdate.humanityIndex = verificationData.humanityIndex;
    }

    await updateUserVerificationStatus(userId, statusUpdate);

    logger.info('Level marked as completed', {
      userId,
      level,
      newCurrentLevel: statusUpdate.currentLevel,
      isVerified: statusUpdate.isVerified
    });

    return statusUpdate;
  } catch (error) {
    logger.error('Error marking level as completed:', error);
    throw error;
  }
}

/**
 * 開始等級驗證
 * @param {number} userId - 使用者 ID
 * @param {number} level - 驗證等級
 * @param {object} verificationData - 驗證資料
 */
async function startLevelVerification(userId, level, verificationData) {
  try {
    const currentStatus = await getUserVerificationStatus(userId);

    // 檢查是否可以進行此等級驗證
    if (level !== currentStatus.currentLevel) {
      throw new Error(`Cannot start level ${level}. Current available level is ${currentStatus.currentLevel}`);
    }

    // 檢查是否已完成此等級
    if (currentStatus.completedLevels.includes(level)) {
      throw new Error(`Level ${level} is already completed`);
    }

    const statusUpdate = {
      verificationInProgress: true,
      currentVerification: {
        level,
        ...verificationData,
        startedAt: new Date().toISOString()
      }
    };

    await updateUserVerificationStatus(userId, statusUpdate);

    logger.info('Level verification started', {
      userId,
      level,
      verificationData
    });

    return statusUpdate;
  } catch (error) {
    logger.error('Error starting level verification:', error);
    throw error;
  }
}

/**
 * 檢查使用者是否可以進行指定等級驗證
 * @param {number} userId - 使用者 ID
 * @param {number} level - 要檢查的等級
 * @returns {boolean} 是否可以進行
 */
async function canUserAccessLevel(userId, level) {
  try {
    const status = await getUserVerificationStatus(userId);

    // Level 1 總是可以進行（如果未完成）
    if (level === 1) {
      return !status.completedLevels.includes(1);
    }

    // 其他等級需要前一等級完成
    return status.currentLevel >= level && !status.completedLevels.includes(level);
  } catch (error) {
    logger.error('Error checking user level access:', error);
    return false;
  }
}

/**
 * 獲取下一個可用等級
 * @param {number} userId - 使用者 ID
 * @returns {number|null} 下一個可用等級，如果全部完成則返回 null
 */
async function getNextAvailableLevel(userId) {
  try {
    const status = await getUserVerificationStatus(userId);

    if (status.currentLevel > 3) {
      return null; // 全部完成
    }

    return status.currentLevel;
  } catch (error) {
    logger.error('Error getting next available level:', error);
    return 1; // 預設返回 Level 1
  }
}

/**
 * 重置使用者驗證狀態（僅用於測試）
 * @param {number} userId - 使用者 ID
 */
async function resetUserVerificationStatus(userId) {
  try {
    const resetStatus = {
      verificationLevel: 0,
      currentLevel: 1,
      isVerified: false,
      humanityIndex: 0,
      completedLevels: [],
      verificationInProgress: false,
      currentVerification: null,
      level1Data: null,
      level2Data: null,
      level3Data: null,
      lastUpdated: new Date().toISOString()
    };

    await updateUserSession(userId, resetStatus);

    logger.info('User verification status reset', { userId });

    return resetStatus;
  } catch (error) {
    logger.error('Error resetting user verification status:', error);
    throw error;
  }
}

module.exports = {
  getUserVerificationStatus,
  updateUserVerificationStatus,
  markLevelCompleted,
  startLevelVerification,
  canUserAccessLevel,
  getNextAvailableLevel,
  resetUserVerificationStatus
};
