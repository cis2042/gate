const { validationResult } = require('express-validator');
const User = require('../models/User');
const cryptoUtils = require('../utils/crypto');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

class AuthController {
  // 註冊新使用者
  async register(req, res) {
    // 檢查驗證錯誤
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '驗證失敗',
        errors: errors.array()
      });
    }

    const { username, email, password } = req.body;

    try {
      // 檢查使用者是否已存在
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.email === email ? '電子郵件已註冊' : '使用者名稱已被使用'
        });
      }

      // 創建新使用者
      const user = new User({
        username,
        email,
        password
      });

      await user.save();

      // 生成代幣
      const { accessToken, refreshToken } = user.generateAuthTokens();

      // 將刷新代幣添加到使用者
      user.refreshTokens.push({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 天
        device: req.get('User-Agent'),
        ip: req.ip
      });

      await user.save();

      logger.info(`新使用者註冊: ${user.email}`, {
        userId: user._id,
        username: user.username,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        message: '使用者註冊成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            emailVerified: user.emailVerified
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      throw new AppError('Registration failed', 500);
    }
  }

  // Login user
  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    try {
      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        logger.logSecurityEvent('Failed login attempt', {
          email,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = user.generateAuthTokens();

      // Add refresh token to user
      user.refreshTokens.push({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        device: req.get('User-Agent'),
        ip: req.ip
      });

      // Update login info
      user.lastLogin = new Date();
      user.loginCount += 1;

      await user.save();

      logger.info(`User logged in: ${user.email}`, {
        userId: user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            emailVerified: user.emailVerified,
            lastLogin: user.lastLogin
          },
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      throw new AppError('Login failed', 500);
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    try {
      // Verify refresh token
      const decoded = cryptoUtils.verifyRefreshToken(refreshToken);

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      const tokenData = user.refreshTokens.find(t => t.token === refreshToken);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired or invalid'
        });
      }

      // Generate new access token
      const payload = {
        userId: user._id,
        username: user.username,
        role: user.role
      };
      const newAccessToken = cryptoUtils.generateJWT(payload);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const user = req.user;

      if (refreshToken) {
        // Remove specific refresh token
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      } else {
        // Remove all refresh tokens for this device/IP
        user.refreshTokens = user.refreshTokens.filter(t =>
          t.ip !== req.ip || t.device !== req.get('User-Agent')
        );
      }

      await user.save();

      logger.info(`User logged out: ${user.email}`, {
        userId: user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw new AppError('Logout failed', 500);
    }
  }

  // Logout from all devices
  async logoutAll(req, res) {
    try {
      const user = req.user;
      user.refreshTokens = [];
      await user.save();

      logger.info(`User logged out from all devices: ${user.email}`, {
        userId: user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logged out from all devices'
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      throw new AppError('Logout failed', 500);
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = req.user;

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            emailVerified: user.emailVerified,
            verificationStatus: user.verificationStatus,
            verificationScore: user.verificationScore,
            walletAddress: user.walletAddress,
            sbtTokenId: user.sbtTokenId,
            profile: user.profile,
            preferences: user.preferences,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
          }
        }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      throw new AppError('Failed to get user data', 500);
    }
  }

  // Placeholder methods for other auth functions
  async forgotPassword(req, res) {
    // TODO: Implement forgot password functionality
    res.status(501).json({
      success: false,
      message: 'Forgot password functionality not yet implemented'
    });
  }

  async resetPassword(req, res) {
    // TODO: Implement reset password functionality
    res.status(501).json({
      success: false,
      message: 'Reset password functionality not yet implemented'
    });
  }

  async verifyEmail(req, res) {
    // TODO: Implement email verification functionality
    res.status(501).json({
      success: false,
      message: 'Email verification functionality not yet implemented'
    });
  }

  async resendVerification(req, res) {
    // TODO: Implement resend verification functionality
    res.status(501).json({
      success: false,
      message: 'Resend verification functionality not yet implemented'
    });
  }

  async changePassword(req, res) {
    // TODO: Implement change password functionality
    res.status(501).json({
      success: false,
      message: 'Change password functionality not yet implemented'
    });
  }

  async connectWallet(req, res) {
    // TODO: Implement wallet connection functionality
    res.status(501).json({
      success: false,
      message: 'Wallet connection functionality not yet implemented'
    });
  }

  async disconnectWallet(req, res) {
    // TODO: Implement wallet disconnection functionality
    res.status(501).json({
      success: false,
      message: 'Wallet disconnection functionality not yet implemented'
    });
  }

  async getActiveSessions(req, res) {
    // TODO: Implement get active sessions functionality
    res.status(501).json({
      success: false,
      message: 'Get active sessions functionality not yet implemented'
    });
  }

  async revokeSession(req, res) {
    // TODO: Implement revoke session functionality
    res.status(501).json({
      success: false,
      message: 'Revoke session functionality not yet implemented'
    });
  }

  async setup2FA(req, res) {
    // TODO: Implement 2FA setup functionality
    res.status(501).json({
      success: false,
      message: '2FA setup functionality not yet implemented'
    });
  }

  async verify2FA(req, res) {
    // TODO: Implement 2FA verification functionality
    res.status(501).json({
      success: false,
      message: '2FA verification functionality not yet implemented'
    });
  }

  async disable2FA(req, res) {
    // TODO: Implement 2FA disable functionality
    res.status(501).json({
      success: false,
      message: '2FA disable functionality not yet implemented'
    });
  }
}

module.exports = new AuthController();
