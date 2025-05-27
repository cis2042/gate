// Twin Gate 群組功能測試
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

describe('Twin Gate 群組功能測試', () => {
  let groupService;
  let mockGroupInfo;
  let mockUserId;

  beforeAll(() => {
    // 設置測試環境
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_GROUP_TRACKING = 'true';
    process.env.AUTO_REGISTER_GROUPS = 'true';
    
    groupService = require('../src/services/groupService');
  });

  beforeEach(() => {
    // 重置測試數據
    mockGroupInfo = {
      chatId: '-1001234567890',
      title: '測試群組',
      username: 'test_group',
      type: 'supergroup'
    };
    
    mockUserId = '123456789';
  });

  afterAll(() => {
    // 清理測試環境
    delete process.env.ENABLE_GROUP_TRACKING;
    delete process.env.AUTO_REGISTER_GROUPS;
  });

  describe('群組註冊功能', () => {
    test('應該能夠成功註冊新群組', async () => {
      const result = await groupService.registerGroup(mockGroupInfo, mockUserId);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('chatId', mockGroupInfo.chatId);
      expect(result.data).toHaveProperty('title', mockGroupInfo.title);
      expect(result.data).toHaveProperty('registeredBy', mockUserId);
      expect(result.data).toHaveProperty('isActive', true);
    });

    test('應該能夠檢查群組是否已註冊', () => {
      // 先註冊群組
      groupService.registerGroup(mockGroupInfo, mockUserId);
      
      // 檢查是否已註冊
      const isRegistered = groupService.isGroupRegistered(mockGroupInfo.chatId);
      expect(isRegistered).toBe(true);
      
      // 檢查未註冊的群組
      const isNotRegistered = groupService.isGroupRegistered('-9999999999');
      expect(isNotRegistered).toBe(false);
    });

    test('應該能夠獲取群組信息', () => {
      // 先註冊群組
      groupService.registerGroup(mockGroupInfo, mockUserId);
      
      // 獲取群組信息
      const groupInfo = groupService.getGroupInfo(mockGroupInfo.chatId);
      expect(groupInfo).toBeDefined();
      expect(groupInfo.chatId).toBe(mockGroupInfo.chatId);
      expect(groupInfo.title).toBe(mockGroupInfo.title);
    });
  });

  describe('用戶來源追蹤功能', () => {
    test('應該能夠追蹤用戶來源', async () => {
      const sourceInfo = {
        chatId: mockGroupInfo.chatId,
        chatType: 'supergroup',
        chatTitle: mockGroupInfo.title,
        timestamp: Date.now()
      };

      const result = await groupService.trackUserSource(mockUserId, sourceInfo);
      
      expect(result.success).toBe(true);
      expect(result.source).toEqual(sourceInfo);
    });

    test('應該能夠獲取用戶來源信息', async () => {
      const sourceInfo = {
        chatId: mockGroupInfo.chatId,
        chatType: 'supergroup',
        chatTitle: mockGroupInfo.title,
        timestamp: Date.now()
      };

      // 先追蹤用戶來源
      await groupService.trackUserSource(mockUserId, sourceInfo);
      
      // 獲取用戶來源
      const result = await groupService.getUserSource(mockUserId);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('current');
      expect(result.data.current).toMatchObject(sourceInfo);
    });
  });

  describe('群組統計功能', () => {
    beforeEach(async () => {
      // 註冊測試群組
      await groupService.registerGroup(mockGroupInfo, mockUserId);
    });

    test('應該能夠更新群組統計', async () => {
      // 更新用戶互動統計
      await groupService.updateGroupStats(mockGroupInfo.chatId, 'user_interaction');
      
      // 更新驗證完成統計
      await groupService.updateGroupStats(mockGroupInfo.chatId, 'verification_completed');
      
      // 獲取統計
      const statsResult = groupService.getGroupStats(mockGroupInfo.chatId);
      
      expect(statsResult.success).toBe(true);
      expect(statsResult.data).toHaveProperty('verificationCount', 1);
      expect(statsResult.data).toHaveProperty('lastActivity');
    });

    test('應該能夠獲取群組統計', () => {
      const statsResult = groupService.getGroupStats(mockGroupInfo.chatId);
      
      expect(statsResult.success).toBe(true);
      expect(statsResult.data).toHaveProperty('chatId', mockGroupInfo.chatId);
      expect(statsResult.data).toHaveProperty('title', mockGroupInfo.title);
      expect(statsResult.data).toHaveProperty('verificationCount');
      expect(statsResult.data).toHaveProperty('memberCount');
      expect(statsResult.data).toHaveProperty('isActive', true);
    });

    test('應該能夠生成群組報告', () => {
      const reportResult = groupService.generateGroupReport(mockGroupInfo.chatId, 30);
      
      expect(reportResult.success).toBe(true);
      expect(reportResult.data).toHaveProperty('groupInfo');
      expect(reportResult.data).toHaveProperty('stats');
      expect(reportResult.data).toHaveProperty('period');
      expect(reportResult.data.period.days).toBe(30);
    });
  });

  describe('群組管理功能', () => {
    beforeEach(async () => {
      // 註冊測試群組
      await groupService.registerGroup(mockGroupInfo, mockUserId);
    });

    test('應該能夠停用群組', () => {
      const result = groupService.deactivateGroup(mockGroupInfo.chatId);
      
      expect(result.success).toBe(true);
      
      // 檢查群組是否已停用
      const groupInfo = groupService.getGroupInfo(mockGroupInfo.chatId);
      expect(groupInfo.isActive).toBe(false);
      expect(groupInfo).toHaveProperty('deactivatedAt');
    });

    test('應該能夠列出所有群組', () => {
      // 註冊另一個群組
      const anotherGroup = {
        chatId: '-1001234567891',
        title: '另一個測試群組',
        username: 'another_test_group',
        type: 'supergroup'
      };
      groupService.registerGroup(anotherGroup, mockUserId);
      
      const result = groupService.getAllGroups();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      
      // 檢查是否包含我們的測試群組
      const testGroup = result.data.find(group => group.chatId === mockGroupInfo.chatId);
      expect(testGroup).toBeDefined();
      expect(testGroup.title).toBe(mockGroupInfo.title);
    });
  });

  describe('錯誤處理', () => {
    test('獲取不存在群組的統計應該返回錯誤', () => {
      const statsResult = groupService.getGroupStats('nonexistent-group');
      
      expect(statsResult.success).toBe(false);
      expect(statsResult.error).toBe('Group not found');
    });

    test('停用不存在的群組應該返回錯誤', () => {
      const result = groupService.deactivateGroup('nonexistent-group');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Group not found');
    });

    test('生成不存在群組的報告應該返回錯誤', () => {
      const reportResult = groupService.generateGroupReport('nonexistent-group');
      
      expect(reportResult.success).toBe(false);
      expect(reportResult.error).toBe('Group not found');
    });
  });

  describe('整合測試', () => {
    test('完整的群組驗證流程', async () => {
      // 1. 註冊群組
      const registerResult = await groupService.registerGroup(mockGroupInfo, mockUserId);
      expect(registerResult.success).toBe(true);
      
      // 2. 追蹤用戶來源
      const sourceInfo = {
        chatId: mockGroupInfo.chatId,
        chatType: 'supergroup',
        chatTitle: mockGroupInfo.title,
        timestamp: Date.now()
      };
      const trackResult = await groupService.trackUserSource(mockUserId, sourceInfo);
      expect(trackResult.success).toBe(true);
      
      // 3. 更新群組統計
      await groupService.updateGroupStats(mockGroupInfo.chatId, 'user_interaction');
      await groupService.updateGroupStats(mockGroupInfo.chatId, 'verification_completed');
      
      // 4. 獲取統計
      const statsResult = groupService.getGroupStats(mockGroupInfo.chatId);
      expect(statsResult.success).toBe(true);
      expect(statsResult.data.verificationCount).toBe(1);
      
      // 5. 生成報告
      const reportResult = groupService.generateGroupReport(mockGroupInfo.chatId);
      expect(reportResult.success).toBe(true);
      
      // 6. 獲取用戶來源
      const sourceResult = await groupService.getUserSource(mockUserId);
      expect(sourceResult.success).toBe(true);
      expect(sourceResult.data.current.chatId).toBe(mockGroupInfo.chatId);
    });
  });
});
