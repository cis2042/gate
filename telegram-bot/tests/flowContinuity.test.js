const { Telegraf } = require('telegraf');
const verificationFlowService = require('../src/services/verificationFlowService');
const { getUserSession, updateUserSession } = require('../src/utils/session');
const { getUserVerificationStatus } = require('../src/utils/userStatus');

// Mock dependencies
jest.mock('../src/utils/session');
jest.mock('../src/utils/userStatus');
jest.mock('../src/services/groupService');
jest.mock('../src/services/apiClient');
jest.mock('../src/utils/logger');

describe('Twin Gate Flow Continuity Tests', () => {
  let mockCtx;
  let mockBot;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock context
    mockCtx = {
      from: {
        id: 12345,
        first_name: 'TestUser',
        username: 'testuser'
      },
      chat: {
        id: 12345,
        type: 'private'
      },
      reply: jest.fn().mockResolvedValue({}),
      editMessageText: jest.fn().mockResolvedValue({}),
      answerCbQuery: jest.fn().mockResolvedValue({}),
      callbackQuery: null
    };

    // Mock bot
    mockBot = new Telegraf('fake-token');
  });

  describe('New User Flow', () => {
    test('should guide new user through complete flow', async () => {
      // Mock new user (no session)
      getUserSession.mockResolvedValue(null);
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 0,
        humanityIndex: 0,
        hasSBT: false,
        currentLevel: 1
      });

      // Test language selection flow
      await verificationFlowService.handleUnifiedFlow(mockCtx, 'start');

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to Twin Gate'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: '🚀 Start Verification'
                })
              ])
            ])
          })
        })
      );
    });

    test('should continue to verification after language selection', async () => {
      // Mock user with language set
      getUserSession.mockResolvedValue({
        language: 'en-US',
        started: true
      });
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 0,
        humanityIndex: 0,
        hasSBT: false,
        currentLevel: 1
      });

      await verificationFlowService.handleUnifiedFlow(mockCtx, 'verify');

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Task #001'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: expect.stringContaining('Level 1')
                })
              ])
            ])
          })
        })
      );
    });
  });

  describe('Verification Progress Flow', () => {
    test('should show appropriate buttons for each verification level', async () => {
      getUserSession.mockResolvedValue({
        language: 'zh-TW',
        started: true
      });

      // Test Level 0 (no verification)
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 0,
        humanityIndex: 0,
        hasSBT: false,
        currentLevel: 1
      });

      await verificationFlowService.handleUnifiedFlow(mockCtx, 'verify');

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('開始 Level 1 驗證'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: '🟢 開始 Level 1 驗證'
                })
              ])
            ])
          })
        })
      );
    });

    test('should show Level 2 available after Level 1 completion', async () => {
      getUserSession.mockResolvedValue({
        language: 'zh-TW',
        started: true
      });

      // Test Level 1 completed
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 1,
        humanityIndex: 75,
        hasSBT: false,
        currentLevel: 2
      });

      await verificationFlowService.handleUnifiedFlow(mockCtx, 'verify');

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Level 1'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: '✅ Level 1 已完成'
                })
              ]),
              expect.arrayContaining([
                expect.objectContaining({
                  text: '🟡 開始 Level 2 驗證'
                })
              ])
            ])
          })
        })
      );
    });

    test('should show SBT minting option after Level 2', async () => {
      getUserSession.mockResolvedValue({
        language: 'zh-TW',
        started: true
      });

      // Test Level 2 completed
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 2,
        humanityIndex: 120,
        hasSBT: false,
        currentLevel: 3
      });

      await verificationFlowService.handleUnifiedFlow(mockCtx, 'verify');

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Level 2'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: '🏆 鑄造 Twin3 SBT'
                })
              ])
            ])
          })
        })
      );
    });
  });

  describe('Command Integration', () => {
    test('/start should lead to verification flow for new users', async () => {
      getUserSession.mockResolvedValue(null);
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 0,
        humanityIndex: 0,
        hasSBT: false,
        currentLevel: 1
      });

      await verificationFlowService.handleUnifiedFlow(mockCtx, 'start');

      // Should show language selection for new users
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to Twin Gate'),
        expect.any(Object)
      );
    });

    test('/verify should show verification dashboard for existing users', async () => {
      getUserSession.mockResolvedValue({
        language: 'zh-TW',
        started: true
      });
      getUserVerificationStatus.mockResolvedValue({
        verificationLevel: 1,
        humanityIndex: 75,
        hasSBT: false,
        currentLevel: 2
      });

      await verificationFlowService.handleUnifiedFlow(mockCtx, 'verify');

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Task #001'),
        expect.any(Object)
      );
    });
  });

  describe('Flow Path Determination', () => {
    test('should determine correct flow path for different user states', () => {
      const service = verificationFlowService;

      // New user
      let path = service.determineFlowPath(null, { verificationLevel: 0 }, 'private', 'start');
      expect(path).toBe('language_selection');

      // User with language, no verification
      path = service.determineFlowPath(
        { language: 'zh-TW' },
        { verificationLevel: 0 },
        'private',
        'start'
      );
      expect(path).toBe('verification_start');

      // User with partial verification
      path = service.determineFlowPath(
        { language: 'zh-TW' },
        { verificationLevel: 1 },
        'private',
        'verify'
      );
      expect(path).toBe('verification_dashboard');

      // Group chat
      path = service.determineFlowPath(
        { language: 'zh-TW' },
        { verificationLevel: 0 },
        'group',
        'start'
      );
      expect(path).toBe('group_welcome');
    });
  });
});
