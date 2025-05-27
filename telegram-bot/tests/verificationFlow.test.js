// Twin Gate 統一驗證流程測試
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

describe('Twin Gate 統一驗證流程測試', () => {
  let verificationFlowService;
  let mockContext;
  let mockUserId;

  beforeAll(() => {
    // 設置測試環境
    process.env.NODE_ENV = 'test';
    verificationFlowService = require('../src/services/verificationFlowService');
  });

  beforeEach(() => {
    // 重置測試數據
    mockUserId = '123456789';
    mockContext = {
      from: {
        id: mockUserId,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: mockUserId,
        type: 'private'
      },
      reply: jest.fn(),
      replyWithMarkdown: jest.fn(),
      editMessageText: jest.fn(),
      answerCbQuery: jest.fn(),
      callbackQuery: null,
      sourceInfo: null,
      isGroupChat: false
    };
  });

  afterAll(() => {
    // 清理測試環境
  });

  describe('流程路徑決定', () => {
    test('新用戶應該進入語言選擇流程', async () => {
      // 模擬新用戶（無會話）
      const session = null;
      const verificationStatus = { verificationLevel: 0, humanityIndex: 0 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'private', 
        'start'
      );
      
      expect(flowPath).toBe('language_selection');
    });

    test('群組用戶應該進入群組歡迎流程', async () => {
      const session = { language: 'zh-TW' };
      const verificationStatus = { verificationLevel: 0, humanityIndex: 0 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'supergroup', 
        'start'
      );
      
      expect(flowPath).toBe('group_welcome');
    });

    test('已驗證用戶使用 status 命令應該進入儀表板', async () => {
      const session = { language: 'zh-TW' };
      const verificationStatus = { verificationLevel: 2, humanityIndex: 150 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'private', 
        'status'
      );
      
      expect(flowPath).toBe('verification_dashboard');
    });

    test('未驗證用戶使用 verify 命令應該進入驗證開始流程', async () => {
      const session = { language: 'zh-TW' };
      const verificationStatus = { verificationLevel: 0, humanityIndex: 0 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'private', 
        'verify'
      );
      
      expect(flowPath).toBe('verification_start');
    });
  });

  describe('統一流程處理', () => {
    test('應該能夠處理新用戶的統一流程', async () => {
      // 模擬新用戶
      mockContext.sourceInfo = null;
      
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      
      // 應該調用 reply 方法顯示語言選擇
      expect(mockContext.reply).toHaveBeenCalled();
      
      // 檢查回覆內容是否包含語言選擇
      const replyCall = mockContext.reply.mock.calls[0];
      expect(replyCall[0]).toContain('歡迎使用 Twin Gate');
      expect(replyCall[1]).toHaveProperty('reply_markup');
    });

    test('應該能夠處理群組用戶的統一流程', async () => {
      // 模擬群組環境
      mockContext.chat.type = 'supergroup';
      mockContext.chat.title = '測試群組';
      mockContext.isGroupChat = true;
      mockContext.sourceInfo = {
        chatId: '-1001234567890',
        chatType: 'supergroup',
        chatTitle: '測試群組'
      };
      
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      
      // 應該調用 reply 方法顯示群組歡迎
      expect(mockContext.reply).toHaveBeenCalled();
      
      // 檢查回覆內容是否包含群組相關信息
      const replyCall = mockContext.reply.mock.calls[0];
      expect(replyCall[0]).toContain('Twin Gate 人類身份驗證');
      expect(replyCall[0]).toContain('測試群組');
    });

    test('應該能夠處理已有語言設定的用戶', async () => {
      // 模擬已設定語言的用戶
      const { updateUserSession } = require('../src/utils/session');
      await updateUserSession(mockUserId, { language: 'zh-TW' });
      
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      
      // 應該顯示主儀表板
      expect(mockContext.reply).toHaveBeenCalled();
    });
  });

  describe('流程狀態管理', () => {
    test('應該能夠更新用戶流程狀態', () => {
      const testState = {
        currentStep: 'verification',
        level: 1,
        progress: 50
      };
      
      verificationFlowService.updateFlowState(mockUserId, testState);
      
      const retrievedState = verificationFlowService.getFlowState(mockUserId);
      expect(retrievedState).toMatchObject(testState);
      expect(retrievedState).toHaveProperty('timestamp');
    });

    test('應該能夠清理過期的流程狀態', () => {
      // 添加一個過期的狀態
      const expiredState = {
        currentStep: 'expired',
        timestamp: Date.now() - (31 * 60 * 1000) // 31 分鐘前
      };
      
      verificationFlowService.flowStates.set(mockUserId, expiredState);
      
      // 執行清理
      verificationFlowService.cleanupExpiredStates();
      
      // 檢查過期狀態是否被清理
      const retrievedState = verificationFlowService.getFlowState(mockUserId);
      expect(retrievedState).toBeUndefined();
    });
  });

  describe('錯誤處理', () => {
    test('應該能夠處理流程錯誤', async () => {
      // 模擬錯誤情況
      const mockError = new Error('測試錯誤');
      mockError.code = 'TEST_ERROR';
      
      await verificationFlowService.handleFlowError(mockContext, mockError);
      
      // 應該顯示錯誤訊息
      expect(mockContext.reply).toHaveBeenCalled();
      
      const replyCall = mockContext.reply.mock.calls[0];
      expect(replyCall[0]).toContain('系統暫時無法使用');
      expect(replyCall[0]).toContain('TEST_ERROR');
    });

    test('應該能夠處理回調查詢中的錯誤', async () => {
      // 模擬回調查詢
      mockContext.callbackQuery = { data: 'test' };
      
      const mockError = new Error('回調錯誤');
      await verificationFlowService.handleFlowError(mockContext, mockError);
      
      // 應該調用 editMessageText
      expect(mockContext.editMessageText).toHaveBeenCalled();
    });
  });

  describe('輔助功能', () => {
    test('應該能夠生成正確的等級描述', () => {
      const level1Desc = verificationFlowService.getLevelDescription(1, 'zh-TW');
      expect(level1Desc).toContain('Google reCAPTCHA');
      
      const level2Desc = verificationFlowService.getLevelDescription(2, 'zh-TW');
      expect(level2Desc).toContain('手機短信');
      
      const level3Desc = verificationFlowService.getLevelDescription(3, 'zh-TW');
      expect(level3Desc).toContain('生物識別');
    });

    test('應該能夠生成正確的分數範圍', () => {
      expect(verificationFlowService.getLevelScoreRange(1)).toBe('50-80 分');
      expect(verificationFlowService.getLevelScoreRange(2)).toBe('80-150 分');
      expect(verificationFlowService.getLevelScoreRange(3)).toBe('120-200 分');
    });

    test('應該能夠生成正確的預計時間', () => {
      expect(verificationFlowService.getLevelDuration(1)).toBe('1-2 分鐘');
      expect(verificationFlowService.getLevelDuration(2)).toBe('3-5 分鐘');
      expect(verificationFlowService.getLevelDuration(3)).toBe('2-3 分鐘');
    });

    test('應該能夠生成正確的下一步提示', () => {
      const status0 = { verificationLevel: 0 };
      const nextStep0 = verificationFlowService.getNextStepMessage(status0, 'zh-TW');
      expect(nextStep0).toContain('Level 1');
      
      const status1 = { verificationLevel: 1 };
      const nextStep1 = verificationFlowService.getNextStepMessage(status1, 'zh-TW');
      expect(nextStep1).toContain('Level 2');
      expect(nextStep1).toContain('SBT');
      
      const status3 = { verificationLevel: 3 };
      const nextStep3 = verificationFlowService.getNextStepMessage(status3, 'zh-TW');
      expect(nextStep3).toContain('恭喜');
    });

    test('應該能夠生成正確的歡迎訊息', () => {
      const statusPassed = { humanityIndex: 150, verificationLevel: 2 };
      const welcomePassed = verificationFlowService.getWelcomeMessage(statusPassed, 'zh-TW');
      expect(welcomePassed).toContain('恭喜');
      
      const statusInProgress = { humanityIndex: 80, verificationLevel: 1 };
      const welcomeInProgress = verificationFlowService.getWelcomeMessage(statusInProgress, 'zh-TW');
      expect(welcomeInProgress).toContain('繼續努力');
      
      const statusNew = { humanityIndex: 0, verificationLevel: 0 };
      const welcomeNew = verificationFlowService.getWelcomeMessage(statusNew, 'zh-TW');
      expect(welcomeNew).toContain('開始');
    });
  });

  describe('整合測試', () => {
    test('完整的新用戶流程', async () => {
      // 1. 新用戶開始
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      expect(mockContext.reply).toHaveBeenCalledTimes(1);
      
      // 2. 模擬語言選擇
      const { updateUserSession } = require('../src/utils/session');
      await updateUserSession(mockUserId, { language: 'zh-TW' });
      
      // 3. 進入主儀表板
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      expect(mockContext.reply).toHaveBeenCalledTimes(2);
      
      // 4. 開始驗證
      await verificationFlowService.handleUnifiedFlow(mockContext, 'verify');
      expect(mockContext.reply).toHaveBeenCalledTimes(3);
      
      // 5. 查看狀態
      await verificationFlowService.handleUnifiedFlow(mockContext, 'status');
      expect(mockContext.reply).toHaveBeenCalledTimes(4);
    });

    test('群組到私人驗證的完整流程', async () => {
      // 1. 群組中的互動
      mockContext.chat.type = 'supergroup';
      mockContext.isGroupChat = true;
      mockContext.sourceInfo = {
        chatId: '-1001234567890',
        chatType: 'supergroup',
        chatTitle: '測試群組'
      };
      
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      expect(mockContext.reply).toHaveBeenCalledTimes(1);
      
      // 2. 切換到私人聊天
      mockContext.chat.type = 'private';
      mockContext.isGroupChat = false;
      
      // 3. 私人驗證流程
      await verificationFlowService.handleUnifiedFlow(mockContext, 'verify');
      expect(mockContext.reply).toHaveBeenCalledTimes(2);
    });
  });
});
