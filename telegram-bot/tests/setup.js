// Jest 測試設置文件
const path = require('path');

// 設置測試環境變量
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.TWIN3_API_KEY = 'test-api-key';
process.env.LOG_LEVEL = 'error'; // 減少測試時的日誌輸出

// 模擬 console 方法以減少測試輸出
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 全局測試工具
global.testUtils = {
  // 創建模擬用戶
  createMockUser: (id = '123456789') => ({
    id,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'zh-TW'
  }),
  
  // 創建模擬上下文
  createMockContext: (user) => ({
    from: user || global.testUtils.createMockUser(),
    chat: { id: user?.id || '123456789' },
    reply: jest.fn(),
    replyWithMarkdown: jest.fn(),
    editMessageText: jest.fn(),
    answerCbQuery: jest.fn()
  }),
  
  // 等待函數
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// 設置測試超時
jest.setTimeout(10000);

// 測試前清理
beforeEach(() => {
  jest.clearAllMocks();
});

// 測試後清理
afterEach(() => {
  // 清理任何測試數據
});

// 全局錯誤處理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
