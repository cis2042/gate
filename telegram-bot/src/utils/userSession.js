// 用戶會話管理工具
// 簡化版本，使用內存存儲 (生產環境建議使用 Redis 或數據庫)

const logger = require('./logger');

// 內存存儲 (重啟後會丟失)
const userSessions = new Map();

/**
 * 獲取用戶會話
 * @param {number} userId - 用戶 ID
 * @returns {Object|null} 用戶會話數據
 */
async function getUserSession(userId) {
  try {
    const session = userSessions.get(userId.toString());
    return session || null;
  } catch (error) {
    logger.error('Error getting user session:', error);
    return null;
  }
}

/**
 * 更新用戶會話
 * @param {number} userId - 用戶 ID
 * @param {Object} sessionData - 會話數據
 * @returns {boolean} 是否成功
 */
async function updateUserSession(userId, sessionData) {
  try {
    const userIdStr = userId.toString();
    const existingSession = userSessions.get(userIdStr) || {};
    
    const updatedSession = {
      ...existingSession,
      ...sessionData,
      userId: userId,
      lastUpdated: new Date().toISOString()
    };
    
    userSessions.set(userIdStr, updatedSession);
    
    logger.debug(`Updated session for user ${userId}:`, updatedSession);
    return true;
  } catch (error) {
    logger.error('Error updating user session:', error);
    return false;
  }
}

/**
 * 刪除用戶會話
 * @param {number} userId - 用戶 ID
 * @returns {boolean} 是否成功
 */
async function deleteUserSession(userId) {
  try {
    const userIdStr = userId.toString();
    const deleted = userSessions.delete(userIdStr);
    
    if (deleted) {
      logger.info(`Deleted session for user ${userId}`);
    }
    
    return deleted;
  } catch (error) {
    logger.error('Error deleting user session:', error);
    return false;
  }
}

/**
 * 獲取所有活躍會話數量
 * @returns {number} 活躍會話數量
 */
function getActiveSessionCount() {
  return userSessions.size;
}

/**
 * 清理過期會話 (超過 24 小時未更新)
 */
function cleanupExpiredSessions() {
  const now = new Date();
  const expiredThreshold = 24 * 60 * 60 * 1000; // 24 小時
  
  let cleanedCount = 0;
  
  for (const [userId, session] of userSessions.entries()) {
    const lastUpdated = new Date(session.lastUpdated || 0);
    const timeDiff = now - lastUpdated;
    
    if (timeDiff > expiredThreshold) {
      userSessions.delete(userId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired sessions`);
  }
  
  return cleanedCount;
}

// 定期清理過期會話 (每小時執行一次)
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
  getUserSession,
  updateUserSession,
  deleteUserSession,
  getActiveSessionCount,
  cleanupExpiredSessions
};
