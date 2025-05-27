const { Telegraf, Scenes, session } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config();

const logger = require('./utils/logger');
const apiClient = require('./services/apiClient');
const { setupCommands } = require('./commands');
const { setupScenes } = require('./scenes');
const { setupMiddlewares } = require('./middlewares');
const { setupCallbacks } = require('./callbacks');
const { setupInlineMode } = require('./inline');
const errorHandler = require('./utils/errorHandler');

class TwinGateBot {
  constructor() {
    this.bot = null;
    this.stage = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Validate required environment variables
      this.validateConfig();

      // Create bot instance
      this.bot = new Telegraf(process.env.BOT_TOKEN);

      // Setup session and scenes
      this.stage = new Scenes.Stage();
      this.bot.use(session());
      this.bot.use(this.stage.middleware());

      // Setup middlewares
      setupMiddlewares(this.bot);

      // Setup scenes
      setupScenes(this.stage);

      // Setup commands
      setupCommands(this.bot);

      // Setup callback handlers
      setupCallbacks(this.bot);

      // Setup inline mode (if enabled)
      if (process.env.ENABLE_INLINE_MODE === 'true') {
        setupInlineMode(this.bot);
      }

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

  setupErrorHandling() {
    this.bot.catch((err, ctx) => {
      errorHandler.handleBotError(err, ctx);
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
      // Set bot commands
      await this.setBotCommands();

      // Start bot
      if (process.env.ENABLE_WEBHOOK === 'true') {
        await this.startWebhook();
      } else {
        await this.startPolling();
      }

    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async setBotCommands() {
    // 簡化的命令列表 - 只保留核心功能
    const commandsZhTW = [
      { command: 'verify', description: '🚀 開始/查看驗證狀態' },
      { command: 'sbt', description: '🏆 查看 SBT 和個人資料' },
      { command: 'help', description: '❓ 獲取幫助和支援' }
    ];

    const commandsEn = [
      { command: 'verify', description: '🚀 Start/Check verification status' },
      { command: 'sbt', description: '🏆 View SBT and profile' },
      { command: 'help', description: '❓ Get help and support' }
    ];

    // 設定預設命令（中文）
    await this.bot.telegram.setMyCommands(commandsZhTW);

    // 設定英文命令
    await this.bot.telegram.setMyCommands(commandsEn, {
      language_code: 'en'
    });

    // 設置 Bot 選單按鈕 - 移除 "Tap here to use this bot"
    try {
      await this.bot.telegram.setChatMenuButton({
        menu_button: {
          type: 'commands'
        }
      });
      logger.info('Bot menu button set to commands');
    } catch (error) {
      logger.warn('Failed to set menu button:', error.message);
    }

    logger.info('Bot commands set successfully');
  }

  async startPolling() {
    logger.info('🔄 Starting bot in polling mode...');

    // Enable graceful stop
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

    await this.bot.launch();
    logger.info('✅ Bot started successfully in polling mode');
  }

  async startWebhook() {
    const webhookUrl = process.env.WEBHOOK_URL;
    const port = process.env.PORT || 3000;

    logger.info(`🌐 Starting bot in webhook mode on port ${port}...`);

    await this.bot.telegram.setWebhook(webhookUrl, {
      secret_token: process.env.WEBHOOK_SECRET
    });

    await this.bot.launch({
      webhook: {
        domain: webhookUrl,
        port: port,
        secretToken: process.env.WEBHOOK_SECRET
      }
    });

    logger.info(`✅ Bot started successfully in webhook mode: ${webhookUrl}`);
  }

  async gracefulShutdown() {
    try {
      logger.info('Stopping bot...');

      if (this.bot) {
        await this.bot.stop();
      }

      logger.info('Bot stopped successfully');
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
