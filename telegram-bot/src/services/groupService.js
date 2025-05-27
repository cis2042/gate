// 群組管理服務
const logger = require('../utils/logger');
const { updateUserSession, getUserSession } = require('../utils/session');

class GroupService {
  constructor() {
    this.groupRegistry = new Map(); // 群組註冊表
    this.userSources = new Map(); // 用戶來源追蹤
  }

  /**
   * 註冊群組到 Twin Gate 系統
   * @param {Object} groupInfo - 群組信息
   * @param {string} groupInfo.chatId - 群組 ID
   * @param {string} groupInfo.title - 群組標題
   * @param {string} groupInfo.username - 群組用戶名
   * @param {string} groupInfo.type - 群組類型
   * @param {string} adminUserId - 註冊管理員的用戶 ID
   */
  async registerGroup(groupInfo, adminUserId) {
    try {
      const groupData = {
        ...groupInfo,
        registeredBy: adminUserId,
        registeredAt: Date.now(),
        isActive: true,
        verificationCount: 0,
        memberCount: 0
      };

      this.groupRegistry.set(groupInfo.chatId, groupData);
      
      logger.info('Group registered successfully', {
        chatId: groupInfo.chatId,
        title: groupInfo.title,
        registeredBy: adminUserId
      });

      return {
        success: true,
        data: groupData
      };
    } catch (error) {
      logger.error('Failed to register group:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 追蹤用戶來源
   * @param {string} userId - 用戶 ID
   * @param {Object} sourceInfo - 來源信息
   */
  async trackUserSource(userId, sourceInfo) {
    try {
      // 更新用戶會話中的來源信息
      await updateUserSession(userId, {
        sourceInfo,
        firstSource: this.userSources.has(userId) ? undefined : sourceInfo
      });

      // 記錄到內存中（用於快速查詢）
      this.userSources.set(userId, {
        current: sourceInfo,
        history: this.userSources.get(userId)?.history || []
      });

      // 如果是群組來源，更新群組統計
      if (sourceInfo.chatType === 'group' || sourceInfo.chatType === 'supergroup') {
        await this.updateGroupStats(sourceInfo.chatId, 'user_interaction');
      }

      logger.userAction(userId, 'source_tracked', sourceInfo);
      
      return {
        success: true,
        source: sourceInfo
      };
    } catch (error) {
      logger.error('Failed to track user source:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 獲取用戶來源信息
   * @param {string} userId - 用戶 ID
   */
  async getUserSource(userId) {
    try {
      const session = await getUserSession(userId);
      const memorySource = this.userSources.get(userId);

      return {
        success: true,
        data: {
          current: session?.sourceInfo || memorySource?.current,
          first: session?.firstSource,
          group: session?.sourceGroup,
          history: memorySource?.history || []
        }
      };
    } catch (error) {
      logger.error('Failed to get user source:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 檢查群組是否已註冊
   * @param {string} chatId - 群組 ID
   */
  isGroupRegistered(chatId) {
    return this.groupRegistry.has(chatId);
  }

  /**
   * 獲取群組信息
   * @param {string} chatId - 群組 ID
   */
  getGroupInfo(chatId) {
    return this.groupRegistry.get(chatId);
  }

  /**
   * 更新群組統計
   * @param {string} chatId - 群組 ID
   * @param {string} action - 動作類型
   */
  async updateGroupStats(chatId, action) {
    try {
      const groupData = this.groupRegistry.get(chatId);
      if (!groupData) return;

      switch (action) {
        case 'user_interaction':
          groupData.lastActivity = Date.now();
          break;
        case 'verification_completed':
          groupData.verificationCount = (groupData.verificationCount || 0) + 1;
          break;
        case 'member_joined':
          groupData.memberCount = (groupData.memberCount || 0) + 1;
          break;
        case 'member_left':
          groupData.memberCount = Math.max(0, (groupData.memberCount || 0) - 1);
          break;
      }

      this.groupRegistry.set(chatId, groupData);
      
      logger.info('Group stats updated', {
        chatId,
        action,
        stats: {
          verificationCount: groupData.verificationCount,
          memberCount: groupData.memberCount,
          lastActivity: groupData.lastActivity
        }
      });
    } catch (error) {
      logger.error('Failed to update group stats:', error);
    }
  }

  /**
   * 獲取群組驗證統計
   * @param {string} chatId - 群組 ID
   */
  getGroupStats(chatId) {
    const groupData = this.groupRegistry.get(chatId);
    if (!groupData) {
      return {
        success: false,
        error: 'Group not found'
      };
    }

    return {
      success: true,
      data: {
        chatId,
        title: groupData.title,
        verificationCount: groupData.verificationCount || 0,
        memberCount: groupData.memberCount || 0,
        registeredAt: groupData.registeredAt,
        lastActivity: groupData.lastActivity,
        isActive: groupData.isActive
      }
    };
  }

  /**
   * 列出所有註冊的群組
   */
  getAllGroups() {
    const groups = Array.from(this.groupRegistry.values());
    return {
      success: true,
      data: groups.map(group => ({
        chatId: group.chatId,
        title: group.title,
        username: group.username,
        type: group.type,
        verificationCount: group.verificationCount || 0,
        memberCount: group.memberCount || 0,
        registeredAt: group.registeredAt,
        isActive: group.isActive
      }))
    };
  }

  /**
   * 停用群組
   * @param {string} chatId - 群組 ID
   */
  deactivateGroup(chatId) {
    const groupData = this.groupRegistry.get(chatId);
    if (groupData) {
      groupData.isActive = false;
      groupData.deactivatedAt = Date.now();
      this.groupRegistry.set(chatId, groupData);
      
      logger.info('Group deactivated', { chatId });
      return { success: true };
    }
    
    return {
      success: false,
      error: 'Group not found'
    };
  }

  /**
   * 生成群組驗證報告
   * @param {string} chatId - 群組 ID
   * @param {number} days - 天數範圍
   */
  generateGroupReport(chatId, days = 30) {
    const groupData = this.groupRegistry.get(chatId);
    if (!groupData) {
      return {
        success: false,
        error: 'Group not found'
      };
    }

    const report = {
      groupInfo: {
        chatId,
        title: groupData.title,
        username: groupData.username,
        type: groupData.type
      },
      stats: {
        totalVerifications: groupData.verificationCount || 0,
        memberCount: groupData.memberCount || 0,
        registeredAt: groupData.registeredAt,
        lastActivity: groupData.lastActivity
      },
      period: {
        days,
        startDate: Date.now() - (days * 24 * 60 * 60 * 1000),
        endDate: Date.now()
      }
    };

    return {
      success: true,
      data: report
    };
  }
}

// 創建單例實例
const groupService = new GroupService();

module.exports = groupService;
