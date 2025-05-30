const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

const logger = require('./utils/logger');
const apiClient = require('./services/apiClient');
const errorHandler = require('./utils/errorHandler');
const { getUserSession, updateUserSession } = require('./utils/userSession');
const verificationFlowService = require('./services/verificationFlowService');
const { t } = require('./utils/i18n');

class TwinGateBot {
  constructor() {
    this.bot = null;
    this.app = null;
    this.server = null;
    this.initialized = false;
    this.isWebhookMode = process.env.NODE_ENV === 'production';
  }

  async initialize() {
    try {
      // Validate required environment variables
      this.validateConfig();

      // Setup Express server for health checks and webhooks
      this.setupExpressServer();

      // Create bot instance
      const token = process.env.BOT_TOKEN;
      const options = {
        polling: !this.isWebhookMode, // 只在開發環境使用 polling
        webHook: this.isWebhookMode ? {
          port: process.env.PORT || 8080,
          host: '0.0.0.0'
        } : false
      };

      this.bot = new TelegramBot(token, options);

      // Setup command handlers
      this.setupCommands();

      // Setup callback handlers
      this.setupCallbacks();

      // Setup message handlers
      this.setupMessageHandlers();

      // Setup error handling
      this.setupErrorHandling();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.initialized = true;
      logger.info('🤖 Twin Gate Telegram Bot initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize bot:', error);
      throw error;
    }
  }

  validateConfig() {
    const required = ['BOT_TOKEN', 'API_BASE_URL'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  setupExpressServer() {
    this.app = express();
    const port = process.env.PORT || 8080; // App Engine 默認端口

    // Middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Trust proxy for App Engine
    this.app.set('trust proxy', true);

    // Health check endpoint (App Engine 要求)
    this.app.get('/health', (req, res) => {
      res.status(200).json(this.getHealthStatus());
    });

    // Readiness check endpoint (App Engine 要求)
    this.app.get('/_ah/health', (req, res) => {
      res.status(200).send('OK');
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Twin Gate Bot is running on App Engine',
        service: 'twin-gate-telegram-bot',
        version: require('../package.json').version || '1.0.0',
        status: 'active',
        platform: 'Google App Engine',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Webhook endpoint for Telegram (App Engine 模式)
    this.app.post('/webhook', (req, res) => {
      try {
        if (this.bot && this.isWebhookMode) {
          // 在 App Engine 中，我們需要手動處理 webhook 更新
          this.bot.processUpdate(req.body);
        }
        res.status(200).send('OK');
      } catch (error) {
        logger.error('Webhook processing error:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    // Start server
    this.server = this.app.listen(port, () => {
      logger.info(`🌐 HTTP server listening on port ${port} (App Engine mode)`);
    });
  }

  setupCommands() {
    // /start 命令
    this.bot.onText(/\/start/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        logger.info(`User ${userId} started the bot`);
        await this.handleStartCommand(chatId, userId, msg.from);
      } catch (error) {
        logger.error('Error in /start command:', error);
      }
    });

    // /verify 命令
    this.bot.onText(/\/verify/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        await this.handleVerifyCommand(chatId, userId, msg.from);
      } catch (error) {
        logger.error('Error in /verify command:', error);
      }
    });

    // /sbt 命令
    this.bot.onText(/\/sbt/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        await this.handleSbtCommand(chatId, userId, msg.from);
      } catch (error) {
        logger.error('Error in /sbt command:', error);
      }
    });

    // /help 命令
    this.bot.onText(/\/help/, async (msg) => {
      try {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        await this.handleHelpCommand(chatId, userId, msg.from);
      } catch (error) {
        logger.error('Error in /help command:', error);
      }
    });
  }

  setupCallbacks() {
    // 處理 inline keyboard 回調
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        const action = callbackQuery.data;
        const msg = callbackQuery.message;
        const userId = callbackQuery.from.id;
        const chatId = msg.chat.id;

        // 確認回調查詢
        await this.bot.answerCallbackQuery(callbackQuery.id);

        // 處理不同的回調動作
        await this.handleCallbackQuery(action, chatId, userId, callbackQuery);
      } catch (error) {
        logger.error('Error in callback query:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '❌ 處理請求時發生錯誤',
          show_alert: true
        });
      }
    });
  }

  setupMessageHandlers() {
    // 處理所有文本消息
    this.bot.on('message', async (msg) => {
      try {
        // 跳過命令消息（已由 onText 處理）
        if (msg.text && msg.text.startsWith('/')) {
          return;
        }

        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // 處理一般文本消息
        await this.handleTextMessage(chatId, userId, msg);
      } catch (error) {
        logger.error('Error in message handler:', error);
      }
    });
  }

  setupErrorHandling() {
    // Bot 錯誤處理
    this.bot.on('error', (error) => {
      logger.error('Telegram Bot error:', error);
    });

    this.bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });

    this.bot.on('webhook_error', (error) => {
      logger.error('Webhook error:', error);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      logger.info('Received shutdown signal, gracefully shutting down...');
      this.gracefulShutdown();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get bot info first
      const botInfo = await this.bot.getMe();
      this.bot.botInfo = botInfo;
      logger.info(`🤖 Bot info loaded: @${botInfo.username} (ID: ${botInfo.id})`);

      // Set bot commands
      await this.setBotCommands();

      // Start bot based on environment
      if (this.isWebhookMode) {
        await this.startWebhookMode();
      } else {
        await this.startPollingMode();
      }

    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async setBotCommands() {
    try {
      // 簡化的命令列表 - 英文優先
      const commandsEn = [
        { command: 'verify', description: '🚀 Start/Check verification status' },
        { command: 'sbt', description: '🏆 View SBT and profile' },
        { command: 'help', description: '❓ Get help and support' }
      ];

      const commandsZhTW = [
        { command: 'verify', description: '🚀 開始/查看驗證狀態' },
        { command: 'sbt', description: '🏆 查看 SBT 和個人資料' },
        { command: 'help', description: '❓ 獲取幫助和支援' }
      ];

      // 設定預設命令（英文優先）
      await this.bot.setMyCommands(commandsEn);

      // 設定中文命令
      await this.bot.setMyCommands(commandsZhTW, {
        language_code: 'zh'
      });

      logger.info('Bot commands set successfully');
    } catch (error) {
      logger.error('Failed to set bot commands:', error);
    }
  }

  async startPollingMode() {
    logger.info('🔄 Starting bot in polling mode (development)...');

    // Bot 已經在構造函數中設置為 polling 模式
    logger.info('✅ Bot started successfully in polling mode');
  }

  async startWebhookMode() {
    logger.info('🌐 Starting bot in webhook mode (App Engine)...');

    try {
      // 設置 webhook URL
      const webhookUrl = `https://${process.env.GAE_SERVICE || 'twin-gate-bot'}-dot-${process.env.GOOGLE_CLOUD_PROJECT || 'twin-gate'}.appspot.com/webhook`;

      // 刪除現有的 webhook
      await this.bot.deleteWebHook();

      // 設置新的 webhook
      await this.bot.setWebHook(webhookUrl, {
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      });

      logger.info(`✅ Webhook set successfully: ${webhookUrl}`);
    } catch (error) {
      logger.error('Failed to set webhook:', error);
      throw error;
    }
  }

  // 命令處理器
  async handleStartCommand(chatId, userId, user) {
    try {
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      // 創建歡迎消息
      const welcomeText = t('welcome.message', language, {
        name: user.first_name || user.username || 'User'
      });

      // 創建按鈕
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🚀 Start Verification', callback_data: 'start_verification' },
            { text: '🌍 Language Settings', callback_data: 'language_settings' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      logger.error('Error in handleStartCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 發生錯誤，請稍後再試。');
    }
  }

  async handleVerifyCommand(chatId, userId, user) {
    try {
      // 使用現有的驗證流程服務
      const ctx = {
        chat: { id: chatId },
        from: { id: userId, ...user },
        reply: (text, options) => this.bot.sendMessage(chatId, text, options),
        editMessageText: (text, options) => this.bot.editMessageText(text, { chat_id: chatId, ...options })
      };

      await verificationFlowService.handleUnifiedFlow(ctx, 'verify');
    } catch (error) {
      logger.error('Error in handleVerifyCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 驗證過程中發生錯誤，請稍後再試。');
    }
  }

  async handleSbtCommand(chatId, userId, user) {
    try {
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      // 簡化的 SBT 信息
      const sbtText = t('sbt.info', language);

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔗 View on BNB Scan', callback_data: 'view_bnb_scan' },
            { text: '👤 Twin3 Profile', callback_data: 'view_twin3_profile' }
          ],
          [
            { text: '🔙 Back to Menu', callback_data: 'main_menu' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, sbtText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      logger.error('Error in handleSbtCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 獲取 SBT 信息時發生錯誤。');
    }
  }

  async handleHelpCommand(chatId, userId, user) {
    try {
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      const helpText = t('help.message', language);

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🌐 Twin3.ai Website', url: 'https://twin3.ai' },
            { text: '📚 Documentation', url: 'https://docs.twin3.ai' }
          ],
          [
            { text: '💬 Support Group', url: 'https://t.me/twin3support' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, helpText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

    } catch (error) {
      logger.error('Error in handleHelpCommand:', error);
      await this.bot.sendMessage(chatId, '❌ 獲取幫助信息時發生錯誤。');
    }
  }

  async handleCallbackQuery(action, chatId, userId, callbackQuery) {
    try {
      // 處理不同的回調動作
      switch (action) {
        case 'start_verification':
          await this.handleVerifyCommand(chatId, userId, callbackQuery.from);
          break;

        case 'language_settings':
          await this.showLanguageSettings(chatId, userId);
          break;

        case 'main_menu':
          await this.handleStartCommand(chatId, userId, callbackQuery.from);
          break;

        default:
          // 處理語言選擇
          if (action.startsWith('lang_')) {
            const language = action.replace('lang_', '');
            await this.setUserLanguage(chatId, userId, language);
          } else {
            logger.warn(`Unknown callback action: ${action}`);
          }
      }
    } catch (error) {
      logger.error('Error in handleCallbackQuery:', error);
    }
  }

  async handleTextMessage(chatId, userId, msg) {
    try {
      // 處理一般文本消息
      const session = await getUserSession(userId);
      const language = session?.language || 'en-US';

      const responseText = t('general.unknown_command', language);
      await this.bot.sendMessage(chatId, responseText);
    } catch (error) {
      logger.error('Error in handleTextMessage:', error);
    }
  }

  async showLanguageSettings(chatId, userId) {
    try {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🇺🇸 English', callback_data: 'lang_en-US' },
            { text: '🇹🇼 繁體中文', callback_data: 'lang_zh-TW' }
          ],
          [
            { text: '🇨🇳 简体中文', callback_data: 'lang_zh-CN' },
            { text: '🇰🇷 한국어', callback_data: 'lang_ko-KR' }
          ],
          [
            { text: '🇫🇷 Français', callback_data: 'lang_fr-FR' },
            { text: '🇩🇪 Deutsch', callback_data: 'lang_de-DE' }
          ],
          [
            { text: '🇪🇸 Español', callback_data: 'lang_es-ES' },
            { text: '🇷🇺 Русский', callback_data: 'lang_ru-RU' }
          ],
          [
            { text: '🔙 Back', callback_data: 'main_menu' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, '🌍 Please select your language:', {
        reply_markup: keyboard
      });
    } catch (error) {
      logger.error('Error in showLanguageSettings:', error);
    }
  }

  async setUserLanguage(chatId, userId, language) {
    try {
      await updateUserSession(userId, { language });

      const confirmText = t('language.changed', language);
      await this.bot.sendMessage(chatId, confirmText);

      // 返回主菜單
      setTimeout(() => {
        this.handleStartCommand(chatId, userId, { id: userId });
      }, 1000);
    } catch (error) {
      logger.error('Error in setUserLanguage:', error);
    }
  }

  async gracefulShutdown() {
    try {
      logger.info('Stopping bot and server...');

      // Stop HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server stopped');
      }

      // Stop bot
      if (this.bot && !this.isWebhookMode) {
        this.bot.stopPolling();
        logger.info('Bot polling stopped');
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Health check endpoint for monitoring
  getHealthStatus() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      botInfo: this.bot ? {
        username: this.bot.botInfo?.username,
        id: this.bot.botInfo?.id
      } : null,
      environment: process.env.NODE_ENV,
      platform: 'Google App Engine',
      version: require('../package.json').version
    };
  }
}

// Create and export bot instance
const twinGateBot = new TwinGateBot();

// Start bot if this file is run directly
if (require.main === module) {
  twinGateBot.start().catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  });
}

module.exports = twinGateBot;
