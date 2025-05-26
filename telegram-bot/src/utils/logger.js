const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'twin-gate-telegram-bot' },
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Custom logging methods for bot-specific events
logger.botEvent = (event, data = {}) => {
  logger.info(`Bot Event: ${event}`, {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.userAction = (userId, action, data = {}) => {
  logger.info(`User Action: ${action}`, {
    userId,
    action,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.apiCall = (method, url, status, duration, data = {}) => {
  logger.info(`API Call: ${method} ${url}`, {
    method,
    url,
    status,
    duration,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.verificationEvent = (userId, channel, status, data = {}) => {
  logger.info(`Verification Event: ${channel} - ${status}`, {
    userId,
    channel,
    status,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.securityEvent = (event, userId, data = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    userId,
    ...data,
    timestamp: new Date().toISOString()
  });
};

logger.performanceMetric = (metric, value, data = {}) => {
  logger.info(`Performance Metric: ${metric}`, {
    metric,
    value,
    ...data,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
