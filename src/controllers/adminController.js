const { validationResult } = require('express-validator');
const User = require('../models/User');
const Verification = require('../models/Verification');
const SBT = require('../models/SBT');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

class AdminController {
  // Get admin dashboard data
  async getDashboard(req, res) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // User statistics
      const totalUsers = await User.countDocuments();
      const newUsers24h = await User.countDocuments({ createdAt: { $gte: last24h } });
      const newUsers7d = await User.countDocuments({ createdAt: { $gte: last7d } });
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      const activeUsers = await User.countDocuments({ isActive: true });

      // Verification statistics
      const totalVerifications = await Verification.countDocuments();
      const pendingVerifications = await Verification.countDocuments({ status: 'pending' });
      const completedVerifications = await Verification.countDocuments({ status: 'completed' });
      const failedVerifications = await Verification.countDocuments({ status: 'failed' });

      // SBT statistics
      const totalSBTs = await SBT.countDocuments();
      const mintedSBTs = await SBT.countDocuments({ status: 'minted' });
      const pendingSBTs = await SBT.countDocuments({ status: 'pending' });

      // Recent activity
      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email createdAt isVerified');

      const recentVerifications = await Verification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'username email')
        .select('channel status createdAt userId');

      const dashboardData = {
        overview: {
          totalUsers,
          verifiedUsers,
          activeUsers,
          totalVerifications,
          totalSBTs
        },
        growth: {
          newUsers24h,
          newUsers7d,
          verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(1) : 0,
          sbtAdoptionRate: verifiedUsers > 0 ? (mintedSBTs / verifiedUsers * 100).toFixed(1) : 0
        },
        verifications: {
          total: totalVerifications,
          pending: pendingVerifications,
          completed: completedVerifications,
          failed: failedVerifications,
          successRate: totalVerifications > 0 ? (completedVerifications / totalVerifications * 100).toFixed(1) : 0
        },
        sbt: {
          total: totalSBTs,
          minted: mintedSBTs,
          pending: pendingSBTs
        },
        recentActivity: {
          users: recentUsers,
          verifications: recentVerifications
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Get dashboard error:', error);
      throw new AppError('Failed to get dashboard data', 500);
    }
  }

  // Get system statistics
  async getSystemStats(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // User statistics
      const userStats = await User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            verified: {
              $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Verification statistics
      const verificationStats = await Verification.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              channel: '$channel',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            channels: {
              $push: {
                channel: '$_id.channel',
                status: '$_id.status',
                count: '$count'
              }
            },
            totalCount: { $sum: '$count' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // SBT statistics
      const sbtStats = await SBT.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: timeframe === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            minted: { $sum: 1 },
            levels: {
              $push: '$metadata.verificationData.verificationLevel'
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: {
          timeframe,
          period: {
            start: startDate,
            end: now
          },
          users: userStats,
          verifications: verificationStats,
          sbt: sbtStats
        }
      });
    } catch (error) {
      logger.error('Get system stats error:', error);
      throw new AppError('Failed to get system statistics', 500);
    }
  }

  // Get users with filters
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        status,
        verified,
        search
      } = req.query;

      // Build filter query
      const filter = {};
      
      if (role) filter.role = role;
      if (status === 'active') filter.isActive = true;
      if (status === 'inactive') filter.isActive = false;
      if (verified !== undefined) filter.isVerified = verified === 'true';
      
      if (search) {
        filter.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .select('-password -refreshTokens')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      throw new AppError('Failed to get users', 500);
    }
  }

  // Get user details
  async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).select('-password -refreshTokens');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's verifications
      const verifications = await Verification.findByUser(id);
      
      // Get user's SBTs
      const sbts = await SBT.findByUser(id);

      res.json({
        success: true,
        data: {
          user,
          verifications,
          sbts,
          stats: {
            totalVerifications: verifications.length,
            completedVerifications: verifications.filter(v => v.status === 'completed').length,
            totalSBTs: sbts.length,
            activeSBTs: sbts.filter(s => s.isActive).length
          }
        }
      });
    } catch (error) {
      logger.error('Get user details error:', error);
      throw new AppError('Failed to get user details', 500);
    }
  }

  // Placeholder methods for other admin functions
  async getAnalytics(req, res) {
    res.status(501).json({
      success: false,
      message: 'Analytics functionality not yet implemented'
    });
  }

  async updateUser(req, res) {
    res.status(501).json({
      success: false,
      message: 'Update user functionality not yet implemented'
    });
  }

  async banUser(req, res) {
    res.status(501).json({
      success: false,
      message: 'Ban user functionality not yet implemented'
    });
  }

  async unbanUser(req, res) {
    res.status(501).json({
      success: false,
      message: 'Unban user functionality not yet implemented'
    });
  }

  async deleteUser(req, res) {
    res.status(501).json({
      success: false,
      message: 'Delete user functionality not yet implemented'
    });
  }

  async getVerifications(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get verifications functionality not yet implemented'
    });
  }

  async getVerificationDetails(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get verification details functionality not yet implemented'
    });
  }

  async reviewVerification(req, res) {
    res.status(501).json({
      success: false,
      message: 'Review verification functionality not yet implemented'
    });
  }

  async bulkReviewVerifications(req, res) {
    res.status(501).json({
      success: false,
      message: 'Bulk review verifications functionality not yet implemented'
    });
  }

  async getSBTs(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get SBTs functionality not yet implemented'
    });
  }

  async mintSBT(req, res) {
    res.status(501).json({
      success: false,
      message: 'Mint SBT functionality not yet implemented'
    });
  }

  async revokeSBT(req, res) {
    res.status(501).json({
      success: false,
      message: 'Revoke SBT functionality not yet implemented'
    });
  }

  async getSystemHealth(req, res) {
    res.status(501).json({
      success: false,
      message: 'System health functionality not yet implemented'
    });
  }

  async getSystemLogs(req, res) {
    res.status(501).json({
      success: false,
      message: 'System logs functionality not yet implemented'
    });
  }

  async toggleMaintenance(req, res) {
    res.status(501).json({
      success: false,
      message: 'Maintenance mode functionality not yet implemented'
    });
  }

  async createBackup(req, res) {
    res.status(501).json({
      success: false,
      message: 'Create backup functionality not yet implemented'
    });
  }

  async getConfiguration(req, res) {
    res.status(501).json({
      success: false,
      message: 'Get configuration functionality not yet implemented'
    });
  }

  async updateConfiguration(req, res) {
    res.status(501).json({
      success: false,
      message: 'Update configuration functionality not yet implemented'
    });
  }

  async getAuditLogs(req, res) {
    res.status(501).json({
      success: false,
      message: 'Audit logs functionality not yet implemented'
    });
  }

  async getSecurityEvents(req, res) {
    res.status(501).json({
      success: false,
      message: 'Security events functionality not yet implemented'
    });
  }

  async generateReport(req, res) {
    res.status(501).json({
      success: false,
      message: 'Generate report functionality not yet implemented'
    });
  }
}

module.exports = new AdminController();
