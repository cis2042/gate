const express = require('express');
const { body, param, query } = require('express-validator');
const sbtController = require('../controllers/sbtController');
const { authenticateToken, adminOnly, verifiedOnly, sbtHolderOnly } = require('../middlewares/auth');
const { catchAsync } = require('../middlewares/errorHandler');

const router = express.Router();

// Public routes (no authentication required)
/**
 * @route   GET /api/v1/sbt/metadata/:tokenId
 * @desc    Get SBT metadata (public)
 * @access  Public
 */
router.get('/metadata/:tokenId',
  param('tokenId').isString().withMessage('Invalid token ID'),
  catchAsync(sbtController.getTokenMetadata)
);

/**
 * @route   GET /api/v1/sbt/contract-info
 * @desc    Get contract information
 * @access  Public
 */
router.get('/contract-info', catchAsync(sbtController.getContractInfo));

/**
 * @route   GET /api/v1/sbt/stats
 * @desc    Get public SBT statistics
 * @access  Public
 */
router.get('/stats', catchAsync(sbtController.getPublicStats));

// Protected routes (require authentication)
router.use(authenticateToken);

/**
 * @route   POST /api/v1/sbt/mint
 * @desc    Mint SBT for verified user
 * @access  Private/Verified
 */
router.post('/mint',
  verifiedOnly,
  body('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  catchAsync(sbtController.mintSBT)
);

/**
 * @route   GET /api/v1/sbt/user/:userId
 * @desc    Get user's SBT tokens
 * @access  Private
 */
router.get('/user/:userId',
  param('userId').isMongoId().withMessage('Invalid user ID'),
  catchAsync(sbtController.getUserSBTs)
);

/**
 * @route   GET /api/v1/sbt/my-tokens
 * @desc    Get current user's SBT tokens
 * @access  Private
 */
router.get('/my-tokens', catchAsync(sbtController.getMyTokens));

/**
 * @route   GET /api/v1/sbt/:tokenId
 * @desc    Get SBT details
 * @access  Private
 */
router.get('/:tokenId',
  param('tokenId').isString().withMessage('Invalid token ID'),
  catchAsync(sbtController.getSBTDetails)
);

/**
 * @route   PUT /api/v1/sbt/:tokenId/metadata
 * @desc    Update SBT metadata (owner only)
 * @access  Private
 */
router.put('/:tokenId/metadata',
  param('tokenId').isString().withMessage('Invalid token ID'),
  body('metadata').isObject().withMessage('Metadata must be an object'),
  catchAsync(sbtController.updateMetadata)
);

/**
 * @route   POST /api/v1/sbt/:tokenId/transfer
 * @desc    Transfer SBT to new wallet (owner only)
 * @access  Private
 */
router.post('/:tokenId/transfer',
  param('tokenId').isString().withMessage('Invalid token ID'),
  body('newWalletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('signature')
    .isString()
    .withMessage('Signature is required'),
  catchAsync(sbtController.transferSBT)
);

/**
 * @route   POST /api/v1/sbt/:tokenId/view
 * @desc    Record SBT view (for analytics)
 * @access  Private
 */
router.post('/:tokenId/view',
  param('tokenId').isString().withMessage('Invalid token ID'),
  catchAsync(sbtController.recordView)
);

/**
 * @route   GET /api/v1/sbt/:tokenId/verification-proof
 * @desc    Get verification proof for SBT
 * @access  Private
 */
router.get('/:tokenId/verification-proof',
  param('tokenId').isString().withMessage('Invalid token ID'),
  catchAsync(sbtController.getVerificationProof)
);

/**
 * @route   POST /api/v1/sbt/verify-ownership
 * @desc    Verify SBT ownership
 * @access  Private
 */
router.post('/verify-ownership',
  body('tokenId').isString().withMessage('Token ID is required'),
  body('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('signature').isString().withMessage('Signature is required'),
  catchAsync(sbtController.verifyOwnership)
);

/**
 * @route   GET /api/v1/sbt/wallet/:walletAddress
 * @desc    Get SBTs by wallet address
 * @access  Private
 */
router.get('/wallet/:walletAddress',
  param('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  catchAsync(sbtController.getSBTsByWallet)
);

// SBT holder exclusive routes
/**
 * @route   GET /api/v1/sbt/holder/benefits
 * @desc    Get SBT holder benefits
 * @access  Private/SBT Holder
 */
router.get('/holder/benefits', sbtHolderOnly, catchAsync(sbtController.getHolderBenefits));

/**
 * @route   POST /api/v1/sbt/holder/claim-reward
 * @desc    Claim SBT holder reward
 * @access  Private/SBT Holder
 */
router.post('/holder/claim-reward',
  sbtHolderOnly,
  body('rewardType').isString().withMessage('Reward type is required'),
  catchAsync(sbtController.claimReward)
);

// Admin routes
/**
 * @route   GET /api/v1/sbt/admin/all
 * @desc    Get all SBTs (admin only)
 * @access  Private/Admin
 */
router.get('/admin/all',
  adminOnly,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['pending', 'minted', 'transferred', 'burned', 'revoked']),
  catchAsync(sbtController.getAllSBTs)
);

/**
 * @route   POST /api/v1/sbt/admin/mint
 * @desc    Admin mint SBT
 * @access  Private/Admin
 */
router.post('/admin/mint',
  adminOnly,
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum address format'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('verificationLevel')
    .optional()
    .isIn(['bronze', 'silver', 'gold', 'platinum', 'diamond'])
    .withMessage('Invalid verification level'),
  catchAsync(sbtController.adminMintSBT)
);

/**
 * @route   POST /api/v1/sbt/admin/:tokenId/revoke
 * @desc    Revoke SBT (admin only)
 * @access  Private/Admin
 */
router.post('/admin/:tokenId/revoke',
  adminOnly,
  param('tokenId').isString().withMessage('Invalid token ID'),
  body('reason').isString().withMessage('Revocation reason is required'),
  body('revokeOnChain').optional().isBoolean().withMessage('Revoke on chain must be boolean'),
  catchAsync(sbtController.revokeSBT)
);

/**
 * @route   PUT /api/v1/sbt/admin/:tokenId/status
 * @desc    Update SBT status (admin only)
 * @access  Private/Admin
 */
router.put('/admin/:tokenId/status',
  adminOnly,
  param('tokenId').isString().withMessage('Invalid token ID'),
  body('status')
    .isIn(['pending', 'minted', 'transferred', 'burned', 'revoked'])
    .withMessage('Invalid status'),
  body('reason').optional().isString().withMessage('Reason must be string'),
  catchAsync(sbtController.updateSBTStatus)
);

/**
 * @route   GET /api/v1/sbt/admin/stats/detailed
 * @desc    Get detailed SBT statistics (admin only)
 * @access  Private/Admin
 */
router.get('/admin/stats/detailed',
  adminOnly,
  query('timeframe').optional().isInt({ min: 1 }).withMessage('Timeframe must be positive integer'),
  catchAsync(sbtController.getDetailedStats)
);

/**
 * @route   POST /api/v1/sbt/admin/batch-mint
 * @desc    Batch mint SBTs (admin only)
 * @access  Private/Admin
 */
router.post('/admin/batch-mint',
  adminOnly,
  body('recipients').isArray({ min: 1 }).withMessage('Recipients array is required'),
  body('recipients.*.userId').isMongoId().withMessage('Invalid user ID in recipients'),
  body('recipients.*.walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address in recipients'),
  catchAsync(sbtController.batchMintSBTs)
);

/**
 * @route   POST /api/v1/sbt/admin/sync-blockchain
 * @desc    Sync SBT data with blockchain (admin only)
 * @access  Private/Admin
 */
router.post('/admin/sync-blockchain',
  adminOnly,
  body('tokenIds').optional().isArray().withMessage('Token IDs must be array'),
  body('fullSync').optional().isBoolean().withMessage('Full sync must be boolean'),
  catchAsync(sbtController.syncWithBlockchain)
);

module.exports = router;
