// Twin Gate 簡化流程測試
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

describe('Twin Gate 簡化流程測試', () => {
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

  describe('英文優先的歡迎流程', () => {
    test('新用戶應該看到英文歡迎訊息', async () => {
      await verificationFlowService.showLanguageSelection(mockContext, 'Test');
      
      expect(mockContext.reply).toHaveBeenCalled();
      
      const replyCall = mockContext.reply.mock.calls[0];
      const message = replyCall[0];
      const options = replyCall[1];
      
      // 檢查訊息是否為英文
      expect(message).toContain('Welcome to Twin Gate!');
      expect(message).toContain('Twin3.ai Human Identity Verification System');
      expect(message).toContain('Choose an option to get started');
      
      // 檢查按鈕
      expect(options.reply_markup.inline_keyboard).toHaveLength(2);
      expect(options.reply_markup.inline_keyboard[0][0].text).toBe('🚀 Start Verification');
      expect(options.reply_markup.inline_keyboard[1][0].text).toBe('🌍 Language Settings');
    });

    test('應該只顯示兩個主要按鈕', async () => {
      await verificationFlowService.showLanguageSelection(mockContext, 'Test');
      
      const replyCall = mockContext.reply.mock.calls[0];
      const options = replyCall[1];
      const buttons = options.reply_markup.inline_keyboard;
      
      // 檢查只有兩個按鈕行
      expect(buttons).toHaveLength(2);
      
      // 檢查按鈕回調數據
      expect(buttons[0][0].callback_data).toBe('start_verification_en');
      expect(buttons[1][0].callback_data).toBe('language_settings');
    });
  });

  describe('簡化的主儀表板', () => {
    test('主儀表板應該只顯示兩個主要按鈕', async () => {
      const mockVerificationStatus = {
        verificationLevel: 1,
        humanityIndex: 80,
        hasSBT: false
      };

      await verificationFlowService.showMainDashboard(
        mockContext, 
        'en-US', 
        'Test', 
        mockVerificationStatus
      );
      
      expect(mockContext.reply).toHaveBeenCalled();
      
      const replyCall = mockContext.reply.mock.calls[0];
      const options = replyCall[1];
      const buttons = options.reply_markup.inline_keyboard;
      
      // 檢查只有兩個按鈕行
      expect(buttons).toHaveLength(2);
      
      // 檢查按鈕內容
      expect(buttons[0][0].callback_data).toBe('flow_verify');
      expect(buttons[1][0].callback_data).toBe('redirect_to_sbt');
    });

    test('主儀表板應該使用多語言翻譯', async () => {
      const mockVerificationStatus = {
        verificationLevel: 2,
        humanityIndex: 150,
        hasSBT: true
      };

      // 測試中文
      await verificationFlowService.showMainDashboard(
        mockContext, 
        'zh-TW', 
        'Test', 
        mockVerificationStatus
      );
      
      expect(mockContext.reply).toHaveBeenCalled();
      
      const replyCall = mockContext.reply.mock.calls[0];
      const message = replyCall[0];
      
      // 檢查中文翻譯
      expect(message).toContain('歡迎回來');
      expect(message).toContain('驗證等級');
      expect(message).toContain('已通過');
    });
  });

  describe('簡化的驗證儀表板', () => {
    test('驗證儀表板應該移除多餘按鈕', async () => {
      const mockVerificationStatus = {
        verificationLevel: 1,
        humanityIndex: 80,
        hasSBT: false
      };

      const buttons = verificationFlowService.createDashboardButtons(
        mockVerificationStatus, 
        'en-US'
      );
      
      // 檢查按鈕數量減少
      expect(buttons.length).toBeLessThanOrEqual(3); // 最多 3 行按鈕
      
      // 檢查必要按鈕存在
      const flatButtons = buttons.flat();
      const hasStartLevel = flatButtons.some(btn => 
        btn.callback_data && btn.callback_data.startsWith('start_level_')
      );
      const hasMainMenu = flatButtons.some(btn => 
        btn.callback_data === 'flow_main'
      );
      
      expect(hasStartLevel).toBe(true);
      expect(hasMainMenu).toBe(true);
    });

    test('已完成驗證的用戶應該看到 SBT 按鈕', async () => {
      const mockVerificationStatus = {
        verificationLevel: 3,
        humanityIndex: 200,
        hasSBT: true
      };

      const buttons = verificationFlowService.createDashboardButtons(
        mockVerificationStatus, 
        'en-US'
      );
      
      const flatButtons = buttons.flat();
      const hasSBTButton = flatButtons.some(btn => 
        btn.callback_data === 'redirect_to_sbt'
      );
      
      expect(hasSBTButton).toBe(true);
    });
  });

  describe('語言設定流程', () => {
    test('語言設定應該顯示所有支援的語言', () => {
      // 這個測試需要模擬語言設定回調
      // 在實際實現中，會顯示所有支援的語言選項
      const { getSupportedLanguages } = require('../src/locales');
      const supportedLanguages = getSupportedLanguages();
      
      expect(supportedLanguages).toBeInstanceOf(Array);
      expect(supportedLanguages.length).toBeGreaterThan(0);
      
      // 檢查是否包含主要語言
      const languageCodes = supportedLanguages.map(lang => lang.code);
      expect(languageCodes).toContain('en-US');
      expect(languageCodes).toContain('zh-TW');
    });
  });

  describe('流程決定邏輯', () => {
    test('新用戶應該進入語言選擇流程', () => {
      const session = null; // 新用戶沒有會話
      const verificationStatus = { verificationLevel: 0, humanityIndex: 0 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'private', 
        'start'
      );
      
      expect(flowPath).toBe('language_selection');
    });

    test('已設定語言的用戶應該進入主儀表板', () => {
      const session = { language: 'en-US' };
      const verificationStatus = { verificationLevel: 0, humanityIndex: 0 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'private', 
        'start'
      );
      
      expect(flowPath).toBe('main_dashboard');
    });

    test('群組用戶應該進入群組歡迎流程', () => {
      const session = { language: 'en-US' };
      const verificationStatus = { verificationLevel: 0, humanityIndex: 0 };
      
      const flowPath = verificationFlowService.determineFlowPath(
        session, 
        verificationStatus, 
        'supergroup', 
        'start'
      );
      
      expect(flowPath).toBe('group_welcome');
    });
  });

  describe('錯誤處理', () => {
    test('應該能夠處理流程錯誤', async () => {
      const mockError = new Error('測試錯誤');
      
      await verificationFlowService.handleFlowError(mockContext, mockError);
      
      expect(mockContext.reply).toHaveBeenCalled();
      
      const replyCall = mockContext.reply.mock.calls[0];
      const message = replyCall[0];
      
      expect(message).toContain('系統暫時無法使用');
      expect(message).toContain('請稍後再試');
    });
  });

  describe('整合測試', () => {
    test('完整的新用戶英文流程', async () => {
      // 1. 新用戶開始
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      expect(mockContext.reply).toHaveBeenCalledTimes(1);
      
      // 檢查顯示英文歡迎訊息
      const welcomeCall = mockContext.reply.mock.calls[0];
      expect(welcomeCall[0]).toContain('Welcome to Twin Gate!');
      
      // 2. 模擬點擊 "Start Verification"
      const { updateUserSession } = require('../src/utils/session');
      await updateUserSession(mockUserId, { language: 'en-US' });
      
      // 3. 進入驗證流程
      await verificationFlowService.handleUnifiedFlow(mockContext, 'verify');
      expect(mockContext.reply).toHaveBeenCalledTimes(2);
    });

    test('回訪用戶的簡化流程', async () => {
      // 設置回訪用戶
      const { updateUserSession } = require('../src/utils/session');
      await updateUserSession(mockUserId, { 
        language: 'en-US',
        started: true 
      });
      
      // 回訪用戶開始
      await verificationFlowService.handleUnifiedFlow(mockContext, 'start');
      
      // 應該直接進入主儀表板
      expect(mockContext.reply).toHaveBeenCalled();
      
      const replyCall = mockContext.reply.mock.calls[0];
      const options = replyCall[1];
      
      // 檢查只有簡化的按鈕
      expect(options.reply_markup.inline_keyboard.length).toBeLessThanOrEqual(2);
    });
  });

  describe('按鈕簡化驗證', () => {
    test('移除了檢查狀態和了解更多按鈕', async () => {
      await verificationFlowService.showLanguageSelection(mockContext, 'Test');
      
      const replyCall = mockContext.reply.mock.calls[0];
      const options = replyCall[1];
      const buttons = options.reply_markup.inline_keyboard;
      
      // 檢查沒有 "檢查狀態" 或 "了解更多" 按鈕
      const allButtonTexts = buttons.flat().map(btn => btn.text);
      
      expect(allButtonTexts).not.toContain('📊 Check Status');
      expect(allButtonTexts).not.toContain('ℹ️ Learn More');
      expect(allButtonTexts).not.toContain('📊 檢查狀態');
      expect(allButtonTexts).not.toContain('ℹ️ 了解更多');
    });

    test('只保留核心功能按鈕', async () => {
      await verificationFlowService.showLanguageSelection(mockContext, 'Test');
      
      const replyCall = mockContext.reply.mock.calls[0];
      const options = replyCall[1];
      const buttons = options.reply_markup.inline_keyboard;
      
      // 檢查只有核心按鈕
      expect(buttons).toHaveLength(2);
      expect(buttons[0][0].text).toBe('🚀 Start Verification');
      expect(buttons[1][0].text).toBe('🌍 Language Settings');
    });
  });
});
