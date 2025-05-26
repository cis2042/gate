const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const { catchAsync } = require('../middlewares/errorHandler');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Public routes
/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, catchAsync(authController.register));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, catchAsync(authController.login));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', catchAsync(authController.refreshToken));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', forgotPasswordValidation, catchAsync(authController.forgotPassword));

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, catchAsync(authController.resetPassword));

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', catchAsync(authController.verifyEmail));

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification', 
  body('email').isEmail().normalizeEmail(),
  catchAsync(authController.resendVerification)
);

// Protected routes (require authentication)
/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.post('/logout', authenticateToken, catchAsync(authController.logout));

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticateToken, catchAsync(authController.logoutAll));

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', 
  authenticateToken, 
  changePasswordValidation, 
  catchAsync(authController.changePassword)
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, catchAsync(authController.getCurrentUser));

/**
 * @route   POST /api/v1/auth/connect-wallet
 * @desc    Connect wallet address to user account
 * @access  Private
 */
router.post('/connect-wallet',
  authenticateToken,
  body('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('signature')
    .notEmpty()
    .withMessage('Signature is required'),
  catchAsync(authController.connectWallet)
);

/**
 * @route   POST /api/v1/auth/disconnect-wallet
 * @desc    Disconnect wallet from user account
 * @access  Private
 */
router.post('/disconnect-wallet', authenticateToken, catchAsync(authController.disconnectWallet));

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions', authenticateToken, catchAsync(authController.getActiveSessions));

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', authenticateToken, catchAsync(authController.revokeSession));

// Two-factor authentication routes
/**
 * @route   POST /api/v1/auth/2fa/setup
 * @desc    Setup two-factor authentication
 * @access  Private
 */
router.post('/2fa/setup', authenticateToken, catchAsync(authController.setup2FA));

/**
 * @route   POST /api/v1/auth/2fa/verify
 * @desc    Verify and enable two-factor authentication
 * @access  Private
 */
router.post('/2fa/verify',
  authenticateToken,
  body('token').isLength({ min: 6, max: 6 }).withMessage('2FA token must be 6 digits'),
  catchAsync(authController.verify2FA)
);

/**
 * @route   POST /api/v1/auth/2fa/disable
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post('/2fa/disable',
  authenticateToken,
  body('token').isLength({ min: 6, max: 6 }).withMessage('2FA token must be 6 digits'),
  catchAsync(authController.disable2FA)
);

module.exports = router;
