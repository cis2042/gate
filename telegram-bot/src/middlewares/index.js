const logger = require('../utils/logger');
const { getUserSession, updateUserSession } = require('../utils/session');
const { isUserAuthenticated } = require('../utils/session');

// Rate limiting middleware
const rateLimiter = new Map();

function setupMiddlewares(bot) {
  // Logging middleware
  bot.use(async (ctx, next) => {
    const start = Date.now();
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const messageType = ctx.updateType;

    logger.userAction(userId, 'bot_interaction', {
      messageType,
      chatId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name
    });

    try {
      await next();
    } finally {
      const duration = Date.now() - start;
      logger.performanceMetric('request_duration', duration, {
        userId,
        messageType,
        duration
      });
    }
  });

  // Rate limiting middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    const now = Date.now();
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000; // 1 minute
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20;

    // Get user's request history
    const userKey = `rate_limit:${userId}`;
    const requests = rateLimiter.get(userKey) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);

    // Check if user has exceeded rate limit
    if (validRequests.length >= maxRequests) {
      logger.securityEvent('rate_limit_exceeded', userId, {
        requestCount: validRequests.length,
        maxRequests,
        windowMs
      });

      await ctx.reply(
        '⏰ You\'re sending messages too quickly. Please wait a moment and try again.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: 'retry_last_action' }]
            ]
          }
        }
      );
      return;
    }

    // Add current request
    validRequests.push(now);
    rateLimiter.set(userKey, validRequests);

    return next();
  });

  // Session middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId) {
      // Get or create user session
      let session = await getUserSession(userId);
      if (!session) {
        session = await updateUserSession(userId, {
          userId,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          languageCode: ctx.from.language_code,
          createdAt: Date.now()
        });
      }

      // Attach session to context
      ctx.session = session;
      ctx.userId = userId;
    }

    return next();
  });

  // Authentication middleware (for protected commands)
  bot.use(async (ctx, next) => {
    // Skip authentication for public commands
    const publicCommands = ['/start', '/help'];
    const publicCallbacks = ['main_menu', 'show_help', 'register'];

    const isPublicCommand = publicCommands.some(cmd =>
      ctx.message?.text?.startsWith(cmd)
    );

    const isPublicCallback = publicCallbacks.some(cb =>
      ctx.callbackQuery?.data?.startsWith(cb)
    );

    if (isPublicCommand || isPublicCallback) {
      return next();
    }

    // Check if user is authenticated for protected actions
    const userId = ctx.from?.id;
    if (userId) {
      const authenticated = await isUserAuthenticated(userId);
      ctx.isAuthenticated = authenticated;
    }

    return next();
  });

  // Error handling middleware
  bot.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      logger.error('Middleware error:', {
        error: error.message,
        stack: error.stack,
        userId: ctx.from?.id,
        update: ctx.update
      });

      // Send generic error message
      try {
        await ctx.reply(
          '❌ Something went wrong. Please try again later.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🏠 Main Menu', callback_data: 'main_menu' },
                  { text: '❓ Get Help', callback_data: 'get_help' }
                ]
              ]
            }
          }
        );
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }
    }
  });

  // Admin middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(id => parseInt(id)) || [];

    ctx.isAdmin = adminIds.includes(userId);

    return next();
  });

  // Source tracking middleware (群組和來源追蹤)
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;

    if (userId && chatId) {
      // 追蹤用戶來源
      const sourceInfo = {
        chatId: chatId.toString(),
        chatType,
        chatTitle: ctx.chat?.title,
        chatUsername: ctx.chat?.username,
        timestamp: Date.now()
      };

      // 如果是群組或頻道，記錄來源
      if (chatType === 'group' || chatType === 'supergroup' || chatType === 'channel') {
        await updateUserSession(userId, {
          sourceGroup: sourceInfo,
          lastGroupInteraction: Date.now()
        });

        logger.userAction(userId, 'group_interaction', {
          ...sourceInfo,
          username: ctx.from?.username,
          firstName: ctx.from?.first_name
        });
      }

      // 設置上下文中的來源信息
      ctx.sourceInfo = sourceInfo;
      ctx.isGroupChat = ['group', 'supergroup'].includes(chatType);
      ctx.isChannelPost = chatType === 'channel';
      ctx.isPrivateChat = chatType === 'private';
    }

    return next();
  });

  // Analytics middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const messageType = ctx.updateType;

    // Track user activity
    if (userId) {
      await updateUserSession(userId, {
        lastActivity: Date.now(),
        lastMessageType: messageType
      });
    }

    // Track bot usage analytics
    if (process.env.ANALYTICS_ENABLED === 'true') {
      logger.botEvent('user_interaction', {
        userId,
        messageType,
        chatType: ctx.chat?.type,
        chatId: ctx.chat?.id,
        sourceInfo: ctx.sourceInfo,
        timestamp: Date.now()
      });
    }

    return next();
  });

  // Language middleware
  bot.use(async (ctx, next) => {
    const session = ctx.session;
    const defaultLang = process.env.DEFAULT_LANGUAGE || 'en';

    // Set user language from session or default
    ctx.userLanguage = session?.language || ctx.from?.language_code || defaultLang;

    return next();
  });

  // Security middleware
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    const messageText = ctx.message?.text;

    // Check for suspicious patterns
    if (messageText) {
      // Check for potential spam
      if (messageText.length > 1000) {
        logger.securityEvent('long_message', userId, {
          messageLength: messageText.length
        });
      }

      // Check for potential malicious content
      const suspiciousPatterns = [
        /javascript:/i,
        /<script/i,
        /eval\(/i,
        /document\./i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(messageText))) {
        logger.securityEvent('suspicious_content', userId, {
          message: messageText.substring(0, 100)
        });
      }
    }

    return next();
  });

  // Command validation middleware
  bot.use(async (ctx, next) => {
    if (ctx.message?.text?.startsWith('/')) {
      const command = ctx.message.text.split(' ')[0];
      const validCommands = [
        '/start', '/help', '/verify', '/status',
        '/profile', '/sbt', '/channels', '/settings'
      ];

      if (!validCommands.includes(command)) {
        await ctx.reply(
          `❓ Unknown command: ${command}\n\nUse /help to see available commands.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '❓ Show Help', callback_data: 'show_help' }]
              ]
            }
          }
        );
        return;
      }
    }

    return next();
  });

  logger.info('Bot middlewares setup completed');
}

// Clean up rate limiter periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000;

  for (const [key, requests] of rateLimiter.entries()) {
    const validRequests = requests.filter(time => now - time < windowMs);
    if (validRequests.length === 0) {
      rateLimiter.delete(key);
    } else {
      rateLimiter.set(key, validRequests);
    }
  }
}, 60000); // Clean every minute

module.exports = { setupMiddlewares };
