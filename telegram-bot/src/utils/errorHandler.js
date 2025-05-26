const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.lastErrors = new Map();
  }

  // Handle bot errors
  async handleBotError(error, ctx) {
    try {
      const userId = ctx?.from?.id;
      const chatId = ctx?.chat?.id;
      const messageText = ctx?.message?.text;
      const callbackData = ctx?.callbackQuery?.data;

      // Log the error
      logger.error('Bot Error:', {
        error: error.message,
        stack: error.stack,
        userId,
        chatId,
        messageText,
        callbackData,
        timestamp: new Date().toISOString()
      });

      // Track error frequency
      this.trackError(error, userId);

      // Send user-friendly error message
      await this.sendErrorMessage(ctx, error);

      // Handle specific error types
      await this.handleSpecificErrors(error, ctx);

    } catch (handlingError) {
      logger.error('Error in error handler:', handlingError);
    }
  }

  // Track error frequency for monitoring
  trackError(error, userId) {
    try {
      const errorKey = `${error.name}:${error.message}`;
      const userKey = userId ? `user:${userId}` : 'unknown';

      // Track global error count
      const globalCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, globalCount + 1);

      // Track user-specific error count
      const userCount = this.errorCounts.get(`${userKey}:${errorKey}`) || 0;
      this.errorCounts.set(`${userKey}:${errorKey}`, userCount + 1);

      // Store last error for user
      this.lastErrors.set(userKey, {
        error: errorKey,
        timestamp: Date.now(),
        count: userCount + 1
      });

      // Alert if error frequency is high
      if (globalCount > 10) {
        logger.warn(`High error frequency detected: ${errorKey}`, {
          count: globalCount,
          error: error.message
        });
      }

      if (userCount > 5) {
        logger.warn(`User experiencing repeated errors: ${userId}`, {
          userId,
          error: errorKey,
          count: userCount
        });
      }

    } catch (trackingError) {
      logger.error('Error tracking failed:', trackingError);
    }
  }

  // Send appropriate error message to user
  async sendErrorMessage(ctx, error) {
    try {
      if (!ctx || !ctx.reply) {
        return;
      }

      let message = '❌ Something went wrong. Please try again.';
      let showRetry = true;

      // Customize message based on error type
      if (error.message.includes('network') || error.message.includes('timeout')) {
        message = '🌐 Network error. Please check your connection and try again.';
      } else if (error.message.includes('authentication') || error.message.includes('token')) {
        message = '🔐 Authentication error. Please use /start to log in again.';
        showRetry = false;
      } else if (error.message.includes('rate limit')) {
        message = '⏰ Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        message = '📝 Invalid input. Please check your data and try again.';
      } else if (error.message.includes('not found')) {
        message = '🔍 Resource not found. Please try a different action.';
        showRetry = false;
      }

      // Add retry button if appropriate
      const keyboard = showRetry ? {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Try Again', callback_data: 'retry_last_action' },
              { text: '🏠 Main Menu', callback_data: 'main_menu' }
            ],
            [
              { text: '❓ Get Help', callback_data: 'get_help' }
            ]
          ]
        }
      } : {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🏠 Main Menu', callback_data: 'main_menu' },
              { text: '❓ Get Help', callback_data: 'get_help' }
            ]
          ]
        }
      };

      await ctx.reply(message, keyboard);

    } catch (replyError) {
      logger.error('Failed to send error message:', replyError);
    }
  }

  // Handle specific error types
  async handleSpecificErrors(error, ctx) {
    try {
      const userId = ctx?.from?.id;

      // Handle API errors
      if (error.message.includes('API')) {
        logger.securityEvent('api_error', userId, {
          error: error.message,
          endpoint: error.config?.url
        });
      }

      // Handle authentication errors
      if (error.message.includes('authentication') || error.message.includes('401')) {
        logger.securityEvent('auth_error', userId, {
          error: error.message
        });

        // Clear user session on auth errors
        if (userId) {
          const { deleteUserSession } = require('./session');
          await deleteUserSession(userId);
        }
      }

      // Handle rate limiting
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        logger.securityEvent('rate_limit_hit', userId, {
          error: error.message
        });
      }

      // Handle validation errors
      if (error.message.includes('validation')) {
        logger.userAction(userId, 'validation_error', {
          error: error.message,
          input: ctx?.message?.text
        });
      }

    } catch (handlingError) {
      logger.error('Error in specific error handling:', handlingError);
    }
  }

  // Handle unhandled promise rejections
  handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });

    // Don't exit process, just log
    // In production, you might want to implement alerting here
  }

  // Handle uncaught exceptions
  handleUncaughtException(error) {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack
    });

    // Graceful shutdown
    process.exit(1);
  }

  // Get error statistics
  getErrorStats() {
    try {
      const stats = {
        totalErrors: 0,
        errorTypes: {},
        topErrors: [],
        recentErrors: []
      };

      // Calculate total errors and group by type
      for (const [key, count] of this.errorCounts.entries()) {
        if (!key.includes('user:')) {
          stats.totalErrors += count;
          
          const [errorType] = key.split(':');
          stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + count;
        }
      }

      // Get top errors
      const sortedErrors = Array.from(this.errorCounts.entries())
        .filter(([key]) => !key.includes('user:'))
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      stats.topErrors = sortedErrors.map(([error, count]) => ({
        error,
        count
      }));

      // Get recent errors
      const recentErrors = Array.from(this.lastErrors.entries())
        .filter(([key]) => key.startsWith('user:'))
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, 20);

      stats.recentErrors = recentErrors.map(([userKey, data]) => ({
        userId: userKey.replace('user:', ''),
        error: data.error,
        timestamp: data.timestamp,
        count: data.count
      }));

      return stats;
    } catch (error) {
      logger.error('Error getting error stats:', error);
      return null;
    }
  }

  // Clear old error data
  clearOldErrors(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const now = Date.now();
      let clearedCount = 0;

      for (const [key, data] of this.lastErrors.entries()) {
        if (now - data.timestamp > maxAge) {
          this.lastErrors.delete(key);
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        logger.info(`Cleared ${clearedCount} old error records`);
      }
    } catch (error) {
      logger.error('Error clearing old errors:', error);
    }
  }

  // Reset error counts
  resetErrorCounts() {
    try {
      this.errorCounts.clear();
      this.lastErrors.clear();
      logger.info('Error counts reset');
    } catch (error) {
      logger.error('Error resetting error counts:', error);
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Set up global error handlers
process.on('unhandledRejection', (reason, promise) => {
  errorHandler.handleUnhandledRejection(reason, promise);
});

process.on('uncaughtException', (error) => {
  errorHandler.handleUncaughtException(error);
});

// Clean up old errors every hour
setInterval(() => {
  errorHandler.clearOldErrors();
}, 60 * 60 * 1000);

module.exports = errorHandler;
