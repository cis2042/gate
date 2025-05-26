const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { database } = require('./config/postgresql');
const { initializeFirebase } = require('./config/firebase');
const { errorHandler } = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const verificationRoutes = require('./routes/verification');
const sbtRoutes = require('./routes/sbt');
const adminRoutes = require('./routes/admin');

const app = express();

// Initialize databases
const initializeDatabases = async () => {
  try {
    // Test PostgreSQL connection
    const isPostgresConnected = await database.checkConnection();
    if (isPostgresConnected) {
      logger.info('🐘 PostgreSQL connected successfully');
    } else {
      logger.warn('⚠️ PostgreSQL connection failed, running in limited mode');
    }

    // Initialize Firebase (optional)
    if (process.env.FIREBASE_PROJECT_ID) {
      try {
        initializeFirebase();
        logger.info('🔥 Firebase initialized successfully');
      } catch (error) {
        logger.warn('⚠️ Firebase initialization failed:', error.message);
      }
    } else {
      logger.info('📦 Running without Firebase (demo mode)');
    }
  } catch (error) {
    logger.error('❌ Database initialization error:', error);
  }
};

// Initialize databases
initializeDatabases();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/verification`, verificationRoutes);
app.use(`/api/${apiVersion}/sbt`, sbtRoutes);
app.use(`/api/${apiVersion}/admin`, adminRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Twin Gate API',
    version: apiVersion,
    documentation: `/api/${apiVersion}/docs`,
    health: '/health'
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Twin Gate server running on port ${PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api/${apiVersion}/docs`);
    logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
