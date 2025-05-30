const { Telegraf, Scenes, session } = require('telegraf');
const { message } = require('telegraf/filters');
const express = require('express');
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
    this.app = null;
    this.server = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Validate required environment variables
      this.validateConfig();

      // Setup Express server for health checks
      this.setupExpressServer();

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

  setupExpressServer() {
    this.app = express();
    const port = process.env.PORT || 3000;

    // Middleware
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json(this.getHealthStatus());
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Twin Gate Bot is running',
        service: 'twin-gate-bot',
        version: require('../package.json').version || '1.0.0',
        status: 'active'
      });
    });

    // Webhook endpoint for Telegram
    this.app.post('/webhook', (req, res) => {
      if (this.bot) {
        this.bot.handleUpdate(req.body);
      }
      res.status(200).send('OK');
    });

    // Start server
    this.server = this.app.listen(port, '0.0.0.0', () => {
      logger.info(`🌐 HTTP server listening on port ${port}`);
    });
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
      // Get bot info first
      const botInfo = await this.bot.telegram.getMe();
      this.bot.botInfo = botInfo;
      logger.info(`🤖 Bot info loaded: @${botInfo.username} (ID: ${botInfo.id})`);

      // Set bot commands
      await this.setBotCommands();

      // Start bot in webhook mode for Cloud Run
      await this.startWebhookMode();

    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async setBotCommands() {
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
    await this.bot.telegram.setMyCommands(commandsEn);

    // 設定中文命令
    await this.bot.telegram.setMyCommands(commandsZhTW, {
      language_code: 'zh'
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

  async startWebhookMode() {
    // For Cloud Run, we don't use Telegraf's built-in webhook
    // Instead, we handle updates manually through our Express endpoint
    logger.info('🌐 Starting bot in webhook mode for Cloud Run...');

    // Just initialize the bot without launching
    // The webhook endpoint will handle updates
    logger.info('✅ Bot initialized successfully for webhook mode');
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
      logger.info('Stopping bot and server...');

      // Stop HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP server stopped');
      }

      // Stop bot
      if (this.bot) {
        await this.bot.stop();
        logger.info('Bot stopped');
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
