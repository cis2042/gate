const { validationResult } = require('express-validator');
const SBT = require('../models/SBT');
const User = require('../models/User');
const blockchainConfig = require('../config/blockchain');
const cryptoUtils = require('../utils/crypto');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

class SBTController {
  // Get token metadata (public)
  async getTokenMetadata(req, res) {
    try {
      const { tokenId } = req.params;
      
      const sbt = await SBT.findByTokenId(tokenId);
      if (!sbt) {
        return res.status(404).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Increment view count
      sbt.incrementView();
      await sbt.save();

      res.json({
        success: true,
        data: {
          tokenId: sbt.tokenId,
          metadata: sbt.metadata,
          contractAddress: sbt.contractAddress,
          network: sbt.network,
          chainId: sbt.chainId,
          status: sbt.status,
          mintedAt: sbt.createdAt,
          blockExplorerUrl: sbt.blockExplorerUrl,
          openseaUrl: sbt.openseaUrl
        }
      });
    } catch (error) {
      logger.error('Get token metadata error:', error);
      throw new AppError('Failed to get token metadata', 500);
    }
  }

  // Get contract information
  async getContractInfo(req, res) {
    try {
      const contractInfo = {
        contractAddress: process.env.CONTRACT_ADDRESS,
        network: process.env.BLOCKCHAIN_NETWORK,
        chainId: blockchainConfig.getProvider() ? await blockchainConfig.getProvider().getNetwork().then(n => n.chainId) : null,
        name: 'Twin3 SBT',
        symbol: 'T3SBT',
        description: 'Twin3 Soul Bound Token for verified users',
        totalSupply: await SBT.countDocuments({ status: 'minted' }),
        features: [
          'Soul Bound (Non-transferable)',
          'Verification-based minting',
          'Upgradeable metadata',
          'Revocable by admin'
        ]
      };

      res.json({
        success: true,
        data: contractInfo
      });
    } catch (error) {
      logger.error('Get contract info error:', error);
      throw new AppError('Failed to get contract information', 500);
    }
  }

  // Get public statistics
  async getPublicStats(req, res) {
    try {
      const stats = await SBT.getStats();
      const levelStats = await SBT.getVerificationLevelStats();

      res.json({
        success: true,
        data: {
          totalMinted: stats[0]?.totalMinted || 0,
          statusBreakdown: stats[0]?.statusBreakdown || [],
          verificationLevels: levelStats,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      logger.error('Get public stats error:', error);
      throw new AppError('Failed to get statistics', 500);
    }
  }

  // Mint SBT for verified user
  async mintSBT(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const { walletAddress, metadata } = req.body;
      const user = req.user;

      // Check if user is eligible for SBT
      if (!user.isFullyVerified) {
        return res.status(403).json({
          success: false,
          message: 'User must be fully verified to mint SBT'
        });
      }

      // Check if user already has an SBT
      if (user.sbtTokenId) {
        return res.status(409).json({
          success: false,
          message: 'User already has an SBT'
        });
      }

      // Check if wallet already has an SBT
      const existingSBT = await SBT.findOne({ 
        walletAddress: walletAddress.toLowerCase(),
        isActive: true 
      });

      if (existingSBT) {
        return res.status(409).json({
          success: false,
          message: 'Wallet already has an SBT'
        });
      }

      // Generate token ID
      const tokenId = await this.generateTokenId();

      // Create SBT metadata
      const sbtMetadata = this.createSBTMetadata(user, metadata);

      // Create SBT record (pending blockchain confirmation)
      const sbt = new SBT({
        tokenId,
        userId: user._id,
        walletAddress: walletAddress.toLowerCase(),
        contractAddress: process.env.CONTRACT_ADDRESS,
        network: process.env.BLOCKCHAIN_NETWORK || 'polygon',
        chainId: 80001, // Mumbai testnet
        mintTxHash: '0x' + '0'.repeat(64), // Placeholder until actual mint
        blockNumber: 0,
        blockTimestamp: new Date(),
        tokenURI: `${process.env.DEFAULT_SBT_METADATA_URI}${tokenId}`,
        metadata: sbtMetadata,
        status: 'pending',
        mintedBy: user._id
      });

      await sbt.save();

      // Update user with SBT token ID
      user.sbtTokenId = tokenId;
      user.sbtMintedAt = new Date();
      user.sbtMetadata = {
        tokenURI: sbt.tokenURI,
        attributes: sbtMetadata.attributes
      };

      await user.save();

      logger.info(`SBT minting initiated for user: ${user.email}`, {
        userId: user._id,
        tokenId,
        walletAddress
      });

      res.status(201).json({
        success: true,
        message: 'SBT minting initiated successfully',
        data: {
          tokenId: sbt.tokenId,
          status: sbt.status,
          metadata: sbt.metadata,
          tokenURI: sbt.tokenURI,
          estimatedConfirmationTime: '5-10 minutes'
        }
      });
    } catch (error) {
      logger.error('Mint SBT error:', error);
      throw new AppError('Failed to mint SBT', 500);
    }
  }

  // Get user's SBT tokens
  async getUserSBTs(req, res) {
    try {
      const { userId } = req.params;
      
      const sbts = await SBT.findByUser(userId);

      res.json({
        success: true,
        data: {
          sbts: sbts.map(sbt => ({
            tokenId: sbt.tokenId,
            walletAddress: sbt.walletAddress,
            metadata: sbt.metadata,
            status: sbt.status,
            mintedAt: sbt.createdAt,
            blockExplorerUrl: sbt.blockExplorerUrl,
            openseaUrl: sbt.openseaUrl
          }))
        }
      });
    } catch (error) {
      logger.error('Get user SBTs error:', error);
      throw new AppError('Failed to get user SBTs', 500);
    }
  }

  // Get current user's SBT tokens
  async getMyTokens(req, res) {
    try {
      const user = req.user;
      
      const sbts = await SBT.findByUser(user._id);

      res.json({
        success: true,
        data: {
          sbts: sbts.map(sbt => ({
            tokenId: sbt.tokenId,
            walletAddress: sbt.walletAddress,
            metadata: sbt.metadata,
            status: sbt.status,
            mintedAt: sbt.createdAt,
            blockExplorerUrl: sbt.blockExplorerUrl,
            openseaUrl: sbt.openseaUrl,
            viewCount: sbt.viewCount,
            lastViewed: sbt.lastViewed
          }))
        }
      });
    } catch (error) {
      logger.error('Get my tokens error:', error);
      throw new AppError('Failed to get tokens', 500);
    }
  }

  // Helper methods
  async generateTokenId() {
    let tokenId;
    let exists = true;
    
    while (exists) {
      tokenId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      exists = await SBT.findOne({ tokenId });
    }
    
    return tokenId;
  }

  createSBTMetadata(user, customMetadata = {}) {
    const verificationLevel = this.calculateVerificationLevel(user.verificationScore);
    
    const metadata = {
      name: `Twin3 SBT #${user.username}`,
      description: `Twin3 Soul Bound Token for verified user ${user.username}. This token represents verified human identity on the Twin3 platform.`,
      image: `https://api.twingate.com/images/sbt/${verificationLevel}.png`,
      external_url: `https://twingate.com/profile/${user.username}`,
      background_color: this.getBackgroundColor(verificationLevel),
      attributes: [
        {
          trait_type: 'Verification Level',
          value: verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)
        },
        {
          trait_type: 'Verification Score',
          value: user.verificationScore,
          display_type: 'number',
          max_value: 100
        },
        {
          trait_type: 'Verified Channels',
          value: user.verificationChannels.filter(c => c.verified).length,
          display_type: 'number'
        },
        {
          trait_type: 'Member Since',
          value: user.createdAt.getFullYear(),
          display_type: 'date'
        },
        {
          trait_type: 'Platform',
          value: 'Twin Gate'
        }
      ],
      verificationData: {
        verificationScore: user.verificationScore,
        verifiedChannels: user.verificationChannels.filter(c => c.verified).map(c => ({
          channel: c.channel,
          verifiedAt: c.verifiedAt,
          score: this.getChannelScore(c.channel)
        })),
        totalChannels: user.verificationChannels.filter(c => c.verified).length,
        verificationLevel,
        issuedAt: new Date(),
        version: '1.0'
      },
      ...customMetadata
    };

    return metadata;
  }

  calculateVerificationLevel(score) {
    if (score >= 90) return 'diamond';
    if (score >= 75) return 'platinum';
    if (score >= 60) return 'gold';
    if (score >= 40) return 'silver';
    return 'bronze';
  }

  getBackgroundColor(level) {
    const colors = {
      bronze: 'CD7F32',
      silver: 'C0C0C0',
      gold: 'FFD700',
      platinum: 'E5E4E2',
      diamond: 'B9F2FF'
    };
    return colors[level] || colors.bronze;
  }

  getChannelScore(channel) {
    const scores = {
      email: 10,
      phone: 15,
      twitter: 20,
      discord: 15,
      telegram: 15,
      github: 25,
      kyc: 30
    };
    return scores[channel] || 10;
  }

  // Placeholder methods for other SBT functions
  async getSBTDetails(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get SBT details functionality not yet implemented'
    });
  }

  async updateMetadata(req, res) {
    res.status(501).json({
      success: false,
      message: 'Update metadata functionality not yet implemented'
    });
  }

  async transferSBT(req, res) {
    res.status(501).json({
      success: false,
      message: 'Transfer SBT functionality not yet implemented'
    });
  }

  async recordView(req, res) {
    res.status(501).json({
      success: false,
      message: 'Record view functionality not yet implemented'
    });
  }

  async getVerificationProof(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get verification proof functionality not yet implemented'
    });
  }

  async verifyOwnership(req, res) {
    res.status(501).json({
      success: false,
      message: 'Verify ownership functionality not yet implemented'
    });
  }

  async getSBTsByWallet(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get SBTs by wallet functionality not yet implemented'
    });
  }

  async getHolderBenefits(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get holder benefits functionality not yet implemented'
    });
  }

  async claimReward(req, res) {
    res.status(501).json({
      success: false,
      message: 'Claim reward functionality not yet implemented'
    });
  }

  // Admin methods (placeholders)
  async getAllSBTs(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get all SBTs functionality not yet implemented'
    });
  }

  async adminMintSBT(req, res) {
    res.status(501).json({
      success: false,
      message: 'Admin mint SBT functionality not yet implemented'
    });
  }

  async revokeSBT(req, res) {
    res.status(501).json({
      success: false,
      message: 'Revoke SBT functionality not yet implemented'
    });
  }

  async updateSBTStatus(req, res) {
    res.status(501).json({
      success: false,
      message: 'Update SBT status functionality not yet implemented'
    });
  }

  async getDetailedStats(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get detailed stats functionality not yet implemented'
    });
  }

  async batchMintSBTs(req, res) {
    res.status(501).json({
      success: false,
      message: 'Batch mint SBTs functionality not yet implemented'
    });
  }

  async syncWithBlockchain(req, res) {
    res.status(501).json({
      success: false,
      message: 'Sync with blockchain functionality not yet implemented'
    });
  }
}

module.exports = new SBTController();
