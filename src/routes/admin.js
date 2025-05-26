const express = require('express');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticateToken, adminOnly, moderatorOrAdmin } = require('../middlewares/auth');
const { catchAsync } = require('../middlewares/errorHandler');

const router = express.Router();

// All routes require authentication and admin/moderator privileges
router.use(authenticateToken);

// Dashboard and Overview
/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard data
 * @access  Private/Moderator
 */
router.get('/dashboard', moderatorOrAdmin, catchAsync(adminController.getDashboard));

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get system statistics
 * @access  Private/Moderator
 */
router.get('/stats',
  moderatorOrAdmin,
  query('timeframe').optional().isIn(['24h', '7d', '30d', '90d', '1y']).withMessage('Invalid timeframe'),
  catchAsync(adminController.getSystemStats)
);

/**
 * @route   GET /api/v1/admin/analytics
 * @desc    Get detailed analytics
 * @access  Private/Admin
 */
router.get('/analytics',
  adminOnly,
  query('metric').optional().isIn(['users', 'verifications', 'sbt', 'activity']),
  query('period').optional().isIn(['hour', 'day', 'week', 'month']),
  catchAsync(adminController.getAnalytics)
);

// User Management
/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with filters
 * @access  Private/Moderator
 */
router.get('/users',
  moderatorOrAdmin,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('role').optional().isIn(['user', 'moderator', 'admin']),
  query('status').optional().isIn(['active', 'inactive', 'banned']),
  query('verified').optional().isBoolean(),
  query('search').optional().isString(),
  catchAsync(adminController.getUsers)
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get detailed user information
 * @access  Private/Moderator
 */
router.get('/users/:id',
  moderatorOrAdmin,
  param('id').isMongoId().withMessage('Invalid user ID'),
  catchAsync(adminController.getUserDetails)
);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user information
 * @access  Private/Admin
 */
router.put('/users/:id',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role').optional().isIn(['user', 'moderator', 'admin']),
  body('isActive').optional().isBoolean(),
  body('isVerified').optional().isBoolean(),
  body('verificationStatus').optional().isIn(['pending', 'in_progress', 'completed', 'failed', 'rejected']),
  catchAsync(adminController.updateUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/ban
 * @desc    Ban user
 * @access  Private/Admin
 */
router.post('/users/:id/ban',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('reason').isString().withMessage('Ban reason is required'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer'),
  body('permanent').optional().isBoolean(),
  catchAsync(adminController.banUser)
);

/**
 * @route   POST /api/v1/admin/users/:id/unban
 * @desc    Unban user
 * @access  Private/Admin
 */
router.post('/users/:id/unban',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('reason').optional().isString(),
  catchAsync(adminController.unbanUser)
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user account
 * @access  Private/Admin
 */
router.delete('/users/:id',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('reason').isString().withMessage('Deletion reason is required'),
  body('deleteData').optional().isBoolean(),
  catchAsync(adminController.deleteUser)
);

// Verification Management
/**
 * @route   GET /api/v1/admin/verifications
 * @desc    Get all verifications with filters
 * @access  Private/Moderator
 */
router.get('/verifications',
  moderatorOrAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'failed', 'rejected']),
  query('channel').optional().isIn(['twitter', 'discord', 'telegram', 'github', 'email', 'phone', 'kyc']),
  query('userId').optional().isMongoId(),
  catchAsync(adminController.getVerifications)
);

/**
 * @route   GET /api/v1/admin/verifications/:id
 * @desc    Get verification details
 * @access  Private/Moderator
 */
router.get('/verifications/:id',
  moderatorOrAdmin,
  param('id').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(adminController.getVerificationDetails)
);

/**
 * @route   POST /api/v1/admin/verifications/:id/review
 * @desc    Review verification (approve/reject)
 * @access  Private/Moderator
 */
router.post('/verifications/:id/review',
  moderatorOrAdmin,
  param('id').isMongoId().withMessage('Invalid verification ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('score').optional().isInt({ min: 0, max: 100 }),
  body('notes').optional().isString(),
  body('reason').optional().isString(),
  catchAsync(adminController.reviewVerification)
);

/**
 * @route   POST /api/v1/admin/verifications/bulk-review
 * @desc    Bulk review verifications
 * @access  Private/Admin
 */
router.post('/verifications/bulk-review',
  adminOnly,
  body('verificationIds').isArray({ min: 1 }).withMessage('Verification IDs array required'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('reason').optional().isString(),
  catchAsync(adminController.bulkReviewVerifications)
);

// SBT Management
/**
 * @route   GET /api/v1/admin/sbt
 * @desc    Get all SBTs with filters
 * @access  Private/Moderator
 */
router.get('/sbt',
  moderatorOrAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'minted', 'transferred', 'burned', 'revoked']),
  query('userId').optional().isMongoId(),
  query('walletAddress').optional().matches(/^0x[a-fA-F0-9]{40}$/),
  catchAsync(adminController.getSBTs)
);

/**
 * @route   POST /api/v1/admin/sbt/mint
 * @desc    Admin mint SBT
 * @access  Private/Admin
 */
router.post('/sbt/mint',
  adminOnly,
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid wallet address'),
  body('verificationLevel').optional().isIn(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  body('customMetadata').optional().isObject(),
  catchAsync(adminController.mintSBT)
);

/**
 * @route   POST /api/v1/admin/sbt/:tokenId/revoke
 * @desc    Revoke SBT
 * @access  Private/Admin
 */
router.post('/sbt/:tokenId/revoke',
  adminOnly,
  param('tokenId').isString().withMessage('Invalid token ID'),
  body('reason').isString().withMessage('Revocation reason required'),
  body('revokeOnChain').optional().isBoolean(),
  catchAsync(adminController.revokeSBT)
);

// System Management
/**
 * @route   GET /api/v1/admin/system/health
 * @desc    Get system health status
 * @access  Private/Admin
 */
router.get('/system/health', adminOnly, catchAsync(adminController.getSystemHealth));

/**
 * @route   GET /api/v1/admin/system/logs
 * @desc    Get system logs
 * @access  Private/Admin
 */
router.get('/system/logs',
  adminOnly,
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('since').optional().isISO8601(),
  catchAsync(adminController.getSystemLogs)
);

/**
 * @route   POST /api/v1/admin/system/maintenance
 * @desc    Toggle maintenance mode
 * @access  Private/Admin
 */
router.post('/system/maintenance',
  adminOnly,
  body('enabled').isBoolean().withMessage('Enabled status required'),
  body('message').optional().isString(),
  body('estimatedDuration').optional().isInt({ min: 1 }),
  catchAsync(adminController.toggleMaintenance)
);

/**
 * @route   POST /api/v1/admin/system/backup
 * @desc    Create system backup
 * @access  Private/Admin
 */
router.post('/system/backup',
  adminOnly,
  body('includeUserData').optional().isBoolean(),
  body('includeVerifications').optional().isBoolean(),
  body('includeSBTs').optional().isBoolean(),
  catchAsync(adminController.createBackup)
);

// Configuration Management
/**
 * @route   GET /api/v1/admin/config
 * @desc    Get system configuration
 * @access  Private/Admin
 */
router.get('/config', adminOnly, catchAsync(adminController.getConfiguration));

/**
 * @route   PUT /api/v1/admin/config
 * @desc    Update system configuration
 * @access  Private/Admin
 */
router.put('/config',
  adminOnly,
  body('verificationChannels').optional().isObject(),
  body('sbtSettings').optional().isObject(),
  body('securitySettings').optional().isObject(),
  catchAsync(adminController.updateConfiguration)
);

// Audit and Monitoring
/**
 * @route   GET /api/v1/admin/audit/logs
 * @desc    Get audit logs
 * @access  Private/Admin
 */
router.get('/audit/logs',
  adminOnly,
  query('action').optional().isString(),
  query('userId').optional().isMongoId(),
  query('since').optional().isISO8601(),
  query('until').optional().isISO8601(),
  catchAsync(adminController.getAuditLogs)
);

/**
 * @route   GET /api/v1/admin/security/events
 * @desc    Get security events
 * @access  Private/Admin
 */
router.get('/security/events',
  adminOnly,
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('type').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  catchAsync(adminController.getSecurityEvents)
);

/**
 * @route   GET /api/v1/admin/reports/generate
 * @desc    Generate system report
 * @access  Private/Admin
 */
router.get('/reports/generate',
  adminOnly,
  query('type').isIn(['users', 'verifications', 'sbt', 'security', 'performance']),
  query('format').optional().isIn(['json', 'csv', 'pdf']),
  query('timeframe').optional().isIn(['24h', '7d', '30d', '90d']),
  catchAsync(adminController.generateReport)
);

module.exports = router;
