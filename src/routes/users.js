const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateToken, adminOnly, checkOwnership } = require('../middlewares/auth');
const { catchAsync } = require('../middlewares/errorHandler');
const User = require('../models/User');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const updateProfileValidation = [
  body('profile.firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('profile.lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('profile.bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('profile.dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('profile.location.country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Country name too long'),
  body('profile.location.city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('City name too long')
];

const updatePreferencesValidation = [
  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be boolean'),
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be boolean'),
  body('preferences.privacy.profilePublic')
    .optional()
    .isBoolean()
    .withMessage('Profile public preference must be boolean'),
  body('preferences.language')
    .optional()
    .isIn(['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'])
    .withMessage('Invalid language code'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme option')
];

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', catchAsync(userController.getProfile));

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', updateProfileValidation, catchAsync(userController.updateProfile));

/**
 * @route   DELETE /api/v1/users/profile
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/profile', catchAsync(userController.deleteAccount));

/**
 * @route   GET /api/v1/users/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', catchAsync(userController.getPreferences));

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', updatePreferencesValidation, catchAsync(userController.updatePreferences));

/**
 * @route   GET /api/v1/users/verification-status
 * @desc    Get user verification status
 * @access  Private
 */
router.get('/verification-status', catchAsync(userController.getVerificationStatus));

/**
 * @route   GET /api/v1/users/sbt
 * @desc    Get user's SBT information
 * @access  Private
 */
router.get('/sbt', catchAsync(userController.getSBTInfo));

/**
 * @route   GET /api/v1/users/activity
 * @desc    Get user activity history
 * @access  Private
 */
router.get('/activity', catchAsync(userController.getActivity));

/**
 * @route   POST /api/v1/users/upload-avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/upload-avatar', catchAsync(userController.uploadAvatar));

/**
 * @route   DELETE /api/v1/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', catchAsync(userController.deleteAvatar));

// Public profile routes (with optional authentication)
/**
 * @route   GET /api/v1/users/:username/public
 * @desc    Get public user profile
 * @access  Public
 */
router.get('/:username/public',
  param('username').isAlphanumeric().withMessage('Invalid username format'),
  catchAsync(userController.getPublicProfile)
);

/**
 * @route   GET /api/v1/users/:username/sbt
 * @desc    Get user's public SBT information
 * @access  Public
 */
router.get('/:username/sbt',
  param('username').isAlphanumeric().withMessage('Invalid username format'),
  catchAsync(userController.getPublicSBT)
);

// Admin routes
/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', adminOnly, catchAsync(userController.getAllUsers));

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private/Admin
 */
router.get('/:id',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  catchAsync(userController.getUserById)
);

/**
 * @route   PUT /api/v1/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.put('/:id/role',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role').isIn(['user', 'moderator', 'admin']).withMessage('Invalid role'),
  catchAsync(userController.updateUserRole)
);

/**
 * @route   PUT /api/v1/users/:id/status
 * @desc    Update user status (admin only)
 * @access  Private/Admin
 */
router.put('/:id/status',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('isActive').isBoolean().withMessage('Status must be boolean'),
  body('reason').optional().isString().withMessage('Reason must be string'),
  catchAsync(userController.updateUserStatus)
);

/**
 * @route   POST /api/v1/users/:id/verify
 * @desc    Manually verify user (admin only)
 * @access  Private/Admin
 */
router.post('/:id/verify',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('verificationLevel').optional().isIn(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  body('reason').optional().isString(),
  catchAsync(userController.manualVerifyUser)
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user account (admin only)
 * @access  Private/Admin
 */
router.delete('/:id',
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('reason').isString().withMessage('Deletion reason is required'),
  catchAsync(userController.deleteUser)
);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users (admin only)
 * @access  Private/Admin
 */
router.get('/search',
  adminOnly,
  catchAsync(userController.searchUsers)
);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics (admin only)
 * @access  Private/Admin
 */
router.get('/stats',
  adminOnly,
  catchAsync(userController.getUserStats)
);

module.exports = router;
