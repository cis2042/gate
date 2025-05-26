const express = require('express');
const { body, param, query } = require('express-validator');
const verificationController = require('../controllers/verificationController');
const { authenticateToken, moderatorOrAdmin, verifiedOnly } = require('../middlewares/auth');
const { catchAsync } = require('../middlewares/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const startVerificationValidation = [
  body('channel')
    .isIn(['twitter', 'discord', 'telegram', 'github', 'email', 'phone', 'kyc'])
    .withMessage('Invalid verification channel'),
  body('challengeType')
    .isIn(['post', 'follow', 'join', 'message', 'code', 'document', 'biometric'])
    .withMessage('Invalid challenge type'),
  body('identifier')
    .optional()
    .isString()
    .withMessage('Identifier must be a string')
];

const submitVerificationValidation = [
  body('verificationId')
    .isMongoId()
    .withMessage('Invalid verification ID'),
  body('proofData')
    .isObject()
    .withMessage('Proof data must be an object')
];

const verifyCodeValidation = [
  body('code')
    .isLength({ min: 4, max: 8 })
    .withMessage('Verification code must be 4-8 characters'),
  body('channel')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Invalid channel for code verification')
];

/**
 * @route   GET /api/v1/verification/channels
 * @desc    Get available verification channels
 * @access  Private
 */
router.get('/channels', catchAsync(verificationController.getAvailableChannels));

/**
 * @route   POST /api/v1/verification/start
 * @desc    Start a new verification process
 * @access  Private
 */
router.post('/start', startVerificationValidation, catchAsync(verificationController.startVerification));

/**
 * @route   POST /api/v1/verification/submit
 * @desc    Submit verification proof
 * @access  Private
 */
router.post('/submit', submitVerificationValidation, catchAsync(verificationController.submitVerification));

/**
 * @route   POST /api/v1/verification/verify-code
 * @desc    Verify code-based verification
 * @access  Private
 */
router.post('/verify-code', verifyCodeValidation, catchAsync(verificationController.verifyCode));

/**
 * @route   GET /api/v1/verification/status
 * @desc    Get user's verification status
 * @access  Private
 */
router.get('/status', catchAsync(verificationController.getVerificationStatus));

/**
 * @route   GET /api/v1/verification/history
 * @desc    Get user's verification history
 * @access  Private
 */
router.get('/history', catchAsync(verificationController.getVerificationHistory));

/**
 * @route   GET /api/v1/verification/:id
 * @desc    Get specific verification details
 * @access  Private
 */
router.get('/:id',
  param('id').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(verificationController.getVerificationDetails)
);

/**
 * @route   POST /api/v1/verification/:id/retry
 * @desc    Retry failed verification
 * @access  Private
 */
router.post('/:id/retry',
  param('id').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(verificationController.retryVerification)
);

/**
 * @route   DELETE /api/v1/verification/:id
 * @desc    Cancel pending verification
 * @access  Private
 */
router.delete('/:id',
  param('id').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(verificationController.cancelVerification)
);

// Social media specific routes
/**
 * @route   POST /api/v1/verification/twitter/start
 * @desc    Start Twitter verification
 * @access  Private
 */
router.post('/twitter/start', catchAsync(verificationController.startTwitterVerification));

/**
 * @route   POST /api/v1/verification/twitter/verify
 * @desc    Verify Twitter post
 * @access  Private
 */
router.post('/twitter/verify',
  body('tweetUrl').isURL().withMessage('Invalid tweet URL'),
  body('verificationId').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(verificationController.verifyTwitterPost)
);

/**
 * @route   POST /api/v1/verification/discord/start
 * @desc    Start Discord verification
 * @access  Private
 */
router.post('/discord/start', catchAsync(verificationController.startDiscordVerification));

/**
 * @route   POST /api/v1/verification/discord/verify
 * @desc    Verify Discord membership
 * @access  Private
 */
router.post('/discord/verify',
  body('discordId').isString().withMessage('Discord ID is required'),
  body('verificationId').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(verificationController.verifyDiscordMembership)
);

/**
 * @route   POST /api/v1/verification/telegram/start
 * @desc    Start Telegram verification
 * @access  Private
 */
router.post('/telegram/start', catchAsync(verificationController.startTelegramVerification));

/**
 * @route   POST /api/v1/verification/telegram/verify
 * @desc    Verify Telegram membership
 * @access  Private
 */
router.post('/telegram/verify',
  body('telegramUsername').isString().withMessage('Telegram username is required'),
  body('verificationId').isMongoId().withMessage('Invalid verification ID'),
  catchAsync(verificationController.verifyTelegramMembership)
);

/**
 * @route   POST /api/v1/verification/github/start
 * @desc    Start GitHub verification
 * @access  Private
 */
router.post('/github/start', catchAsync(verificationController.startGitHubVerification));

/**
 * @route   GET /api/v1/verification/github/callback
 * @desc    GitHub OAuth callback
 * @access  Private
 */
router.get('/github/callback',
  query('code').isString().withMessage('Authorization code is required'),
  query('state').isString().withMessage('State parameter is required'),
  catchAsync(verificationController.handleGitHubCallback)
);

// Email and phone verification
/**
 * @route   POST /api/v1/verification/email/send
 * @desc    Send email verification code
 * @access  Private
 */
router.post('/email/send',
  body('email').isEmail().withMessage('Valid email is required'),
  catchAsync(verificationController.sendEmailVerification)
);

/**
 * @route   POST /api/v1/verification/phone/send
 * @desc    Send phone verification code
 * @access  Private
 */
router.post('/phone/send',
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  catchAsync(verificationController.sendPhoneVerification)
);

// KYC verification routes
/**
 * @route   POST /api/v1/verification/kyc/start
 * @desc    Start KYC verification process
 * @access  Private
 */
router.post('/kyc/start', catchAsync(verificationController.startKYCVerification));

/**
 * @route   POST /api/v1/verification/kyc/upload
 * @desc    Upload KYC documents
 * @access  Private
 */
router.post('/kyc/upload',
  body('verificationId').isMongoId().withMessage('Invalid verification ID'),
  body('documentType').isIn(['passport', 'drivers_license', 'national_id', 'utility_bill']),
  catchAsync(verificationController.uploadKYCDocument)
);

// Admin/Moderator routes
/**
 * @route   GET /api/v1/verification/admin/pending
 * @desc    Get pending verifications for review
 * @access  Private/Moderator
 */
router.get('/admin/pending',
  moderatorOrAdmin,
  catchAsync(verificationController.getPendingVerifications)
);

/**
 * @route   POST /api/v1/verification/admin/:id/approve
 * @desc    Approve verification
 * @access  Private/Moderator
 */
router.post('/admin/:id/approve',
  moderatorOrAdmin,
  param('id').isMongoId().withMessage('Invalid verification ID'),
  body('score').optional().isInt({ min: 0, max: 100 }).withMessage('Score must be 0-100'),
  body('notes').optional().isString().withMessage('Notes must be string'),
  catchAsync(verificationController.approveVerification)
);

/**
 * @route   POST /api/v1/verification/admin/:id/reject
 * @desc    Reject verification
 * @access  Private/Moderator
 */
router.post('/admin/:id/reject',
  moderatorOrAdmin,
  param('id').isMongoId().withMessage('Invalid verification ID'),
  body('reason').isString().withMessage('Rejection reason is required'),
  body('notes').optional().isString().withMessage('Notes must be string'),
  catchAsync(verificationController.rejectVerification)
);

/**
 * @route   GET /api/v1/verification/admin/stats
 * @desc    Get verification statistics
 * @access  Private/Moderator
 */
router.get('/admin/stats',
  moderatorOrAdmin,
  catchAsync(verificationController.getVerificationStats)
);

module.exports = router;
