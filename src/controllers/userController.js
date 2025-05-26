const { validationResult } = require('express-validator');
const User = require('../models/User');
const SBT = require('../models/SBT');
const Verification = require('../models/Verification');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

class UserController {
  // Get user profile
  async getProfile(req, res) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profile: user.profile,
            role: user.role,
            isVerified: user.isVerified,
            emailVerified: user.emailVerified,
            verificationStatus: user.verificationStatus,
            verificationScore: user.verificationScore,
            verificationChannels: user.verificationChannels,
            walletAddress: user.walletAddress,
            sbtTokenId: user.sbtTokenId,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      throw new AppError('Failed to get profile', 500);
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const user = req.user;
      const { profile } = req.body;

      // Update profile fields
      if (profile) {
        user.profile = { ...user.profile, ...profile };
      }

      await user.save();

      logger.info(`Profile updated for user: ${user.email}`, {
        userId: user._id
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            profile: user.profile
          }
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      throw new AppError('Failed to update profile', 500);
    }
  }

  // Get user preferences
  async getPreferences(req, res) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: {
          preferences: user.preferences
        }
      });
    } catch (error) {
      logger.error('Get preferences error:', error);
      throw new AppError('Failed to get preferences', 500);
    }
  }

  // Update user preferences
  async updatePreferences(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    try {
      const user = req.user;
      const { preferences } = req.body;

      // Update preferences
      user.preferences = { ...user.preferences, ...preferences };
      await user.save();

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          preferences: user.preferences
        }
      });
    } catch (error) {
      logger.error('Update preferences error:', error);
      throw new AppError('Failed to update preferences', 500);
    }
  }

  // Get verification status
  async getVerificationStatus(req, res) {
    try {
      const user = req.user;
      
      // Get recent verifications
      const recentVerifications = await Verification.findByUser(user._id).limit(10);

      res.json({
        success: true,
        data: {
          verificationStatus: user.verificationStatus,
          verificationScore: user.verificationScore,
          verificationChannels: user.verificationChannels,
          isVerified: user.isVerified,
          isFullyVerified: user.isFullyVerified,
          recentVerifications: recentVerifications.map(v => ({
            id: v._id,
            channel: v.channel,
            status: v.status,
            verificationScore: v.verificationScore,
            startedAt: v.startedAt,
            completedAt: v.completedAt
          }))
        }
      });
    } catch (error) {
      logger.error('Get verification status error:', error);
      throw new AppError('Failed to get verification status', 500);
    }
  }

  // Get SBT information
  async getSBTInfo(req, res) {
    try {
      const user = req.user;
      
      if (!user.sbtTokenId) {
        return res.json({
          success: true,
          data: {
            hasSBT: false,
            eligibleForMint: user.isFullyVerified,
            verificationScore: user.verificationScore
          }
        });
      }

      // Get SBT details
      const sbt = await SBT.findByTokenId(user.sbtTokenId);

      res.json({
        success: true,
        data: {
          hasSBT: true,
          sbt: sbt ? {
            tokenId: sbt.tokenId,
            walletAddress: sbt.walletAddress,
            metadata: sbt.metadata,
            status: sbt.status,
            mintedAt: sbt.createdAt,
            blockExplorerUrl: sbt.blockExplorerUrl,
            openseaUrl: sbt.openseaUrl
          } : null
        }
      });
    } catch (error) {
      logger.error('Get SBT info error:', error);
      throw new AppError('Failed to get SBT information', 500);
    }
  }

  // Get user activity
  async getActivity(req, res) {
    try {
      const user = req.user;
      
      // This is a placeholder - in a real implementation, you'd have an Activity model
      const activity = [
        {
          type: 'account_created',
          timestamp: user.createdAt,
          description: 'Account created'
        },
        {
          type: 'last_login',
          timestamp: user.lastLogin,
          description: 'Last login'
        }
      ];

      res.json({
        success: true,
        data: {
          activity
        }
      });
    } catch (error) {
      logger.error('Get activity error:', error);
      throw new AppError('Failed to get activity', 500);
    }
  }

  // Get public profile
  async getPublicProfile(req, res) {
    try {
      const { username } = req.params;
      
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if profile is public
      if (!user.preferences.privacy.profilePublic) {
        return res.status(403).json({
          success: false,
          message: 'Profile is private'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            username: user.username,
            profile: {
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              avatar: user.profile.avatar,
              bio: user.profile.bio
            },
            isVerified: user.isVerified,
            verificationScore: user.preferences.privacy.showVerificationBadges ? user.verificationScore : null,
            hasSBT: !!user.sbtTokenId,
            joinedAt: user.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Get public profile error:', error);
      throw new AppError('Failed to get public profile', 500);
    }
  }

  // Placeholder methods for other user functions
  async deleteAccount(req, res) {
    res.status(501).json({
      success: false,
      message: 'Delete account functionality not yet implemented'
    });
  }

  async uploadAvatar(req, res) {
    res.status(501).json({
      success: false,
      message: 'Upload avatar functionality not yet implemented'
    });
  }

  async deleteAvatar(req, res) {
    res.status(501).json({
      success: false,
      message: 'Delete avatar functionality not yet implemented'
    });
  }

  async getPublicSBT(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get public SBT functionality not yet implemented'
    });
  }

  // Admin functions
  async getAllUsers(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get all users functionality not yet implemented'
    });
  }

  async getUserById(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get user by ID functionality not yet implemented'
    });
  }

  async updateUserRole(req, res) {
    res.status(501).json({
      success: false,
      message: 'Update user role functionality not yet implemented'
    });
  }

  async updateUserStatus(req, res) {
    res.status(501).json({
      success: false,
      message: 'Update user status functionality not yet implemented'
    });
  }

  async manualVerifyUser(req, res) {
    res.status(501).json({
      success: false,
      message: 'Manual verify user functionality not yet implemented'
    });
  }

  async deleteUser(req, res) {
    res.status(501).json({
      success: false,
      message: 'Delete user functionality not yet implemented'
    });
  }

  async searchUsers(req, res) {
    res.status(501).json({
      success: false,
      message: 'Search users functionality not yet implemented'
    });
  }

  async getUserStats(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get user stats functionality not yet implemented'
    });
  }
}

module.exports = new UserController();
